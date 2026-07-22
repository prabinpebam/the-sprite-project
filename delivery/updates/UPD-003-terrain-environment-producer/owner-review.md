# UPD-003 Product-Owner Review Brief

## Recommendation

Approve and implement the **Terrain Environment Producer** as the next MVP expansion.

UPD-002 proves content can grow independently of application releases. The next architecture/product risk is whether a structurally different producer can reuse the project, theme, persistence, archive, export, provenance, offline, and dual-host systems without character-specific duplication. Terrain is the roadmap’s designated second producer and the highest-value surface-area asset for a 2D game.

## Promise

A developer can add one deterministic 32px terrain document to the same project as their character, paint a bounded map to verify autotiling, theme it coherently, save/reopen/transfer it, and export generic or Godot-ready terrain without manually slicing sixteen variants or rebuilding adjacency rules.

## Scope

- 3 customer promises
- 8 scenarios
- 17 user-can capabilities
- 8 task flows
- 28 objective expected behaviors
- 12 deliberate exclusions
- 7 implementation work packages
- 6 locked decisions

## Decision Summary

| Decision | Recommendation | Reason |
|---|---|---|
| Phase boundary | Approve | Terrain is Phase 5 and the MVP/UPD-002 deferred destination. |
| Cardinal 16-mask profile | Approve | Smallest complete deterministic autotile contract and direct Godot mapping. |
| Optional graph terrain | Approve | Preserves strict project.json schema v2 and character recipes. |
| Archive format 3 | Approve | Old readers fail closed instead of dropping unknown terrain. |
| Terrain-local palette | Approve | Avoids changing verified character token bytes before another producer proves shared semantics. |
| Built-in materials | Approve | Tests producer architecture without reopening humanoid pack authoring/profile contracts. |

## Not Included

Terrain packs/authoring, material transitions, diagonals/47-tile blobs, animated water, decorators, arbitrary map sizes/import, exported scenes/maps, structures/props, lighting maps, global token redesign, new engine adapters, and pixel editing.

## Authorization

The direct 2026-07-21 request authorizes selection, complete specification, documentation update, and implementation. `spec-approval.json` records this authority. Material changes discovered after lock require justified reopening; routine implementation choices within the contract do not.
