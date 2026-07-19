---
name: agentic-product-delivery
description: 'Use when: defining, planning, implementing, validating, or auditing a product stage through agentic automation. Derives exhaustive customer promises, scenarios, user-can capabilities, task flows, information architecture, navigation, views, UI controls, expected behaviors, explicit exclusions, implementation work, and real-UI browser evidence with unique IDs and complete traceability. Use for MVP delivery, feature stages, UX acceptance, scope closure, unattended execution, and progress records.'
argument-hint: 'Describe the product stage or scope to execute'
---

# Agentic Product Delivery

Deliver a bounded product stage from promise to verified user experience. The workflow is complete only when every in-scope claim traces to passing evidence from automated task flows in the actual UI and every excluded expectation is deliberate.

## Non-Negotiable Rules

1. Treat the customer promise as the root of scope. Do not implement undocumented behavior.
2. Give every artifact a stable ID. Never use row position or prose headings as identity.
3. Maintain bidirectional traceability. Every child references its parent and every parent is covered by at least one child.
4. Record plausible but excluded expectations in the exclusion ledger with a reason and destination stage.
5. Resolve omissions before implementation. "Not considered" is not an acceptable exclusion reason.
6. Keep product behavior independent of the UI where the architecture requires reuse, but accept user experience only through the actual UI.
7. Unit, integration, schema, visual-regression, and API tests support diagnosis; none can substitute for task-flow acceptance.
8. Automate flows through visible, enabled, hit-testable controls using browser or computer-use automation. Do not inject state, call internal functions, or bypass the interface.
9. A flow passes only when all declared user-visible, artifact, persistence, accessibility, and failure-state expectations pass with no unexplained anomalies.
10. Continue unattended through reversible decisions. Ask for human input only for secrets, legal/risk acceptance, independent human observations, destructive external actions, or irreversible publication.
11. Never edit a verified baseline to make a new requirement appear previously verified. Create a versioned product update that references the baseline and starts new or changed records below `verified`.
12. No product requirement, feature, platform, UI control, or architectural capability may enter implementation outside the formal update pipeline.

## Required Artifact Set

Create a user-inspectable delivery area appropriate to the repository, normally `delivery/<stage>/`:

- `traceability.json` - canonical machine-readable scope and status
- `customer-promise.md` - detailed promise, users, outcomes, constraints, non-promises
- `scenarios.md` - context-rich end-to-end situations
- `capabilities.md` - exhaustive `User can...` statements
- `task-flows.md` - preconditions, steps, branches, recovery, completion
- `experience-architecture.md` - IA, navigation, views, UI inventory, responsive behavior
- `scope-ledger.md` - included, excluded, deferred, rejected, and rationale
- `execution-plan.md` - dependency graph, work packages, defaults, recovery rules
- `evidence/README.md` - how to inspect runs and artifacts
- `evidence/runs/<run-id>/` - captures, screenshots, exports, console/network logs, and result JSON
- `decisions.md` - dated reversible and irreversible decisions
- `issues.md` - anomalies with severity, trace IDs, disposition, and verification run

For a change to a verified or approved product stage, create `delivery/updates/<update-id>/` with the same artifact
set plus:

- `change-proposal.md` - request, rationale, source, constraints, and decision authority
- `impact-analysis.md` - retained, changed, added, removed, and superseded records and contracts
- `baseline.json` - immutable baseline revision, evidence run, and inherited record IDs
- `release-gate.md` - objective completion arithmetic and rollout/rollback conditions

Use [the traceability model](./references/traceability-model.md) and [execution and UX validation](./references/execution-and-validation.md). Copy or adapt [the starter model](./assets/traceability.template.json).
For changes after a baseline exists, also use [product update governance](./references/product-update-governance.md).

## Product Update Gate

Before modifying implementation for a new or changed requirement:

1. Assign a stable update ID such as `UPD-001` and identify the exact baseline commit and evidence run.
2. Record the requested outcome and constraints without translating it directly into features.
3. Classify every affected baseline record as retained, changed, superseded, removed, or unaffected.
4. Derive new or changed `CP` promises, then `SC`, `UC`, `TF`, experience architecture, and `EB` records in order.
5. Record plausible adjacent expectations as explicit `OUT` decisions.
6. Reconcile architecture decisions. Add or supersede ADRs before implementation when platform boundaries change.
7. Validate the complete update envelope and traceability model with zero omissions or orphans:

```bash
node .github/skills/agentic-product-delivery/scripts/validate-product-update.mjs \
	delivery/updates/UPD-NNN-name
```

8. Approve the specified update boundary. Only then dispatch implementation work packages.
9. Verify changed and regression flows through the real UI on every affected host.
10. Promote update status from `specified` to `verified` only from generated evidence; preserve the baseline record permanently.

## Derivation Workflow

### 1. Establish the Boundary

Read the authoritative product material and current implementation evidence. Name:

- product stage and target user
- problem, desired outcome, and differentiated promise
- environmental and business constraints
- explicit quality bar
- authoritative source documents
- assumptions requiring proof

Create exclusions for adjacent expectations immediately. If an expectation is plausible for the target user, it must be included or explicitly excluded.

### 2. Define Customer Promises

Create `CP-*` records. Each promise states:

- user and context
- trigger or need
- observable outcome
- quality and time expectations
- failure/recovery expectation
- constraints and caveats
- evidence required to consider the promise true

Avoid feature language until the outcome is unambiguous.

### 3. Derive Scenarios

Create `SC-*` records from promises. Cover:

- first use and happy path
- returning use and persistence
- correction, cancellation, and recovery
- empty, loading, partial, incompatible, invalid, and failure states
- keyboard and constrained viewport use
- output consumption outside the product when promised

Each scenario references at least one `CP-*` and names actors, starting state, intent, environment, success state, and likely interruptions.

### 4. Derive User Capabilities

Create atomic `UC-*` statements beginning with "User can". A capability describes one observable power, not an implementation task. Include creation, inspection, modification, reversal, persistence, export, recovery, and accessibility where the promise implies them.

Every scenario must be fully covered by capabilities. Every capability must serve at least one scenario.

### 5. Derive Task Flows

Create `TF-*` records. Every flow includes:

- referenced capabilities and scenarios
- entry points and preconditions
- numbered user actions
- system responses after every action
- decision branches and alternate paths
- cancellation and recovery
- persisted or exported artifacts
- completion criteria
- objective UX expectations

Split flows when different user intents or terminal outcomes make one flow ambiguous. Do not split merely by screen.

### 6. Design the Experience Architecture

Define and ID:

- `IA-*` information objects and hierarchy
- `NAV-*` destinations, transitions, back behavior, and deep links
- `VIEW-*` views, dialogs, subviews, and persistent regions
- `UI-*` controls, displays, status regions, and feedback surfaces
- `EB-*` expected behaviors for each flow step and state

Every flow step references the view, UI element, and expected behavior used. Every interactive UI element must serve a flow or be removed.

### 7. Close Scope Before Building

Run the validator:

```bash
node .github/skills/agentic-product-delivery/scripts/validate-traceability.mjs delivery/<stage>/traceability.json
```

Do not begin a product slice while required links are missing. Architecture spikes may proceed only when labeled as risk-retirement work and barred from silently defining UX scope.

### 8. Execute by Vertical Flow

Implement the thinnest complete flow first, including its real data, persistence, errors, and evidence harness. Then add flows in dependency order.

For each implementation package:

1. State the falsifiable behavior hypothesis.
2. Implement the smallest complete slice.
3. Run the narrowest behavior check.
4. Run the corresponding actual-UI flow.
5. Record evidence and anomalies.
6. Update status only from generated results.

Do not mark records complete manually when a test or evidence run owns that status.

### 9. Validate in the Actual UI

Use Playwright or available computer-use automation against a production-equivalent build. Drive only public UI interactions. Validate:

- visible paint and actual pixels for visual output
- hit testing, clipping, overlays, focus, and keyboard operation
- labels, instructions, feedback, and status changes
- state after reload/reopen
- files or downstream artifacts actually produced
- console errors, uncaught exceptions, failed requests, and layout overflow
- responsive and reduced-motion behavior where applicable
- declared error, recovery, and cancellation branches

Capture agenda-free execution state first. Evaluate it against `EB-*` expectations after capture.

### 10. Apply the Completion Gate

A product stage is complete only when:

- traceability validation reports zero missing or orphan records
- every in-scope `CP`, `SC`, `UC`, `TF`, `IA`, `NAV`, `VIEW`, `UI`, and `EB` record is implemented or verified as appropriate
- every task flow has a passing latest actual-UI run
- every expected behavior has direct evidence
- no unresolved Severity 0, 1, or 2 issue exists
- no unexplained console, network, visual, persistence, export, or accessibility anomaly exists
- all exclusions are deliberate and reviewed against user expectations
- human-only gates are either satisfied or explicitly block release

"Looks good," unit-test percentage, screenshots alone, DOM presence alone, and partial happy-path automation are not completion evidence.

## Unattended Decision Policy

Proceed without asking when a decision is local, reversible, testable, and does not change the customer promise. Record the choice in `decisions.md`.

When blocked:

1. Try the documented compliant default.
2. Try a reversible local alternative.
3. Quarantine only the affected content or integration.
4. Continue all independent work.
5. Ask one bounded question only if no compliant path remains.

Never infer legal approval, invent user research, request secrets in chat, publish externally, or weaken acceptance criteria to avoid a block.

## Progress Reporting

The user-inspectable record must show:

- counts and status by ID type
- traceability coverage
- latest flow run and evidence link
- open anomalies by severity
- blocked human-only gates
- work currently runnable
- decisions and source changes

Generate progress from `traceability.json` and run results whenever practical; do not maintain a contradictory hand-written dashboard.
