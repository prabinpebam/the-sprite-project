#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [command, manifestArgument] = process.argv.slice(2);
if (command === '--self-test') {
  runSelfTest();
  process.exit(0);
}
if (!['lock', 'check'].includes(command) || !manifestArgument) {
  console.error('Usage: node stabilize-spec.mjs <lock|check> <spec-lock.json> | --self-test');
  process.exit(2);
}

const manifestPath = path.resolve(manifestArgument);
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`Spec stabilization failed: ${error.message}`);
  process.exit(1);
}

const errors = validateManifest(manifest, command);
if (errors.length) fail(errors);

const workspaceRoot = path.resolve(path.dirname(manifestPath), manifest.workspaceRoot);
validateFinalizationBindings(manifest, workspaceRoot, errors);
if (errors.length) fail(errors);
const computed = [];
for (const entry of manifest.entries) {
  const filePath = path.resolve(workspaceRoot, entry.path);
  if (!isInside(workspaceRoot, filePath)) {
    errors.push(`${entry.path}: resolves outside workspaceRoot`);
    continue;
  }
  if (!fs.existsSync(filePath)) {
    errors.push(`${entry.path}: file does not exist`);
    continue;
  }
  try {
    computed.push({ ...entry, sha256: hashEntry(filePath, entry.mode) });
  } catch (error) {
    errors.push(`${entry.path}: ${error.message}`);
  }
}
if (errors.length) fail(errors);
validateLineage(manifest, workspaceRoot, errors);
if (command === 'check') runConsistencyChecks(manifest, workspaceRoot, errors);
if (errors.length) fail(errors);

if (command === 'lock') {
  const lockedAt = manifest.lockedAt || new Date().toISOString();
  const reviewPath = path.resolve(workspaceRoot, manifest.finalization.reviewPath);
  const reviewEntry = computed.find((entry) => path.resolve(workspaceRoot, entry.path) === reviewPath);
  if (!reviewEntry || reviewEntry.mode !== 'review-contract') fail(['finalization.reviewPath must be protected with review-contract mode']);
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  review.stabilization.state = 'locked';
  review.stabilization.lockedAt = lockedAt;
  const finalManifest = { ...manifest, entries: computed, state: 'locked', lockedAt };
  const originalReview = fs.readFileSync(reviewPath);
  const originalManifest = fs.readFileSync(manifestPath);
  const generatedSnapshots = snapshotGeneratedOutputs(manifest, workspaceRoot, errors);
  if (errors.length) fail(errors);
  try {
    atomicJsonWrite(reviewPath, review);
    atomicJsonWrite(manifestPath, finalManifest);
    runGenerators(finalManifest, workspaceRoot, errors);
    runConsistencyChecks(finalManifest, workspaceRoot, errors);
    validateReviewFile(reviewPath, workspaceRoot, errors, true);
    if (hashEntry(reviewPath, 'review-contract') !== reviewEntry.sha256) errors.push('finalized review changed its protected review contract');
    if (errors.length) throw new Error(errors.join('\n- '));
  } catch (error) {
    fs.writeFileSync(reviewPath, originalReview);
    fs.writeFileSync(manifestPath, originalManifest);
    restoreGeneratedOutputs(generatedSnapshots);
    fail([`finalization rolled back: ${error.message}`]);
  }
  console.log(`Specification locked: ${manifest.lockId}, ${computed.length} protected entries.`);
  process.exit(0);
}

const drift = [];
for (let index = 0; index < computed.length; index += 1) {
  if (computed[index].sha256 !== manifest.entries[index].sha256) {
    drift.push(`${computed[index].path}: expected ${manifest.entries[index].sha256}, got ${computed[index].sha256}`);
  }
}
if (drift.length) {
  console.error(`Specification lock drift detected for ${manifest.lockId}:\n- ${drift.join('\n- ')}`);
  process.exit(1);
}

console.log(`Specification lock valid: ${manifest.lockId}, ${computed.length} protected entries.`);

function validateManifest(value, activeCommand) {
  const result = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['manifest must be a JSON object'];
  if (value.schemaVersion !== 2) result.push('active lock schemaVersion must be 2');
  for (const field of ['lockId', 'target', 'baselineReviewId', 'lockedBy', 'approvalEvidence', 'productVisionAlignment', 'workspaceRoot']) {
    if (typeof value[field] !== 'string' || !value[field].trim()) result.push(`${field} is required`);
  }
  if (!Array.isArray(value.settledDecisionIds) || value.settledDecisionIds.length === 0) result.push('settledDecisionIds must not be empty');
  if (!Array.isArray(value.allowedWithoutReopen) || value.allowedWithoutReopen.length === 0) result.push('allowedWithoutReopen must not be empty');
  if (!Array.isArray(value.reopenTriggers) || value.reopenTriggers.length === 0) result.push('reopenTriggers must not be empty');
  if (!Array.isArray(value.consistencyChecks) || value.consistencyChecks.length === 0) result.push('consistencyChecks must not be empty');
  if (!value.finalization || typeof value.finalization.reviewPath !== 'string' || !value.finalization.reviewPath.trim()) result.push('finalization.reviewPath is required');
  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    result.push('entries must not be empty');
    return result;
  }
  const seen = new Set();
  value.entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      result.push(`entries[${index}] must be an object`);
      return;
    }
    if (typeof entry.path !== 'string' || !entry.path.trim()) result.push(`entries[${index}].path is required`);
    if (!['bytes', 'traceability-contract', 'review-contract', 'html-contract'].includes(entry.mode)) result.push(`entries[${index}].mode is invalid`);
    if (seen.has(entry.path)) result.push(`duplicate protected path: ${entry.path}`);
    seen.add(entry.path);
    if (activeCommand === 'check' && !/^[0-9a-f]{64}$/.test(entry.sha256 || '')) {
      result.push(`${entry.path}: sha256 is required for check`);
    }
    if (activeCommand === 'lock' && entry.sha256) {
      result.push(`${entry.path}: lock only accepts unhashed candidate entries; use check for an existing lock`);
    }
  });
  if (activeCommand === 'lock' && !['candidate', 'reopened'].includes(value.state)) {
    result.push('lock requires state candidate or reopened');
  }
  if (activeCommand === 'check' && value.state !== 'locked') result.push('check requires state locked');
  return result;
}

function runConsistencyChecks(value, root, result) {
  for (const [index, check] of (value.consistencyChecks || []).entries()) {
    if (!check || check.type !== 'generated-files' || typeof check.script !== 'string' || !check.script.trim()) {
      result.push(`consistencyChecks[${index}] must define type=generated-files and script`);
      continue;
    }
    const scriptPath = path.resolve(root, check.script);
    if (!isInside(root, scriptPath) || !fs.existsSync(scriptPath)) {
      result.push(`consistencyChecks[${index}]: script is missing or outside workspaceRoot`);
      continue;
    }
    const checkResult = spawnSync(process.execPath, [scriptPath, '--check'], { cwd: root, encoding: 'utf8' });
    if (checkResult.status !== 0) {
      result.push(checkResult.stderr.trim() || checkResult.stdout.trim() || `consistencyChecks[${index}] failed`);
    }
  }
}

function hashEntry(filePath, mode) {
  if (mode === 'bytes') return sha256(fs.readFileSync(filePath));
  if (mode === 'html-contract') return sha256(Buffer.from(projectHtmlContract(fs.readFileSync(filePath, 'utf8')), 'utf8'));
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const projected = mode === 'traceability-contract' ? projectTraceabilityContract(value) : projectReviewContract(value);
  return sha256(Buffer.from(canonicalJson(projected), 'utf8'));
}

function projectTraceabilityContract(value, pathParts = []) {
  if (Array.isArray(value)) return value.map((item, index) => projectTraceabilityContract(item, [...pathParts, String(index)]));
  if (!value || typeof value !== 'object') return value;
  const projected = {};
  for (const key of Object.keys(value).sort()) {
    if (key === 'status' || key === 'runs' || key === 'issues') continue;
    if (key === 'evidence' && pathParts[0] === 'decisions') continue;
    projected[key] = projectTraceabilityContract(value[key], [...pathParts, key]);
  }
  return projected;
}

function projectReviewContract(value, pathParts = []) {
  if (Array.isArray(value)) return value.map((item, index) => projectReviewContract(item, [...pathParts, String(index)]));
  if (!value || typeof value !== 'object') return value;
  const projected = {};
  for (const key of Object.keys(value).sort()) {
    if (pathParts[0] === 'stabilization' && ['state', 'lockedAt'].includes(key)) continue;
    projected[key] = projectReviewContract(value[key], [...pathParts, key]);
  }
  return projected;
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function runSelfTest() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-lock-self-test-'));
  try {
    const tracePath = path.join(directory, 'traceability.json');
    const contractPath = path.join(directory, 'contract.md');
    const initialTrace = {
      update: { status: 'specified' },
      promises: [{ id: 'CP-TEST', status: 'specified', statement: 'Stable promise' }],
      decisions: [{ id: 'DEC-TEST', status: 'specified', decision: 'Stable decision', evidence: 'pending' }],
      runs: [],
      issues: [],
    };
    fs.writeFileSync(tracePath, JSON.stringify(initialTrace));
    fs.writeFileSync(contractPath, '# Stable contract\n');
    const traceHash = hashEntry(tracePath, 'traceability-contract');
    const contractHash = hashEntry(contractPath, 'bytes');
    const reviewCandidate = { verdict: 'ready', stabilization: { state: 'candidate', lockedAt: '' } };
    const reviewLocked = { verdict: 'ready', stabilization: { state: 'locked', lockedAt: '2026-01-01T00:00:00Z' } };
    if (canonicalJson(projectReviewContract(reviewCandidate)) !== canonicalJson(projectReviewContract(reviewLocked))) {
      throw new Error('review lifecycle finalization changed the review contract projection');
    }
    reviewLocked.verdict = 'not-ready';
    if (canonicalJson(projectReviewContract(reviewCandidate)) === canonicalJson(projectReviewContract(reviewLocked))) {
      throw new Error('review verdict drift did not change the review contract projection');
    }

    const htmlWeb = '<span class="slate-badge">web</span><span class="slate-badge slate-badge--status">specified</span>';
    const htmlVerified = '<span class="slate-badge">web</span><span class="slate-badge slate-badge--status">verified</span>';
    const htmlDesktop = '<span class="slate-badge">desktop</span><span class="slate-badge slate-badge--status">specified</span>';
    if (projectHtmlContract(htmlWeb) !== projectHtmlContract(htmlVerified)) throw new Error('HTML lifecycle status changed the HTML contract projection');
    if (projectHtmlContract(htmlWeb) === projectHtmlContract(htmlDesktop)) throw new Error('HTML host drift did not change the HTML contract projection');

    const evidenceProgress = structuredClone(initialTrace);
    evidenceProgress.update.status = 'implemented';
    evidenceProgress.promises[0].status = 'verified';
    evidenceProgress.decisions[0].evidence = 'RUN-001';
    evidenceProgress.runs.push({ id: 'RUN-001', status: 'verified' });
    evidenceProgress.issues.push({ id: 'ISSUE-001', status: 'closed' });
    fs.writeFileSync(tracePath, JSON.stringify(evidenceProgress));
    if (hashEntry(tracePath, 'traceability-contract') !== traceHash) {
      throw new Error('status, evidence, run, or issue progress changed the semantic contract hash');
    }

    evidenceProgress.promises[0].evidence = 'No evidence required';
    fs.writeFileSync(tracePath, JSON.stringify(evidenceProgress));
    if (hashEntry(tracePath, 'traceability-contract') === traceHash) {
      throw new Error('promise acceptance evidence drift did not change the semantic contract hash');
    }

    evidenceProgress.promises[0].evidence = undefined;
    evidenceProgress.promises[0].statement = 'Changed promise';
    fs.writeFileSync(tracePath, JSON.stringify(evidenceProgress));
    if (hashEntry(tracePath, 'traceability-contract') === traceHash) {
      throw new Error('promise drift did not change the semantic contract hash');
    }

    fs.writeFileSync(contractPath, '# Changed contract\n');
    if (hashEntry(contractPath, 'bytes') === contractHash) {
      throw new Error('byte contract drift was not detected');
    }
    console.log('Specification lock self-test passed.');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function fail(items) {
  console.error(`Spec stabilization failed with ${items.length} error(s):\n- ${items.join('\n- ')}`);
  process.exit(1);
}

function runGenerators(value, root, result) {
  for (const [index, check] of (value.consistencyChecks || []).entries()) {
    const scriptPath = path.resolve(root, check.script);
    const generation = spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });
    if (generation.status !== 0) result.push(generation.stderr.trim() || generation.stdout.trim() || `consistencyChecks[${index}] generation failed`);
  }
}

function validateLineage(value, root, result) {
  const match = /^(.*-)(\d{3})$/.exec(value.lockId || '');
  if (!match) {
    result.push('lockId must end in a three-digit monotonic suffix');
    return;
  }
  const suffix = Number(match[2]);
  if (suffix === 1 && !value.supersedesLockId && !value.priorLockManifest) return;
  if (typeof value.supersedesLockId !== 'string' || typeof value.priorLockManifest !== 'string' || typeof value.priorLockSha256 !== 'string') {
    result.push('successor locks require supersedesLockId, priorLockManifest, and priorLockSha256');
    return;
  }
  const priorPath = path.resolve(root, value.priorLockManifest);
  if (!isInside(root, priorPath) || !fs.existsSync(priorPath)) {
    result.push('priorLockManifest is missing or outside workspaceRoot');
    return;
  }
  const prior = JSON.parse(fs.readFileSync(priorPath, 'utf8'));
  const priorHash = sha256(fs.readFileSync(priorPath));
  const priorMatch = /^(.*-)(\d{3})$/.exec(prior.lockId || '');
  if (prior.lockId !== value.supersedesLockId) result.push('prior manifest lockId does not match supersedesLockId');
  if (priorHash !== value.priorLockSha256) result.push('prior manifest byte hash does not match priorLockSha256');
  if (![1, 2].includes(prior.schemaVersion)) result.push('prior manifest schemaVersion is unsupported');
  if (prior.target !== value.target || prior.state !== 'locked') result.push('prior manifest must be locked for the same target');
  if (!priorMatch || priorMatch[1] !== match[1] || Number(match[2]) !== Number(priorMatch[2]) + 1) result.push('successor lockId must increment the prior suffix by one');
}

function atomicJsonWrite(filePath, value) {
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}

function validateFinalizationBindings(value, root, result) {
  if (!value.finalization?.reviewPath) return;
  const reviewPath = path.resolve(root, value.finalization.reviewPath);
  if (!isInside(root, reviewPath) || !fs.existsSync(reviewPath)) {
    result.push('finalization review is missing or outside workspaceRoot');
    return;
  }
  validateReviewFile(reviewPath, root, result, true);
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  if (value.baselineReviewId !== review.reviewId) result.push('manifest baselineReviewId does not match reviewId');
  if (value.lockId !== review.stabilization?.lockId) result.push('manifest lockId does not match review stabilization');
  if (value.approvalRef !== review.stabilization?.approvalRef) result.push('manifest approvalRef does not match review stabilization');
  if (value.approvalId !== review.stabilization?.approvalId) result.push('manifest approvalId does not match review stabilization');
  if (value.lockedBy !== review.stabilization?.lockedBy) result.push('manifest lockedBy does not match review stabilization');
  if (JSON.stringify([...value.settledDecisionIds].sort()) !== JSON.stringify([...(review.stabilization?.settledDecisionIds || [])].sort())) result.push('manifest settled decisions do not match review stabilization');
  for (const change of review.stabilization?.justifiedChanges || []) {
    if (change.priorLockId !== value.supersedesLockId) result.push(`change ${change.id} priorLockId does not match supersedesLockId`);
  }
  const approvalPath = path.resolve(root, value.approvalRef || '');
  const traceabilityPath = path.resolve(root, value.target, 'traceability.json');
  if (!isInside(root, approvalPath) || !fs.existsSync(approvalPath)) {
    result.push('manifest approvalRef is missing or outside workspaceRoot');
    return;
  }
  const approval = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
  if (approval.schemaVersion !== 1 || approval.kind !== 'specification-lock-and-change-control') result.push('manifest approval schema or kind is invalid');
  if (approval.approvalId !== value.approvalId || approval.lockId !== value.lockId || approval.reviewId !== value.baselineReviewId) result.push('manifest approval identity does not match lock/review');
  if (approval.ownerRole !== value.lockedBy) result.push('manifest authority does not match approval ownerRole');
  if (!fs.existsSync(traceabilityPath)) {
    result.push('target traceability.json is missing');
    return;
  }
  const traceability = JSON.parse(fs.readFileSync(traceabilityPath, 'utf8'));
  const traceDecisionIds = new Set((traceability.decisions || []).map((decision) => decision.id));
  for (const decisionId of [...value.settledDecisionIds, ...(approval.lockedDecisionIds || []), ...(approval.approvedDecisionIds || [])]) {
    if (!traceDecisionIds.has(decisionId)) result.push(`approval or lock references unknown decision ${decisionId}`);
  }
}

function validateReviewFile(reviewPath, root, result, skipLockCheck) {
  const validatorPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'validate-review.mjs');
  const validation = spawnSync(process.execPath, [validatorPath, reviewPath], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SPEC_REVIEW_SKIP_LOCK_CHECK: skipLockCheck ? '1' : '0' },
  });
  if (validation.status !== 0) result.push(validation.stderr.trim() || validation.stdout.trim() || 'review validation failed');
}

function projectHtmlContract(value) {
  return value
    .replace(/<div class="slate-callout slate-callout--info" role="note"><p class="slate-callout__title">Specification locked · [^<]+<\/p><p>[^<]+<\/p><\/div>\r?\n?/g, '')
    .replace(/<span class="slate-badge slate-badge--status">[^<]*<\/span>/g, '<span class="slate-badge slate-badge--status">STATUS</span>')
    .replace(/Status: <strong>[^<]*<\/strong>/g, 'Status: <strong>STATUS</strong>')
    .replace(/\r\n/g, '\n');
}

function snapshotGeneratedOutputs(value, root, result) {
  const snapshots = [];
  for (const [index, check] of (value.consistencyChecks || []).entries()) {
    if (!Array.isArray(check.outputs) || check.outputs.length === 0) {
      result.push(`consistencyChecks[${index}].outputs must not be empty`);
      continue;
    }
    for (const relativePath of check.outputs) {
      const outputPath = path.resolve(root, relativePath);
      if (!isInside(root, outputPath)) {
        result.push(`consistencyChecks[${index}] output is outside workspaceRoot: ${relativePath}`);
        continue;
      }
      const existed = fs.existsSync(outputPath);
      snapshots.push({ path: outputPath, existed, bytes: existed ? fs.readFileSync(outputPath) : null });
    }
  }
  return snapshots;
}

function restoreGeneratedOutputs(snapshots) {
  for (const snapshot of snapshots) {
    if (snapshot.existed) fs.writeFileSync(snapshot.path, snapshot.bytes);
    else fs.rmSync(snapshot.path, { force: true });
  }
}