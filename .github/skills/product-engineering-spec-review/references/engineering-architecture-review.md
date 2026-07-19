# Engineering and Architecture Review

## Existing-System Fit

Map each planned responsibility to current code, contracts, tests, and decisions:

| Responsibility | Existing owner | Reuse/extend/replace | Evidence | Rationale |
|---|---|---|---|---|

Flag parallel implementations, duplicate sources of truth, cross-boundary styling or logic, and abstractions that bypass the owning domain. Prefer the repository's proven patterns unless they are the cause of the problem.

## Architecture Model

For non-trivial work, require diagrams or equivalent structured models for:

- system context and external actors
- components and dependency direction
- deployment/host topology
- material data flows and trust boundaries
- state machines
- rollout and rollback sequence

A diagram must expose decisions, not merely repeat names from prose.

## Contracts and Ownership

For every boundary specify:

- owner and lifecycle
- input/output schema and version
- validation location
- idempotency and retry semantics
- error taxonomy
- ordering and concurrency guarantees
- persistence and transaction boundary
- compatibility expectations
- observability or diagnostic surface

Public or cross-host contracts need canonical examples or fixtures. Structured data should have a parser/schema, not ad hoc string rules.

## Data and State

Trace create, read, update, delete, import, export, migration, backup, restore, conflict, and corruption paths where applicable. Define:

- identity and ownership
- canonical versus derived state
- revision/version behavior
- dirty/saved/failed/recovery states
- atomicity and partial-write handling
- external modification and stale reads
- retention, quota/capacity, and cleanup
- serialization determinism
- forward/backward compatibility and unknown-version behavior

State-machine transitions should include invalid transitions and what prevents them.

## Failure and Recovery Registry

For every material codepath or integration, record:

| Codepath | Trigger | Named failure | Detection | System response | User/operator sees | State preserved | Retry/idempotency | Test |
|---|---|---|---|---|---|---|---|---|

Trace at least:

- missing, empty, malformed, oversized, duplicate, and incompatible input
- unavailable dependency, timeout, cancellation, and interruption
- concurrent or repeated action
- partial completion and partial write
- quota/capacity exhaustion
- permission denial
- stale state or external modification
- startup, shutdown, crash, and restart where stateful

Any silent failure with no test and no recovery is a blocking finding.

## Architecture Decisions

An architecturally significant decision affects structure, quality attributes, dependencies, interfaces, data, compatibility, distribution, or construction technique. Record it in a short modular ADR:

- title
- context and forces
- considered alternatives and decision criteria
- decision in active voice
- status: proposed, accepted, deprecated, or superseded
- positive, negative, and neutral consequences
- links to superseded/replacing decisions

Keep old decisions when superseded. Future implementers need the rationale, not only the current outcome.

## Implementation Structure

The specification should identify modules and ownership boundaries, not invent every local function. It must resolve decisions that would otherwise change behavior or architecture.

Produce:

- dependency-ordered work packages
- independently testable vertical slices
- migration and compatibility sequencing
- modules likely to conflict if parallelized
- narrow validation after each package
- final regression and release gates

Mark assumptions that require a spike. A spike retires a named risk and produces a decision/evidence artifact; it does not silently define product behavior.