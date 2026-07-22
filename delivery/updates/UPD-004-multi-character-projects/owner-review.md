# UPD-004 Product-Owner Review Brief

## Recommendation

Approve and implement **Multi-character projects**. The graph, IndexedDB recipe store, folder paths, and archive inventory already reserve multiple recipes. This update activates that architecture with a bounded character collection and closes the isolation, deletion, recovery, active-context, and compatibility semantics.

## Promise

A developer can keep up to 16 named characters in one project, edit and serialize each recipe independently under one atomic project save, recover destructive changes, and transfer the complete cast between web and Electron without terrain or sibling drift.

## Locked Boundary

- 3 customer promises, 6 scenarios, 12 capabilities, 7 flows, and 25 objective behaviors.
- One active character; project theme/preview shared; recipe selections/overrides local.
- Existing project/recipe/archive/terrain/pack versions and 18-method Electron bridge retained.
- Flat creation-order collection; active-only character export.
- Folders/tags/reorder, batch export, scenes, per-character project themes, recipe import/merge, collaboration, and unbounded collections excluded.

The direct 2026-07-22 request is the decision authority recorded in `spec-approval.json`.