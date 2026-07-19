# Product Update Governance

Use this process only when a request materially changes an approved or verified product contract. Governance is
deliberate overhead: valuable for consequential scope changes and harmful when applied to routine work.

## Materiality Test

Default to normal engineering execution. A formal product update is required only when the request changes at least
one of:

- the customer promise, target user, included/excluded scope, or recovery expectation
- an observable user capability, task-flow outcome/branch, required interface surface, or objective behavior oracle
- a compatibility or risk boundary such as host support, canonical data, migration, privacy/legal posture, security,
  distribution, or removal of existing behavior

Ask one discriminator: **Would completing this task make the approved product specification or its evidence
materially untrue or incomplete?** If no, use the fast path.

## Fast Path - Explicit Non-Triggers

Do not create, validate, or amend a product update for:

- Git commands or repository bookkeeping, including commit and push
- formatting, typo, link, wording, or generated-document maintenance that does not change requirements
- refactoring or internal architecture that preserves public contracts
- bug fixes that restore an existing expected behavior
- dependency, build, CI/test, development-server, packaging, or tooling maintenance
- tests and evidence for unchanged requirements
- implementation already authorized by an approved update
- performance, accessibility, or visual fixes that satisfy an existing oracle without changing it
- cleanup of artifacts, caches, logs, fixtures, or ignored files

Use ordinary scoped validation appropriate to the task. Do not freeze a baseline, create an ADR, derive scenarios, or
generate traceability simply because files changed.

## Three Governance Lanes

| Lane | Use when | Required process |
|---|---|---|
| Fast path | No material product-contract change | Implement, validate narrowly, report |
| Active-update amendment | Material change within the same unverified promise and rollout boundary | Record delta, update affected derivation, revalidate existing update |
| Full product update | New/distinct promise or material change to approved/verified baseline | Complete `UPD-NNN` pipeline |

## Core Rule

A verified baseline is historical evidence, not a living wish list. Never rewrite it to make a new decision appear
previously implemented or tested. A product update references the baseline, derives a complete new change graph, and
collects fresh evidence for every changed or affected behavior.

This rule protects verified truth; it does not turn routine execution into product governance.

## Update Directory

```text
delivery/updates/UPD-NNN-short-name/
  baseline.json
  change-proposal.md
  impact-analysis.md
  traceability.json
  customer-promise.md
  scenarios.md
  capabilities.md
  task-flows.md
  experience-architecture.md
  scope-ledger.md
  decisions.md
  execution-plan.md
  release-gate.md
  issues.md
  evidence/
```

## Required Metadata

Every update names:

- stable update ID and title
- request date and source
- baseline Git revision and evidence run
- current status: `proposed`, `specified`, `approved`, `implemented`, `verified`, `rejected`, or `superseded`
- affected product stages and hosts
- decision authority
- compatibility and migration policy
- rollout and rollback boundary

Trace records inside the update continue to use the canonical statuses accepted by the traceability validator.

## Derivation Order

1. **Request** - capture the user's language, constraint, and intended outcome.
2. **Baseline** - freeze the existing revision, record counts, verified flows, and architecture decisions.
3. **Impact** - classify affected records and contracts before writing a solution.
4. **Promise** - define what becomes newly true for which user and context.
5. **Scenarios** - derive first use, returning use, recovery, failure, offline, portability, and host-specific situations.
6. **User can** - derive atomic user powers from scenarios.
7. **Task flows** - derive entries, actions, system responses, branches, cancellation, recovery, outputs, and completion.
8. **Experience architecture** - derive information objects, navigation, views, dialogs, UI elements, and status surfaces.
9. **Expected behavior** - give every material flow step an objective oracle.
10. **Exclusions** - decide every plausible adjacent expectation deliberately.
11. **Architecture** - accept or supersede ADRs and define host adapters, data formats, and migration boundaries.
12. **Execution** - create dependency-gated work packages mapped to trace IDs.
13. **Evidence** - automate changed flows and all baseline regression flows affected by the update.
14. **Release** - calculate completion without averaging away missing records.

Skipping a step requires a written `not affected` determination in the impact analysis. Silence is not evidence that a
layer is unaffected.

## Impact Classification

| Classification | Meaning | Required action |
|---|---|---|
| Retained | Meaning and oracle are unchanged | Reference baseline ID; run regression when implementation is touched |
| Changed | User outcome or behavior differs | Create a new versioned record and fresh evidence |
| Added | New in-scope behavior | Derive full downstream coverage |
| Superseded | A new record replaces an old contract | Preserve and link the old ID; define migration |
| Removed | Promise or capability is intentionally withdrawn | Record user consequence, migration, and approval |
| Unaffected | No dependency on the update | Explain boundary when non-obvious |

## ID Policy

Keep semantic baseline IDs only when meaning and objective oracle are unchanged. New or changed records receive IDs
scoped by purpose or host, for example `CP-DUAL-HOST-PORTABILITY`, `TF-DESKTOP-DIRECT-EXPORT`, or
`EB-WEB-IDB-RECOVERY`. Do not suffix every ID mechanically when the semantic name is already unique.

## Host Matrix

For multi-host products, every promise, capability, and flow declares one of:

- `shared` - identical user outcome and portable data contract
- `web` - GitHub Pages/browser-specific behavior
- `desktop` - local native-host behavior
- `cross-host` - handoff or parity between hosts

A host-specific convenience must not silently change shared project semantics, output hashes, provenance, or schema.

## Approval Boundary

Specification approval means:

- request and constraints are accurately captured
- baseline is immutable and linked
- traceability validator passes
- every affected record is classified
- exclusions close plausible expectation gaps
- architecture decisions are accepted
- execution packages and evidence obligations are complete

Approval does not mean implementation or verification.

## Evidence Boundary

An update becomes verified only when:

- every new or changed flow passes in the actual UI on its declared host
- affected retained flows pass regression on all affected hosts
- cross-host project and output compatibility assertions pass
- migrations and rollback are tested from real baseline fixtures
- no unresolved severity 0-2 issue remains
- generated evidence updates the status model

## Anti-Patterns

- Editing a verified flow from the baseline in place
- Starting UI design from a requested feature without deriving a promise
- Treating an ADR as the product requirement
- Adding desktop-only behavior without cross-host data compatibility
- Calling implementation complete because the app builds
- Marking inherited records verified without regression evidence after touching their implementation
- Leaving a plausible expectation absent instead of including or excluding it
- Combining several unrelated changes in one update because they share a release date
