# UPD-002 Product-Owner Review Brief

## Approval Record

The product owner approved the **Local Content Pack Ecosystem** boundary and authorized implementation on 2026-07-20. This record does not claim implementation or verification.

## Recommendation

Approve UPD-002 as the Phase 4 increment.

The current product proves two local-first hosts, deterministic project portability, bundled pack extensibility, provenance, and engine-ready output. The next unresolved product risk is whether compatible content can grow independently of application releases. UPD-002 tests that risk with the current humanoid geometry before terrain or non-humanoid content adds new producer/rig complexity.

## Proposed Promise

A developer can:

1. inspect and transactionally install a compatible data-only local `.spritepack`;
2. manage exact pack versions without silent project drift;
3. author compatible humanoid packs from PNG sheets without JSON;
4. preserve source/license metadata and deterministic credits;
5. use the same authored pack offline and across web/Electron with exact project, render, generic/Godot, and credit parity.

## Scope Size

- 4 customer promises
- 12 scenarios
- 24 user-can capabilities
- 11 actual-UI task flows
- 40 objective expected behaviors
- 12 deliberate exclusions
- 9 dependency-gated work packages
- 14 applicable review lenses, all 9/10
- 3 unfamiliar-implementer rounds ending PASS

## Approved Decisions

| Decision | Recommendation | Why |
|---|---|---|
| `DEC-UPD002-PHASE-BOUNDARY` | Approve | Open the local humanoid pack ecosystem before terrain/scenes; follows Phase 4 roadmap and tests content independence first. |
| `DEC-UPD002-PACK-FORMAT` | Approve | One deterministic data-only `.spritepack` is required for offline ownership and cross-host parity. |
| `DEC-UPD002-HUMANOID-PROFILE` | Approve | Limit v1 to exact current 256×512 humanoid idle/walk sheets and six slots; avoid speculative rig/geometry abstraction. |
| `DEC-UPD002-DATA-ONLY` | Approve | Reject scripts/plugins/SVG/shaders/custom decoders to preserve the local untrusted-data boundary. |
| `DEC-UPD002-SIDE-BY-SIDE` | Approve | Exact ID+SemVer+package checksum versions coexist; projects change locks only through explicit checkpointed action. |
| `DEC-UPD002-LICENSE-PROFILES` | Approve | Finite reviewed license vocabulary enables deterministic attribution without claiming legal clearance. |
| `DEC-UPD002-ADAPTER-DEFER` | Approve | The next engine adapter has an independent target, fixture, release, and rollback; candidate UPD-003 after demand selection. |

## Compatibility Consequence

Project schema stays version 2. Bundled-only projects remain project archive v1 and preserve bytes. Projects using non-bundled packs use project archive v2 with complete embedded `.spritepack` bytes; old readers fail closed. `PackLockRef.sha256` keeps its UPD-001 meaning as canonical `pack.json` hash; complete ZIP identity is separate.

## Security / Legal Boundary

- Local packs and PNGs are untrusted and strictly bounded.
- Packs contain JSON, PNG, and UTF-8 text only; no executable content.
- Electron pack access uses opaque, scoped, session grants and main-process validation.
- Authors must confirm rights and choose a supported offered license.
- The product records and reproduces metadata but does not provide legal advice or verify ownership.

## Explicitly Not Approved by This Update

Terrain, scenes, structures/props, non-humanoid rigs, arbitrary animation geometry, pixel editing, folder watching/live content, remote URL install, marketplace, executable plugins, arbitrary license prose, bulk repository conversion, and a new engine adapter.

## Entry Condition Disposition

The product owner explicitly rescheduled UPD-001 actual Pages and clean-machine verification as release gates that do not block UPD-002 development. UPD-001 remains implemented, not verified.

## Review Evidence

- Canonical graph: `traceability.json`
- Product/UX: `product-design-spec.md`
- Engineering/architecture: `engineering-spec.md`
- Security: `threat-model.md`
- Quality and release: `quality-scenarios.md`, `release-gate.md`
- Alternatives and impact: `change-proposal.md`, `impact-analysis.md`
- Deep review: `spec-review.json`

## Implementation Authorization

`spec-approval.json` is the exact approval artifact. `LOCK-UPD-002-001` protects the approved contract. Implementation proceeds in `execution-plan.md` dependency order; later material changes require justified lock reopening.
