# UPD-002 Change Proposal

## Request

Define the next coherent feature set after the dual-host MVP, update product scope, produce product-design and engineering specifications using repository governance, independently critique the result, and leave it ready for product-owner review.

## Proposed Outcome

Open a **local, data-only humanoid content pack ecosystem**. A developer can install, inspect, version, enable, disable, remove, recover, author, validate, export, and transfer compatible `.spritepack` packages without waiting for an application release or writing JSON. Projects retain exact pack locks, authored art remains offline and user-owned, and both hosts render and credit identical bytes.

## Why Now

The roadmap places content ecosystem work in Phase 4 after the pack contract survives the MVP. UPD-001 has implemented exact pack locks, host-neutral canonical serialization, local repositories, offline behavior, project archives, opaque Electron grants, and cross-host parity. The remaining unproven claim is whether content can grow independently of application releases.

## Alternatives Considered

| Alternative | Benefit | Cost / risk | Disposition |
|---|---|---|---|
| Add terrain and scenes now | High visible North Star progress | Skips Phase 4, couples a second producer to an unproven public pack contract, and creates schema/composition decisions before local ecosystem evidence | Rejected for UPD-002; Phase 5 |
| Add multi-character projects | Bounded user value | Does not prove independent content delivery, authoring, provenance, or pack compatibility | Candidate later workflow update |
| Add Unity or another engine adapter | Broader engine reach | Independent target selection, output contract, downstream fixture, release, and rollback; unrelated to pack install/authoring | Deferred to candidate UPD-003 |
| Install packs only | Smallest engineering change | Leaves creators writing JSON and does not prove the complete Phase 4 authoring promise | Rejected as incomplete |
| Author arbitrary rigs and animations | Flexible ecosystem | Forces speculative geometry and renderer abstraction without a second real profile | Deferred until real non-humanoid content |
| Local humanoid install + guided authoring | Proves content independence using current renderer geometry and exact legal/runtime contracts | Requires one new untrusted archive format, PNG runtime path, repositories, and guided UX | Selected |

## Constraints

- Preserve complete zero-server web operation and optional portable Electron.
- Preserve one product core, exact cross-host project/output parity, local custody, and no accounts.
- Keep packs data-only. No executable code, plugins, SVG, shaders, or remote install.
- Support only the current LPC humanoid 64px idle/walk profile and six current slots in format version 1.
- Preserve every UPD-001 project lock unless the user explicitly creates a checkpointed change.
- Preserve author/source/license metadata through pack, project, credits, and exports.
- Do not imply legal advice or accept arbitrary unreviewed license terms.
- UPD-001 external release gates remain an implementation entry condition, not hidden inherited verification.

## Decision Authority

The product owner approves or rejects this specified boundary and the seven proposed decisions in `decisions.md`. A ready review is not approval and does not authorize implementation.
