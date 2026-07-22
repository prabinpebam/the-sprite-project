# UPD-003 Change Proposal

## Request

On 2026-07-21 the product owner asked: **“What's the next set of stuff we should be adding to the MVP scope? Detail it out properly as per the guideline here and update it in the spec and implement it completely.”**

## Product Problem

The current product proves one real producer, characters, and an independent local content ecosystem. The next unresolved North Star risk is whether a structurally different producer can join the same project, theme, storage, archive, export, provenance, offline, and dual-host systems without turning them into character-specific abstractions.

## Recommended Increment

Add a bounded **Terrain Environment Producer**:

- one optional terrain document per project;
- one complete 16-mask cardinal autotile profile at 32px;
- four deterministic built-in procedural materials: grass, dirt, sand, stone;
- one fixed 12×8 paintable preview map;
- four terrain-local palette roles initially derived from the existing project theme;
- generic atlas/manifest/credits export and Godot terrain metadata;
- IndexedDB, Electron, offline, archive-v3, and cross-host parity.

## Why This Is Next

- The roadmap names terrain as Phase 5 and the second real producer.
- The MVP scope ledger routes `OUT-TERRAIN` to Phase 5.
- UPD-002 deliberately excluded terrain until pack ecosystem evidence existed; that evidence now exists.
- Terrain differs enough from character layers to test whether project, theme, archive, provenance, and export contracts are truly shared.

## Alternatives Considered

| Alternative | Result | Reason |
|---|---|---|
| Add structures and props first | Rejected for this increment | Perspective, anchors, depth, and part composition do not test autotiling or ground coverage. |
| Add a scene editor with terrain | Rejected | A scene graph is premature with only character and ground producers and would multiply scope. |
| Add external terrain packs and authoring | Deferred | Prove the terrain producer and profile before generalizing `.spritepack` beyond humanoid content. |
| Add animated water and transitions | Deferred | Animation and material-pair transitions are independent contracts beyond static cardinal autotiling. |
| Add another engine adapter | Rejected | It does not test the second-producer architecture and has its own target and rollback boundary. |

## Decision Authority

The direct user request authorizes selecting the roadmap’s next bounded increment, completing its formal product-update specification, and implementing it. The accepted decisions are recorded in `traceability.json`, `decisions.md`, and `spec-approval.json`.
