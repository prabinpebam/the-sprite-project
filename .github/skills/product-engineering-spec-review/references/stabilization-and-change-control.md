# Specification Stabilization and Justified Change

## Purpose

LLM review is non-deterministic. A reviewer can always produce another plausible wording, architecture, interaction, or decomposition. That does not mean the current contract is defective. Repeatedly accepting equivalent alternatives creates churn, invalidates evidence, delays implementation, and erodes decision ownership.

This protocol makes convergence explicit: once a specification is implementation-ready and locked, preserve it by default. Reopen only when the expected value of change is supported by evidence, aligns with the product vision, and outweighs the full cost of destabilization.

## Stabilization States

| State | Meaning | Change rule |
|---|---|---|
| `open` | Still being shaped; material decisions may remain | Review normally within the approved scope posture |
| `candidate` | Ready verdict passed; awaiting decision-owner approval | Only readiness defects and owner-directed changes |
| `locked` | Scope, decisions, contracts, and gates are accepted | Delta-only review; burden of proof on change |
| `reopened` | A justified material change is approved and bounded | Change only the approved surfaces and their dependencies |
| `superseded` | Replaced by a later lock/update | Preserve for history; never edit into the new truth |

A verified baseline remains immutable even if its successor is reopened. Change it only through a new formal update that references the baseline.

## What a Lock Protects

A lock protects semantic decisions, not incidental formatting:

- customer promises, target users, scope, exclusions, and north-star relationship
- observable workflows, UI behavior, errors, recovery, and accessibility contracts
- architecture boundaries, dependency direction, schemas, data ownership, migrations, and compatibility
- security/privacy posture and accepted risk
- quality scenarios, numeric limits, evidence requirements, release, distribution, and rollback gates
- decision rationale and rejected alternatives

Implementation code, generated evidence, run/issue records, and evidence-owned lifecycle statuses may advance without reopening the contract when the lock manifest explicitly excludes them.

## Mandatory Pre-Change Check

Before reviewing or editing a previously reviewed target:

1. Read its latest review, decisions, ADRs, update history, and `spec-lock.json`.
2. Run the lock check. A clean lock establishes the no-change baseline.
3. Identify the user's requested delta. Do not conduct an unbounded fresh review of unchanged locked content.
4. List the locked decisions and files the delta could affect.
5. Classify the reason for each proposed change.

If unexpected drift is detected, stop semantic editing. Determine whether it is generated/status-only progress, an approved reopened change, or unauthorized contract drift. Do not create a new lock over unexplained drift.

## Change Reason Classes

### Eligible to Reopen

- `contract-defect`: contradiction, infeasibility, untestable oracle, data-loss path, security/privacy flaw, or missing behavior that makes the accepted promise false.
- `new-evidence`: implementation, user, operational, legal, security, performance, compatibility, or research evidence falsifies a locked assumption.
- `changed-constraint`: the owner changes a promise, target user, platform, budget, deadline, law, dependency, supported environment, or product vision.
- `measured-improvement`: measured user value, risk reduction, cost reduction, or delivery simplification is material and exceeds total change cost.

### Not Eligible by Itself

- `alternative-only`: another valid architecture, naming scheme, UI composition, library, wording, or decomposition with no demonstrated defect or net benefit.
- reviewer preference, novelty, stylistic taste, theoretical purity, framework fashion, or a different score rationale
- low-confidence speculation without a cheap discriminating check
- cleanup that would invalidate more evidence than the value it creates

Record rejected alternatives so a later reviewer does not repeatedly rediscover them.

## Burden-of-Proof Record

Start from [the justified-change template](../assets/justified-change.template.json) and attach it to the next review record. Keep the no-change option explicit.

Every proposed change to locked content must state:

| Field | Required content |
|---|---|
| Change ID | Stable ID linked to the prior lock |
| Trigger class | One eligible reason class |
| New evidence | Observable fact unavailable or unresolved at lock time |
| Locked surface | Decision IDs, promises, flows, contracts, files, and gates affected |
| Defect/no-change consequence | What concrete harm, missed value, or constraint violation remains if unchanged |
| Options | No change plus at least one bounded change; include the smallest viable repair |
| Product alignment | How the change supports the accepted promise and north star without violating exclusions |
| Expected benefit | User value, risk reduction, correctness, or verified cost reduction |
| Full change cost | Design, implementation, migration, compatibility, revalidation, docs, support, rollout, rollback, and cognitive cost |
| Blast radius | Direct and transitive contracts/evidence invalidated |
| Reversibility | Rollback path and any one-way consequences |
| Recommendation | Why net value is positive at the stated confidence |
| Authority | Decision owner and explicit approve/reject/defer outcome |

Do not fabricate currency, time, probabilities, or ratios. Use measured values when available. Otherwise use `low`, `medium`, `high`, or `unknown` with evidence and uncertainty.

## ROI and Alignment Gate

A locked change is justified only when all applicable gates pass:

1. **Evidence:** the trigger is supported at confidence 7/10 or higher, or the uncertainty itself creates critical risk that requires a bounded spike.
2. **Materiality:** the no-change consequence is material to a promise, safety, correctness, compatibility, operability, or measured delivery cost.
3. **Alignment:** the change advances the accepted product promise or north star and does not silently add an excluded promise.
4. **Net value:** expected benefit exceeds full change cost. When value and cost are both unknown, gather evidence rather than change the spec.
5. **Smallest sufficient delta:** choose the narrowest change that resolves the demonstrated problem. Do not use a valid defect as permission for adjacent redesign.
6. **Revalidation funded:** the proposal names every invalidated review, fixture, migration, host, flow, and release gate and includes the work to rerun them.
7. **Authority:** the decision owner approves material scope/contract changes. Critical safety or correctness defects may block implementation immediately, but still require recorded disposition.

For equivalent options with no material net-value difference, keep the locked decision. Stability wins ties.

## Severity and Change Policy

- Critical locked defect: block affected implementation/release, open a bounded change immediately, and preserve the prior lock as history.
- High locked defect: propose reopening with owner approval before affected implementation proceeds.
- Medium improvement: normally defer to the next planned spec revision unless measured value clearly exceeds revalidation cost.
- Low improvement or alternative-only suggestion: reject or record as considered; do not reopen.

Severity does not prove ROI. A high-impact theoretical claim still needs evidence and reachability.

## Reopened Change Workflow

1. Preserve the current lock manifest in a history location before editing.
2. Set stabilization state to `reopened` and link the approved change ID.
3. Edit only approved locked surfaces and their necessary dependents.
4. Re-run applicable validators, affected tests/evidence, and a delta-focused unfamiliar-implementer review.
5. Reconcile decisions and mark prior decisions superseded rather than rewriting their history.
6. Obtain decision-owner approval for the revised boundary.
7. Create a new monotonically identified lock. Never reuse the prior lock ID.

## Reviewer Convergence Rules

1. A passing review plus clean lock is the default stopping point.
2. Later reviewers must search prior rejected/deferred findings before promoting a similar idea.
3. Independent review asks "is the accepted delta defective?", not "how else could this be designed?"
4. Repeated findings without new evidence are deduplicated against the prior review and receive no new change action.
5. Two consecutive review rounds that raise no new critical/high evidence end the review.
6. Scores cannot reopen a lock. Only evidence-backed findings and approved changed constraints can.

## Lock Manifest

`spec-lock.json` records:

- lock ID, state, target, review ID, lock date, and authority
- product-vision alignment statement
- protected settled decision IDs
- allowed non-contract mutations
- eligible reopen triggers
- protected file entries and hashes

Use `bytes` mode for stable Markdown/HTML/JSON contracts. Use `traceability-contract` for traceability JSON; it excludes `status`, `evidence`, `runs`, and `issues` from the semantic projection so delivery evidence can advance while promises, scenarios, oracles, gates, exclusions, and decisions remain protected.

Use `html-contract` for generated UPD pages. It excludes the generated lock notice, lifecycle status badges, the TL;DR lifecycle status value, and CRLF/LF differences. Host classifications, promises, outcomes, gates, exclusions, counts, IDs, and other product prose remain protected.