# Sources and Curation Ledger

This skill synthesizes methods rather than copying one framework wholesale. Source-specific setup, telemetry, automatic commits, brand rules, and tool ceremony are deliberately excluded.

## GStack

Sources reviewed: `plan-ceo-review`, `plan-design-review`, `plan-eng-review`, `plan-devex-review`, `spec`, `review`, `qa`, `ship`, their detailed review sections, `ETHOS.md`, and architecture documentation.

Retained or adapted:

- premise challenge before solution review
- explicit scope posture and alternatives
- repository-grounded system audit
- target-specific 10/10 definitions and gap-based scoring
- happy, nil, empty, and upstream-error data paths
- named error/rescue and failure registries
- exhaustive interaction-state and test mapping
- confidence-calibrated, evidence-cited findings
- outside reviewer focused on what the primary review missed
- convergence guard and maximum review rounds
- review output converted into actionable implementation tasks

Deliberately excluded:

- telemetry, analytics, update prompts, GBrain, automatic commits, and hosted-service assumptions
- mandatory interaction for every finding; autonomous review may repair accepted-scope omissions and surfaces only material decisions
- "never skip any section" rules; this skill uses explicit applicability gates
- universal 100% test-coverage claims; coverage follows behavioral and risk obligations
- human/AI effort conversion tables as quality evidence
- GStack-specific report footers and shipping workflow coupling

## Anthropic Skills and Security Harness

Sources reviewed: `doc-coauthoring`, `frontend-design`, `webapp-testing`, `skill-creator`, `canvas-design`, `brand-guidelines`, `web-artifacts-builder`, and the defending-code `threat-model` and `triage` workflows.

Retained or adapted:

- context gathering before drafting
- section-level refinement and full-document consistency check
- fresh-reader testing with no context bleed
- progressive disclosure for reusable skills
- with-skill/baseline and discriminating-eval thinking
- design grounded in subject, audience, and single job
- deliberate typography/layout/motion rather than generic defaults
- reconnaissance before browser action
- assets, entry points, trust boundaries, threat classes, controls, and residual risk
- skeptical re-derivation of findings from source, independent verification, and severity separate from confidence

Deliberately excluded:

- artifact-specific stacks, brand palettes, generated-art setup, and browser helper commands
- security-harness checkpoint mechanics and scanner-input formats
- exploit-verifier voting as a default spec-review cost; independent challenge scales with depth
- assumptions that every UI needs a marketing hero or every system is internet-facing

## Accessibility and Usability

Sources reviewed: W3C WCAG 2.2 quick reference, WAI-ARIA Authoring Practices keyboard guidance, and Nielsen Norman Group's ten usability heuristics.

Retained or adapted:

- perceivable, operable, understandable, and robust acceptance obligations
- semantic name/role/value and status messages
- keyboard access, focus order, focus visibility/restoration, no traps, and conventional composite interactions
- contrast, reflow, target size, non-color cues, input assistance, and error prevention
- visible system status, user language, control/freedom, recognition, consistency, efficient use, focused design, and actionable recovery

The skill references WCAG conformance levels rather than reproducing the standard. Project/legal requirements determine the actual target.

## Security

Sources reviewed: OWASP Threat Modeling Cheat Sheet, OWASP ASVS 5.0, and Anthropic's defending-code threat-model schema.

Retained or adapted:

- four-question threat-model loop
- system model with processes, stores, flows, external entities, and trust boundaries
- threat identification in system context, with STRIDE as a prompt
- explicit responses: mitigate, eliminate, transfer, accept
- residual likelihood after controls
- actionable, measurable mitigations
- versioned ASVS control references where useful
- durable threat classes distinct from individual vulnerabilities

## Architecture and Quality

Sources reviewed: arc42 quality requirements, quality scenarios, risks/technical debt, architecture decisions, and Michael Nygard's ADR method.

Retained or adapted:

- measurable usage, change, and fault scenarios
- source, stimulus, environment, artifact, response, and response measure
- prioritized risks and technical debt with mitigation
- small modular ADRs with context, decision, status, and all consequences
- superseded decisions retained for history

## Reliability and Release

Sources reviewed: Google SRE material on SLOs, monitoring distributed systems, and canarying releases.

Retained or adapted:

- start from what users care about, then select a few representative indicators
- explicit measurement windows and percentile-aware latency
- correctness, durability, availability, throughput, and recoverability selected by system type
- symptom-oriented black-box evidence plus cause-oriented diagnostics
- latency, traffic, errors, and saturation for services
- reproducible automated builds, small releases, objective rollout evaluation, and rollback
- representative and attributable canary metrics where canarying applies

Deliberately excluded:

- mandatory SLOs, dashboards, paging, and canaries for local/static products
- 100% reliability as a target
- complex monitoring that does not drive an action

## Curation Rule

When updating this skill, add a source only if it contributes a distinct decision method, evidence requirement, or failure class. Prefer the authoritative primary source. Record what is retained, adapted, and excluded so the workflow does not become an accumulation of overlapping checklists.

## Owner Stabilization Principle

Source: product-owner direction on 2026-07-19.

Retained as a controlling workflow rule:

- LLM review non-determinism must not create endless equivalent redesign.
- Ready specifications and settled decisions need explicit lock state and drift detection.
- Locked content changes only for justified material evidence or changed constraints.
- Every change weighs full lifecycle/revalidation cost against evidence-backed value and product-vision alignment.
- Stability wins when options are materially equivalent.