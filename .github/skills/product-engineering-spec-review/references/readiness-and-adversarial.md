# Readiness, Findings, and Adversarial Review

## Dimension Scoring

Score only after defining a target-specific 10/10 state.

| Score | Meaning |
|---|---|
| 10 | Complete, internally consistent, evidence-backed, and executable with no material ambiguity |
| 8-9 | Implementation-ready; bounded improvements remain but do not require product or architecture invention |
| 6-7 | Plausible plan with material gaps or weak evidence; likely implementer questions |
| 3-5 | Major contracts, paths, or decisions absent; implementation would be speculative |
| 0-2 | Not meaningfully addressed or contradicted by evidence |

Scores summarize findings. They never override a blocker.

Each applicable dimension record contains:

- `id`
- `applicable: true`
- `score`
- `definitionOf10`
- evidence references
- finding IDs

Each non-applicable dimension contains `applicable: false` and a concrete `notApplicableReason`.

## Finding Model

### Severity

- `critical`: unsafe, destructive, legally risky, impossible, or contract-breaking; implementation must not start or ship.
- `high`: unresolved product/architecture decision or likely major failure that blocks implementation readiness.
- `medium`: material quality, maintainability, UX, test, or operability gap with a bounded safe default.
- `low`: useful polish, clarity, or optimization that does not threaten the accepted contract.

### Confidence

- `9-10`: directly verified by authoritative specification, source, executable evidence, or standard.
- `7-8`: strong evidence and a short inferential step.
- `5-6`: plausible but missing one decisive fact; label for verification.
- `3-4`: weak signal; keep in appendix or open questions, not the main verdict.
- `1-2`: speculation; omit unless consequence would be critical and the uncertainty itself must be resolved.

### Required Fields

Every finding contains:

- stable `id`
- owning `dimension`
- `severity` and `confidence`
- concise title
- evidence array with path/URL and claim
- problem and user/system impact
- exact remediation
- verification method
- disposition: `open`, `fixed`, `accepted-risk`, `deferred`, or `rejected`
- owner and due stage for accepted/deferred risk

Do not promote a finding if you cannot point to the evidence that motivated it. Unknowns can be recorded as unresolved decisions.

## Editing Rules

1. Check stabilization state before editing. For a locked target, satisfy the justified-change gate first.
2. Fix the canonical specification, not only the review report.
3. Update all dependent sections when one contract changes.
4. Preserve status truth: specified is not implemented; implemented is not verified.
5. Preserve immutable baselines and superseded decisions.
6. Do not silently expand or reduce a material promise.
7. Make acceptance criteria observable and binary where possible.
8. Name exact files only when repository evidence supports them; otherwise name the owning module or contract.
9. Record deferred work with rationale, dependency, owner/stage, and consequence.
10. Do not replace a locked choice with an equivalent alternative. Stability wins when no demonstrated net benefit exceeds full change cost.

## Unfamiliar-Implementer Gate

The independent reviewer receives only:

- the improved specification
- relevant repository paths
- settled constraints and baselines
- this question: "Could a competent implementer execute this without asking a product or architecture question?"

For a locked delta review, it also receives the active lock, approved change record, and rejected/deferred prior findings. It reviews only changed and transitively affected contracts.

It checks:

1. completeness of requirements and edge cases
2. internal consistency and traceability
3. clarity of terms, contracts, and state transitions
4. feasibility against existing code and dependencies
5. sequencing, migration, and rollback
6. testability of every acceptance claim
7. hidden decisions left to the implementer
8. simpler alternatives the primary review missed

Run one fresh reviewer for standard depth and up to three rounds for deep depth. Repair valid findings between rounds. Stop when:

- the reviewer passes
- three rounds complete
- the same concern repeats in two consecutive rounds
- remaining issues require the decision owner

Record all rounds, issue counts, fixed counts, and remaining concerns. Independent review is a quality signal, not permission to override the decision owner.

## Review Record Contract

`spec-review.json` contains:

- schema version, review ID, target, date, depth, and verdict
- materiality signals and source documents
- all mandatory and triggered dimensions
- findings and unresolved decisions
- edits made
- implementation-readiness gate
- adversarial rounds
- implementation sequence and verification gates
- stabilization state, active lock, settled decisions, and justified changes to prior locks

Verdict rules are deterministic:

- `ready` requires all applicable dimensions at 8+, no open critical/high findings, no unresolved decisions, and `unfamiliarImplementerPass: true`.
- `ready-with-conditions` requires no open critical/high findings and every condition to have an owner/stage plus verification.
- otherwise use `not-ready`.

A `ready` review may be `candidate` pending owner approval or `locked` after approval. A lock is not valid unless its manifest check passes.

Run the validator after every material edit to the record.