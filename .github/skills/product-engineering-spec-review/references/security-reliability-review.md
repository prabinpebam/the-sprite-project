# Security, Reliability, and Quality Review

## Quality Scenarios

Convert every material quality claim into a measurable scenario:

| Field | Meaning |
|---|---|
| source | user, system, dependency, operator, or event initiating it |
| stimulus | request, load, failure, change, or attack |
| environment | normal, peak, offline, degraded, startup, migration, recovery |
| artifact | affected component, data, interface, or host |
| response | required system behavior |
| response measure | objective threshold or pass/fail oracle |

Include usage, change, and fault scenarios. Relevant qualities include usability, accessibility, correctness, security, privacy, interoperability, reliability, recoverability, performance, capacity, maintainability, testability, operability, portability, and distribution.

## Security and Privacy

Use the four-question threat-model loop:

1. What are we working on?
2. What can go wrong?
3. What will we do about it?
4. Did we do a good enough job?

Model assets, actors, entry points, data flows, data stores, processes, external entities, privileges, and trust boundaries. Threats are durable actor-outcome classes; specific vulnerabilities are evidence, not the model itself.

For each threat record:

- actor and required access
- traversed surface/trust boundary
- asset and security property at risk
- preconditions
- impact and residual likelihood after current controls
- status and existing controls
- response: mitigate, eliminate, transfer, accept, or defer
- class-level mitigation and verification requirement
- residual risk owner

Use STRIDE as a gap-finding prompt, not a substitute for system-specific reasoning. Reference a versioned OWASP ASVS requirement when it supplies a useful testable control, but do not dump the whole standard into the spec.

Security findings need a reachable path and consequence. Missing hardening with no applicable threat is not automatically high severity.

## Reliability and Recovery

Define correctness, availability, durability, and recoverability from the user's perspective. For applicable systems specify:

- dependency failure and degraded-mode behavior
- bounded retries, backoff, idempotency, and retry exhaustion
- timeout and cancellation semantics
- startup/restart recovery and last-known-good state
- queue/backlog or long-running-work behavior
- data backup, restore, integrity checking, and corruption handling
- recovery point and recovery time objectives only when the product needs them

Do not demand 100% availability. Choose a few user-relevant indicators and objectives. For local-first products, durability, save latency, correctness, and recoverability may matter more than uptime.

## Performance and Capacity

Specify workloads and limits rather than "fast":

- representative data sizes and worst supported size
- typical and tail latency, normally percentiles rather than averages
- throughput or operation frequency
- memory, storage, CPU/GPU, handle, and connection limits
- quota/capacity warning and failure behavior
- cold start, warm start, offline, and packaged-host differences where relevant
- load or stress fixture and pass/fail threshold

Identify what breaks first at 10x expected load and whether that scale is plausible. Do not optimize hypothetical scale without a product constraint.

## Operability and Diagnostics

The specification must let a user or operator distinguish symptom from cause and recover without source-level guesswork. Define:

- user-visible status and diagnostic details
- structured logs or local diagnostic bundle where appropriate
- stable error codes/classes for supportable failures
- health/storage/version/capability inspection
- black-box checks for promised behavior
- white-box diagnostics for root cause
- actionable alerts only for systems with an operator response path
- runbook or recovery instructions for material failures

For services, consider latency, traffic, errors, and saturation. Page only on urgent, actionable, user-visible or imminent symptoms. For local apps, avoid inventing server monitoring; provide inspectable local state and exportable diagnostics.

## Deployment, Distribution, and Rollback

Review the full path from source to usable artifact:

- reproducible and automated build
- supported targets and prerequisites
- signing/notarization posture and explicit warnings
- artifact version and update compatibility
- deployment/install/portable launch procedure
- configuration and secret handling
- staged rollout or feature flag when blast radius warrants it
- post-release smoke/acceptance checks
- rollback trigger, exact steps, data compatibility, and last-known-good baseline

Canarying is useful when production traffic and independent populations exist. Do not require it for static or local-only distribution; use representative pre-release fixtures and independently withdrawable artifacts instead.

## Migration and Compatibility

For any schema, file, API, host, or version transition specify:

- compatibility matrix
- authoritative version identifiers
- reader/writer behavior for older, current, future, and malformed versions
- deterministic migration and validation order
- backup/restore and no-mutation-on-failure guarantees
- mixed-version and partial-rollout behavior
- round-trip invariants and canonical fixtures
- deprecation/removal criteria
- rollback compatibility after writes by the new version

"Imports successfully" is insufficient. Verify semantic identity, derived output, metadata, and host/version exclusions.