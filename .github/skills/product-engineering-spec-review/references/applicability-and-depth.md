# Applicability and Review Depth

## Materiality First

Choose depth from blast radius, irreversibility, ambiguity, and evidence burden rather than document length.

First check stabilization. A clean locked specification changes the default from full re-review to delta review. Review depth then follows the proposed delta and the locked surfaces it can invalidate, not the original specification's total size.

### Quick

Use for a bounded clarification or low-risk plan that:

- preserves the accepted promise, workflow, architecture, data format, compatibility, and risk boundary
- touches one local behavior or a small number of adjacent modules
- has no migration, security-boundary, distribution, or irreversible-state change
- can be falsified by one or two focused checks

Run the mandatory core at concise depth. Record findings and verdict; skip specialist lenses with reasons.

### Standard

Use for a normal feature or subsystem change with a clear owner and bounded rollout. It may add UI, APIs, persistence, or integrations, but does not redefine the product or platform.

Run the full core, every triggered specialist lens, one independent reader review, and a complete review record.

### Deep

Use when any signal applies:

- new or changed customer promise, target user, distribution, or host
- architecture, storage, canonical format, migration, compatibility, or shared contract change
- authentication, authorization, privacy, secrets, untrusted files, remote input, or privilege-boundary change
- destructive or hard-to-reverse data operation
- multi-system rollout, offline behavior, background processing, concurrency, or partial deployment
- regulated, financial, safety, or high-value data
- cross-platform or cross-host parity claim
- broad implementation with multiple independent workstreams
- owner unavailable and the specification must support autonomous execution

Run all applicable lenses, explicit alternatives, threat and failure models, quality scenarios, full evidence mapping, and up to three adversarial rounds.

Reopening a locked deep specification is not automatically another deep review. Use deep depth only when the justified delta itself crosses a deep signal. Otherwise run a quick or standard delta review plus all invalidated gates.

## Mandatory Core Lenses

Every review evaluates these seven dimensions:

| ID | Dimension | Minimum question |
|---|---|---|
| `product-truth` | Product truth and value | Is this the right problem and an observable outcome for a named user? |
| `scope-alternatives` | Scope and alternatives | Are boundaries and rejected approaches explicit, and is the choice justified? |
| `architecture` | Architecture and integration | Does the design fit the existing system with clear ownership and contracts? |
| `data-failure` | Data, state, and failure paths | Are state transitions, invalid inputs, interruptions, and recovery specified? |
| `quality-attributes` | Quality attributes | Are applicable qualities measurable in context? |
| `verification-release` | Verification and release | Can each claim be proven, deployed, observed, and rolled back? |
| `implementation-readiness` | Unfamiliar-implementer readiness | Can a competent fresh implementer execute without inventing decisions? |

## Specialist Lens Triggers

| ID | Apply when the target includes |
|---|---|
| `ux-accessibility` | screens, controls, navigation, user-visible state, responsive behavior, content, or visual output |
| `developer-experience` | API, CLI, SDK, library, platform, extension point, integration guide, or developer documentation |
| `security-privacy` | untrusted input, identity, permissions, secrets, local/remote files, network, personal data, plugins, IPC, or privilege changes |
| `reliability-operability` | services, async work, retries, long-running processes, external dependencies, offline operation, support/on-call obligations |
| `performance-capacity` | latency/throughput promise, large data, rendering, loops over user content, memory pressure, storage quota, concurrency, or load sensitivity |
| `migration-compatibility` | schema/version change, import/export, data conversion, backward/forward compatibility, cross-host or cross-version interchange |
| `deployment-distribution` | packaged artifact, installer/portable app, release channel, static hosting, service deployment, feature flag, staged rollout, or publication |

## Applicability Rules

1. `not-applicable` requires a concrete reason tied to the target, not "out of scope" alone.
2. If a lens is triggered, depth may change how much evidence is gathered but cannot erase the lens.
3. Security is not automatically deep for every local tool. Escalate based on assets, trust boundaries, privileges, and consequence.
4. Operability for a zero-server local application means diagnosability, storage health, recovery, update/distribution behavior, and user-visible failure, not invented server dashboards.
5. Performance targets must map to real user or resource constraints. Do not fabricate SLOs because a framework contains an SLO section.
6. If evidence changes materiality, update the selected depth and record why.