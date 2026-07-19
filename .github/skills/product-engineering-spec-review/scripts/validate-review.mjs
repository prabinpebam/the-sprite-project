#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CORE_DIMENSIONS = [
  'product-truth',
  'scope-alternatives',
  'architecture',
  'data-failure',
  'quality-attributes',
  'verification-release',
  'implementation-readiness',
];

const SPECIALIST_DIMENSIONS = [
  'ux-accessibility',
  'developer-experience',
  'security-privacy',
  'reliability-operability',
  'performance-capacity',
  'migration-compatibility',
  'deployment-distribution',
];

const VALID_DEPTHS = new Set(['quick', 'standard', 'deep']);
const VALID_VERDICTS = new Set(['ready', 'ready-with-conditions', 'not-ready']);
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_DISPOSITIONS = new Set(['open', 'fixed', 'accepted-risk', 'deferred', 'rejected']);
const VALID_STABILIZATION_STATES = new Set(['open', 'candidate', 'locked', 'reopened', 'superseded']);
const VALID_CHANGE_TRIGGERS = new Set(['contract-defect', 'new-evidence', 'changed-constraint', 'measured-improvement']);
const VALID_CHANGE_DECISIONS = new Set(['pending', 'approved', 'rejected', 'deferred']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateReview(review) {
  const errors = [];
  const requireArray = (key) => {
    if (!Array.isArray(review[key])) errors.push(`${key} must be an array`);
  };

  if (!isObject(review)) return ['review must be a JSON object'];
  if (review.schemaVersion !== 2) errors.push('schemaVersion must be 2');
  if (!hasText(review.reviewId)) errors.push('reviewId is required');
  if (!hasText(review.target)) errors.push('target is required');
  if (!hasText(review.reviewedAt) || Number.isNaN(Date.parse(review.reviewedAt))) {
    errors.push('reviewedAt must be a valid date');
  }
  if (!VALID_DEPTHS.has(review.depth)) errors.push('depth must be quick, standard, or deep');
  if (!VALID_VERDICTS.has(review.verdict)) errors.push('verdict is invalid');

  ['materialitySignals', 'sources', 'dimensions', 'findings', 'unresolvedDecisions', 'editsMade', 'conditions'].forEach(requireArray);

  const dimensions = Array.isArray(review.dimensions) ? review.dimensions : [];
  const dimensionIds = new Set();
  for (const dimension of dimensions) {
    if (!isObject(dimension) || !hasText(dimension.id)) {
      errors.push('every dimension requires an id');
      continue;
    }
    if (dimensionIds.has(dimension.id)) errors.push(`duplicate dimension: ${dimension.id}`);
    dimensionIds.add(dimension.id);
    if (![...CORE_DIMENSIONS, ...SPECIALIST_DIMENSIONS].includes(dimension.id)) {
      errors.push(`unknown dimension: ${dimension.id}`);
    }
    if (typeof dimension.applicable !== 'boolean') {
      errors.push(`${dimension.id}.applicable must be boolean`);
    } else if (dimension.applicable) {
      if (!Number.isInteger(dimension.score) || dimension.score < 0 || dimension.score > 10) {
        errors.push(`${dimension.id}.score must be an integer from 0 to 10`);
      }
      if (!hasText(dimension.definitionOf10)) errors.push(`${dimension.id}.definitionOf10 is required`);
      if (!Array.isArray(dimension.evidence)) errors.push(`${dimension.id}.evidence must be an array`);
      if (!Array.isArray(dimension.findingIds)) errors.push(`${dimension.id}.findingIds must be an array`);
    } else if (!hasText(dimension.notApplicableReason)) {
      errors.push(`${dimension.id}.notApplicableReason is required when not applicable`);
    }
  }

  for (const id of CORE_DIMENSIONS) {
    if (!dimensionIds.has(id)) errors.push(`missing core dimension: ${id}`);
  }

  const findings = Array.isArray(review.findings) ? review.findings : [];
  const findingIds = new Set();
  for (const finding of findings) {
    if (!isObject(finding) || !hasText(finding.id)) {
      errors.push('every finding requires an id');
      continue;
    }
    if (findingIds.has(finding.id)) errors.push(`duplicate finding: ${finding.id}`);
    findingIds.add(finding.id);
    if (!dimensionIds.has(finding.dimension)) errors.push(`${finding.id}.dimension is missing or unknown`);
    if (!VALID_SEVERITIES.has(finding.severity)) errors.push(`${finding.id}.severity is invalid`);
    if (!Number.isInteger(finding.confidence) || finding.confidence < 1 || finding.confidence > 10) {
      errors.push(`${finding.id}.confidence must be an integer from 1 to 10`);
    }
    if (!VALID_DISPOSITIONS.has(finding.disposition)) errors.push(`${finding.id}.disposition is invalid`);
    for (const key of ['title', 'problem', 'impact', 'remediation', 'verification']) {
      if (!hasText(finding[key])) errors.push(`${finding.id}.${key} is required`);
    }
    if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
      errors.push(`${finding.id}.evidence must contain at least one reference`);
    } else {
      finding.evidence.forEach((evidence, index) => {
        if (!isObject(evidence) || !hasText(evidence.source) || !hasText(evidence.claim)) {
          errors.push(`${finding.id}.evidence[${index}] requires source and claim`);
        }
      });
    }
    if (['accepted-risk', 'deferred'].includes(finding.disposition) && (!hasText(finding.owner) || !hasText(finding.dueStage))) {
      errors.push(`${finding.id} requires owner and dueStage for ${finding.disposition}`);
    }
  }

  for (const dimension of dimensions) {
    if (!Array.isArray(dimension.findingIds)) continue;
    for (const findingId of dimension.findingIds) {
      if (!findingIds.has(findingId)) errors.push(`${dimension.id} references unknown finding ${findingId}`);
    }
  }

  if (!isObject(review.implementationReadiness)) {
    errors.push('implementationReadiness must be an object');
  } else {
    const readiness = review.implementationReadiness;
    if (typeof readiness.unfamiliarImplementerPass !== 'boolean') {
      errors.push('implementationReadiness.unfamiliarImplementerPass must be boolean');
    }
    ['blockingFindingIds', 'implementationSequence', 'verificationGates'].forEach((key) => {
      if (!Array.isArray(readiness[key])) errors.push(`implementationReadiness.${key} must be an array`);
    });
    if (Array.isArray(readiness.blockingFindingIds)) {
      readiness.blockingFindingIds.forEach((id) => {
        if (!findingIds.has(id)) errors.push(`blockingFindingIds references unknown finding ${id}`);
      });
    }
  }

  if (!isObject(review.adversarialReview)) {
    errors.push('adversarialReview must be an object');
  } else {
    const adversarial = review.adversarialReview;
    if (!Number.isInteger(adversarial.maxRounds) || adversarial.maxRounds < 0 || adversarial.maxRounds > 3) {
      errors.push('adversarialReview.maxRounds must be an integer from 0 to 3');
    }
    if (!Array.isArray(adversarial.rounds)) errors.push('adversarialReview.rounds must be an array');
    if (!Array.isArray(adversarial.remainingConcerns)) errors.push('adversarialReview.remainingConcerns must be an array');
    if (review.depth === 'deep' && adversarial.maxRounds < 1) errors.push('deep reviews require adversarial review');
    if (review.depth === 'standard' && adversarial.maxRounds < 1) errors.push('standard reviews require one adversarial round');
  }

  if (!isObject(review.stabilization)) {
    errors.push('stabilization must be an object');
  } else {
    const stabilization = review.stabilization;
    if (!VALID_STABILIZATION_STATES.has(stabilization.state)) errors.push('stabilization.state is invalid');
    if (!Array.isArray(stabilization.settledDecisionIds)) errors.push('stabilization.settledDecisionIds must be an array');
    if (!Array.isArray(stabilization.justifiedChanges)) errors.push('stabilization.justifiedChanges must be an array');
    if (hasText(stabilization.approvalRef) && fs.existsSync(path.resolve(stabilization.approvalRef))) {
      try {
        const lockApproval = JSON.parse(fs.readFileSync(path.resolve(stabilization.approvalRef), 'utf8'));
        if (lockApproval.approvalId !== stabilization.approvalId) errors.push('stabilization approvalId does not match approvalRef');
        if (lockApproval.lockId !== stabilization.lockId) errors.push('stabilization lockId does not match approvalRef');
        if (lockApproval.reviewId !== review.reviewId) errors.push('stabilization reviewId does not match approvalRef');
        if (lockApproval.ownerRole !== stabilization.lockedBy) errors.push('stabilization lockedBy does not match approvalRef');
        validateExactUniqueSet(lockApproval.lockedDecisionIds, stabilization.settledDecisionIds, 'stabilization lockedDecisionIds', errors);
      } catch (error) {
        errors.push(`stabilization.approvalRef is not valid JSON: ${error.message}`);
      }
    }
    if (stabilization.state === 'locked') {
      for (const key of ['lockId', 'lockedAt', 'lockedBy', 'lockManifest', 'approvalRef', 'approvalId', 'productVisionAlignment']) {
        if (!hasText(stabilization[key])) errors.push(`stabilization.${key} is required when locked`);
      }
      if (stabilization.decisionOwnerApproval !== true) errors.push('locked stabilization requires decisionOwnerApproval=true');
      if (hasText(stabilization.lockManifest) && !fs.existsSync(path.resolve(stabilization.lockManifest))) {
        errors.push(`stabilization.lockManifest does not exist: ${stabilization.lockManifest}`);
      } else if (hasText(stabilization.lockManifest) && process.env.SPEC_REVIEW_SKIP_LOCK_CHECK !== '1') {
        const stabilizationScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stabilize-spec.mjs');
        const lockResult = spawnSync(process.execPath, [stabilizationScript, 'check', path.resolve(stabilization.lockManifest)], { encoding: 'utf8' });
        if (lockResult.status !== 0) {
          errors.push(lockResult.stderr.trim() || lockResult.stdout.trim() || 'specification lock check failed');
        }
      }
      if (!Array.isArray(stabilization.settledDecisionIds) || stabilization.settledDecisionIds.length === 0) {
        errors.push('locked stabilization requires settledDecisionIds');
      }
      if (hasText(stabilization.approvalRef) && !fs.existsSync(path.resolve(stabilization.approvalRef))) {
        errors.push(`stabilization.approvalRef does not exist: ${stabilization.approvalRef}`);
      }
    }
    if (Array.isArray(stabilization.justifiedChanges)) {
      stabilization.justifiedChanges.forEach((change, index) => {
        if (!isObject(change)) {
          errors.push(`stabilization.justifiedChanges[${index}] must be an object`);
          return;
        }
        for (const key of ['id', 'priorLockId', 'newEvidence', 'lockedSurface', 'noChangeConsequence', 'productAlignment', 'expectedBenefit', 'fullChangeCost', 'blastRadius', 'reversibility', 'recommendation', 'authority', 'decision']) {
          if (!hasText(change[key])) errors.push(`stabilization.justifiedChanges[${index}].${key} is required`);
        }
        if (!VALID_CHANGE_TRIGGERS.has(change.triggerClass)) errors.push(`stabilization.justifiedChanges[${index}].triggerClass is invalid`);
        if (!VALID_CHANGE_DECISIONS.has(change.decision)) errors.push(`stabilization.justifiedChanges[${index}].decision is invalid`);
        if (!Number.isInteger(change.confidence) || change.confidence < 7 || change.confidence > 10) {
          errors.push(`stabilization.justifiedChanges[${index}].confidence must be an integer from 7 to 10`);
        }
        if (!Array.isArray(change.options) || change.options.length < 2 || !change.options.some((option) => /keep|no change|unchanged/i.test(option))) {
          errors.push(`stabilization.justifiedChanges[${index}].options must include no change and a bounded alternative`);
        }
        if (!Array.isArray(change.evidenceRefs) || change.evidenceRefs.length === 0) {
          errors.push(`stabilization.justifiedChanges[${index}].evidenceRefs must not be empty`);
        } else {
          change.evidenceRefs.forEach((reference) => {
            if (!hasText(reference) || !fs.existsSync(path.resolve(reference))) {
              errors.push(`stabilization.justifiedChanges[${index}] evidence does not exist: ${reference}`);
            }
          });
        }
        if (change.decision === 'approved') {
          if (!hasText(change.approvalRef) || !fs.existsSync(path.resolve(change.approvalRef))) {
            errors.push(`stabilization.justifiedChanges[${index}] approved change requires an existing approvalRef`);
          }
          if (!Array.isArray(change.revalidationPlan) || change.revalidationPlan.length === 0) {
            errors.push(`stabilization.justifiedChanges[${index}] approved change requires a revalidationPlan`);
          }
          if (hasText(change.approvalRef) && fs.existsSync(path.resolve(change.approvalRef))) {
            try {
              const approval = JSON.parse(fs.readFileSync(path.resolve(change.approvalRef), 'utf8'));
              if (approval.schemaVersion !== 1 || approval.kind !== 'specification-lock-and-change-control') errors.push(`stabilization.justifiedChanges[${index}] approval schema or kind is invalid`);
              if (approval.approvalId !== stabilization.approvalId) errors.push(`stabilization.justifiedChanges[${index}] approvalId mismatch`);
              if (approval.lockId !== stabilization.lockId) errors.push(`stabilization.justifiedChanges[${index}] approval lockId mismatch`);
              if (approval.reviewId !== review.reviewId) errors.push(`stabilization.justifiedChanges[${index}] approval reviewId mismatch`);
              if (!hasText(approval.approvedAt) || Number.isNaN(Date.parse(approval.approvedAt))) errors.push(`stabilization.justifiedChanges[${index}] approval date is invalid`);
              if (approval.ownerRole !== change.authority) errors.push(`stabilization.justifiedChanges[${index}] approval authority mismatch`);
              if (!Array.isArray(change.affectedDecisionIds) || change.affectedDecisionIds.length === 0) errors.push(`stabilization.justifiedChanges[${index}].affectedDecisionIds must not be empty`);
              const expectedChangeIds = stabilization.justifiedChanges.filter((item) => item.decision === 'approved').map((item) => item.id);
              const expectedDecisionIds = [...new Set(stabilization.justifiedChanges.filter((item) => item.decision === 'approved').flatMap((item) => item.affectedDecisionIds || []))];
              validateExactUniqueSet(approval.approvedChangeIds, expectedChangeIds, `stabilization.justifiedChanges[${index}] approvedChangeIds`, errors);
              validateExactUniqueSet(approval.approvedDecisionIds, expectedDecisionIds, `stabilization.justifiedChanges[${index}] approvedDecisionIds`, errors);
            } catch (error) {
              errors.push(`stabilization.justifiedChanges[${index}] approvalRef is not valid JSON: ${error.message}`);
            }
          }
        }
      });
    }
  }

  const openBlockers = findings.filter((finding) =>
    ['critical', 'high'].includes(finding.severity) && finding.disposition === 'open');
  const applicableBelowEight = dimensions.filter((dimension) => dimension.applicable && dimension.score < 8);
  const unresolved = Array.isArray(review.unresolvedDecisions) ? review.unresolvedDecisions : [];
  const passesFreshReader = review.implementationReadiness?.unfamiliarImplementerPass === true;

  if (review.verdict === 'ready') {
    if (openBlockers.length) errors.push('ready verdict cannot have open critical/high findings');
    if (applicableBelowEight.length) errors.push('ready verdict requires every applicable dimension to score at least 8');
    if (unresolved.length) errors.push('ready verdict cannot have unresolved decisions');
    if (!passesFreshReader) errors.push('ready verdict requires unfamiliarImplementerPass');
    if (Array.isArray(review.conditions) && review.conditions.length) errors.push('ready verdict cannot have conditions');
    if (!['candidate', 'locked'].includes(review.stabilization?.state)) errors.push('ready verdict requires candidate or locked stabilization');
  }

  if (review.verdict === 'ready-with-conditions') {
    if (openBlockers.length) errors.push('ready-with-conditions cannot have open critical/high findings');
    if (!Array.isArray(review.conditions) || review.conditions.length === 0) {
      errors.push('ready-with-conditions requires at least one condition');
    } else {
      review.conditions.forEach((condition, index) => {
        if (!isObject(condition) || !hasText(condition.condition) || !hasText(condition.owner) || !hasText(condition.verification)) {
          errors.push(`conditions[${index}] requires condition, owner, and verification`);
        }
      });
    }
  }

  if (review.verdict !== 'not-ready' && unresolved.length) {
    errors.push(`${review.verdict} verdict cannot have unresolved decisions`);
  }

  return errors;
}

function validateExactUniqueSet(actual, expected, label, errors) {
  if (!Array.isArray(actual)) {
    errors.push(`${label} must be an array`);
    return;
  }
  if (new Set(actual).size !== actual.length) errors.push(`${label} must contain unique IDs`);
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) errors.push(`${label} must exactly match the approved review set`);
}

function makeSelfTestReview() {
  return {
    schemaVersion: 2,
    reviewId: 'SELF-TEST',
    target: 'self-test',
    reviewedAt: '2026-01-01',
    depth: 'standard',
    verdict: 'ready',
    materialitySignals: ['self-test'],
    sources: ['self-test'],
    dimensions: [...CORE_DIMENSIONS, ...SPECIALIST_DIMENSIONS].map((id) => ({
      id,
      applicable: CORE_DIMENSIONS.includes(id),
      ...(CORE_DIMENSIONS.includes(id)
        ? { score: 8, definitionOf10: `Complete ${id}`, evidence: ['self-test'], findingIds: [] }
        : { notApplicableReason: 'Not part of the self-test target' }),
    })),
    findings: [],
    unresolvedDecisions: [],
    editsMade: [],
    implementationReadiness: {
      unfamiliarImplementerPass: true,
      blockingFindingIds: [],
      implementationSequence: ['self-test'],
      verificationGates: ['self-test'],
    },
    conditions: [],
    adversarialReview: { maxRounds: 1, rounds: [], remainingConcerns: [] },
    stabilization: {
      state: 'candidate',
      settledDecisionIds: [],
      justifiedChanges: [],
    },
  };
}

function validateSkillLinks() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillDir = path.resolve(scriptDir, '..');
  const skillPath = path.join(skillDir, 'SKILL.md');
  const errors = [];
  const content = fs.readFileSync(skillPath, 'utf8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return ['SKILL.md frontmatter is missing'];
  if (!/^name:\s*product-engineering-spec-review\s*$/m.test(frontmatterMatch[1])) {
    errors.push('SKILL.md name must match the folder name');
  }
  if (!/^description:\s*.+$/m.test(frontmatterMatch[1])) errors.push('SKILL.md description is required');
  for (const match of content.matchAll(/\]\((\.\/[^)]+)\)/g)) {
    const target = path.resolve(skillDir, match[1]);
    if (!fs.existsSync(target)) errors.push(`broken SKILL.md link: ${match[1]}`);
  }
  return errors;
}

const argument = process.argv[2];
let errors;

if (argument === '--self-test') {
  errors = [...validateReview(makeSelfTestReview()), ...validateSkillLinks()];
} else if (!argument) {
  console.error('Usage: node validate-review.mjs <spec-review.json> | --self-test');
  process.exit(2);
} else {
  const reviewPath = path.resolve(argument);
  let review;
  try {
    review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  } catch (error) {
    console.error(`Review validation failed: ${error.message}`);
    process.exit(1);
  }
  errors = validateReview(review);
}

if (errors.length) {
  console.error(`Review validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(argument === '--self-test' ? 'Review skill self-test passed.' : `Review validation passed: ${argument}`);