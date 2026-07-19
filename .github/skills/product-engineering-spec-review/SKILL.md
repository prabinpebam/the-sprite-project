---
name: product-engineering-spec-review
description: 'Use when: reviewing, auditing, hardening, or completing a product, UX, engineering, architecture, implementation, migration, platform, or release specification before coding. Grounds findings in the real repository, selects review depth by materiality, checks product truth, scope, alternatives, user journeys, architecture, data and failure paths, security, accessibility, reliability, performance, operability, testing, rollout, and unfamiliar-implementer readiness. Produces evidence-backed findings, direct spec improvements, a readiness verdict, and an independently challenged review record.'
argument-hint: 'Point to the specification, update, plan, RFC, PRD, or delivery directory to review'
---

# Product and Engineering Specification Review

Review a specification as an executable product and engineering contract. The output is an improved specification and an evidence-backed readiness record, not a detached scorecard.

## Core Principles

1. Review the right problem before perfecting its solution.
2. Inspect the repository before judging the specification. Current behavior, existing abstractions, tests, prior decisions, and verified evidence are part of the contract.
3. Scale rigor by materiality. A small clarification must not inherit the ceremony of a platform migration.
4. Separate applicability from quality. A lens may be not applicable; an applicable lens may not be silently skipped.
5. Define what 10/10 means for this target before assigning a score. Scores without target-specific criteria are decoration.
6. Every promoted finding needs repository or specification evidence, severity, confidence, impact, remediation, and a verification method.
7. Distinguish product decisions from defects. Do not silently change scope, risk acceptance, or irreversible choices.
8. Name failure modes. "Handle errors," "support migration," and "test thoroughly" are not implementation instructions.
9. Preserve verified baselines and settled decisions. Amend or supersede them explicitly.
10. A fresh implementer must be able to execute the result without inventing product behavior or architecture.
11. Convergence is a feature. Once a ready specification is locked, novelty is not improvement and another plausible alternative is not a finding.
12. The burden of proof is on change. Reopen locked content only from material new evidence, a changed requirement or constraint, a demonstrated defect or risk, or measured value that outweighs the full change cost.

## Workflow

### 1. Establish the Review Target

Identify the exact specification and its authority:

- target file or directory
- audience and decision owner
- current lifecycle state
- authoritative product, architecture, design, and evidence sources
- immutable baselines or prior accepted decisions
- requested outcome: report only, improve in place, or both

If the target is ambiguous and choosing the wrong document would invalidate the review, ask one bounded question. Otherwise infer the most authoritative target and state the inference.

### 2. Check Stabilization State

Read [stabilization and justified change](./references/stabilization-and-change-control.md) before reviewing or editing a target that may have prior approval.

1. Locate `spec-lock.json`, locked decision records, accepted ADRs, verified baselines, and the latest passing review.
2. If a lock manifest exists, run:

```bash
node .github/skills/product-engineering-spec-review/scripts/stabilize-spec.mjs check <path-to-spec-lock.json>
```

3. If the lock is clean, review only the requested delta and its dependencies. Do not reopen settled content merely because another implementation is possible.
4. If drift exists, do not normalize or overwrite it. Identify changed locked surfaces and require a justified-change record or restore the locked content.
5. Classify each proposed change as `contract-defect`, `new-evidence`, `changed-constraint`, `measured-improvement`, or `alternative-only`. Reject `alternative-only` changes.
6. Require decision-owner approval before changing locked scope, behavior, architecture, data, risk acceptance, compatibility, quality thresholds, or release gates.

Use [the justified-change template](./assets/justified-change.template.json) so evidence, no-change consequence, product alignment, full cost, blast radius, revalidation, and authority remain explicit.

The stability gate precedes review depth selection. A locked deep spec normally receives a quick delta review, not another full review.

### 3. Select Depth and Applicable Lenses

Read [applicability and depth](./references/applicability-and-depth.md). Record:

- materiality signals
- `quick`, `standard`, or `deep` depth
- mandatory core lenses
- triggered specialist lenses
- explicit reasons for every not-applicable lens

Depth controls evidence breadth and adversarial intensity, not whether obvious blockers are reported.

### 4. Run a Grounded System Audit

Start from the nearest owning code, existing test, decision record, and verified behavior. Gather only evidence that can change a review conclusion:

- current implementation and data contracts
- existing components or flows the plan should reuse
- relevant tests and evidence artifacts
- current dependencies and supported environments
- prior ADRs, update records, exclusions, and rollback baselines
- known TODOs or issues that block or contradict the target

Classify each assertion as `observed`, `specified`, `inferred`, `external-standard`, or `unknown`. Never present inferred behavior as current fact.

### 5. Review Product Truth and Scope

Use [product and UX review](./references/product-ux-review.md).

At minimum answer:

- Who experiences the problem, in what context, and why now?
- What observable outcome is promised?
- What happens if nothing changes?
- Is the plan solving the user problem or a proxy?
- What already exists and should be reused?
- What is explicitly in, out, deferred, and rejected?
- What are the minimal viable, recommended, and long-term approaches?
- Does the chosen approach move toward the stated north star without front-loading unrelated work?

Do not add or remove material scope without decision-owner approval. You may repair omissions required to make an already accepted promise coherent.

### 6. Review Experience and Developer Experience When Applicable

For user-facing scope, review the complete journey, information architecture, interaction states, responsive behavior, accessibility, content, and design-system fit. For developer-facing products, additionally review discovery, installation, first value, real integration, debugging, upgrade, and migration.

Specify what the person sees and can do in loading, empty, partial, success, error, stale, conflict, cancellation, and recovery states. A backend response alone is not a UX specification.

### 7. Review Engineering and Architecture

Use [engineering and architecture review](./references/engineering-architecture-review.md).

Require concrete component boundaries, contracts, data ownership, state transitions, trust boundaries, deployment topology, and dependency direction. Trace every material flow through happy, empty, invalid, duplicate, stale, interrupted, partial-write, upstream-error, and recovery paths.

For each architecturally significant choice, capture context, considered alternatives, decision criteria, chosen direction, status, and positive, negative, and neutral consequences.

### 8. Review Risk, Quality Attributes, and Release

Use [security, reliability, and quality review](./references/security-reliability-review.md).

Translate vague qualities into measurable scenarios with source, stimulus, environment, affected artifact, response, and response measure. Trigger specialist review for security/privacy, data migration, compatibility, performance, reliability, operability, deployment, or distribution when the applicability gate says so.

Every material threat or failure mode needs a response: mitigate, eliminate, transfer, accept, or explicitly defer with owner and consequence. Every mitigation needs a verification method.

### 9. Review Testing and Evidence

Map each promise, flow, branch, state transition, failure path, compatibility claim, and quality scenario to the cheapest evidence that can prove it:

- static/schema validation
- unit or property tests
- integration or contract tests
- migration and adversarial fixtures
- performance or resource tests
- actual-UI and accessibility tests
- packaged-host, offline, deployment, rollback, or downstream-consumer checks

Tests must verify semantic differences and visible behavior, not only types, DOM presence, or artifact existence. Preserve agenda-free capture separately from evaluation where the repository uses an evidence framework.

### 10. Convert Findings into Direct Improvements

Use [readiness, findings, and adversarial review](./references/readiness-and-adversarial.md).

Prefer editing the canonical specification over creating prose that an implementer must manually merge. For each finding:

- cite the evidence
- explain the user or system consequence
- state the exact repair
- name files or contracts affected where evidence supports them
- add an objective verification method
- update dependent sections so the document remains internally consistent

Do not overfit file names or APIs that cannot yet be known. Resolve design decisions; leave routine implementation choices to the owning abstraction and repository conventions.

For locked targets, do not edit until the change passes the stabilization gate. The finding must cite the lock item it reopens, the new evidence, the no-change consequence, full change cost, product-vision alignment, revalidation surface, and approval authority.

### 11. Run the Unfamiliar-Implementer Gate

Test the improved specification from a fresh context:

1. Predict the questions a competent implementer would ask.
2. Give the document and repository target to an independent reviewer with no brainstorming history.
3. Ask it to identify ambiguities, contradictions, missing dependencies, untestable criteria, hidden design decisions, and infeasible sequencing.
4. Repair valid issues and repeat, up to three rounds.
5. Stop if the same concern repeats twice; record it as an unresolved concern rather than looping.

Deep reviews require this gate. Standard reviews use one round. Quick reviews use it only when a blocker, high-risk decision, or unclear acceptance criterion remains.

When the specification already has a passing unfamiliar-implementer review and a clean lock, an independent reviewer receives only the accepted change proposal, changed content, directly affected locked contracts, and regression obligations. It must not brainstorm replacements for unchanged locked decisions.

### 12. Emit, Stabilize, and Validate the Review Record

Create `spec-review.json` beside the target specification or in its delivery/update directory. Use [the review record template](./assets/spec-review.template.json) and the field rules in [readiness, findings, and adversarial review](./references/readiness-and-adversarial.md).

Run:

```bash
node .github/skills/product-engineering-spec-review/scripts/validate-review.mjs <path-to-spec-review.json>
```

The final verdict is:

- `ready`: every applicable dimension scores at least 8, no open critical/high finding, no unresolved decision, and the unfamiliar-implementer gate passes.
- `ready-with-conditions`: no open critical/high finding, but bounded non-blocking conditions remain with owners and verification.
- `not-ready`: any open critical/high finding, unresolved material decision, missing required lens, untestable contract, or failed unfamiliar-implementer gate.

Keep the target's lifecycle truthful. A specification review can make a target implementation-ready; it cannot make unimplemented behavior verified.

After a `ready` verdict and explicit decision-owner approval, create or update `spec-lock.json` with protected files and settled decision IDs, then run:

```bash
node .github/skills/product-engineering-spec-review/scripts/stabilize-spec.mjs lock <path-to-spec-lock.json>
node .github/skills/product-engineering-spec-review/scripts/stabilize-spec.mjs check <path-to-spec-lock.json>
```

Locking does not freeze implementation evidence. The traceability-contract hash excludes statuses, runs, issues, and decision evidence so implementation and verification can advance without reopening the product contract.

## Output

Report, in order:

1. readiness verdict and why
2. blocking findings, then high, medium, and low findings
3. changes made to the specification
4. dimension scores with target-specific 10/10 definitions
5. unresolved decisions and accepted risks
6. implementation sequence and verification gates
7. adversarial review rounds and remaining concerns
8. stabilization state, locked decisions, and any justified changes to prior locks

Use [sources and curation](./references/sources-and-curation.md) when explaining the method or updating this skill. It records what was retained, adapted, and deliberately excluded from the source frameworks.