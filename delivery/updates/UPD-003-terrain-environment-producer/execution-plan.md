# UPD-003 Execution Plan

| Work package | Depends on | Gate |
|---|---|---|
| `WP-UPD003-SPEC` | None | Complete update envelope, deep review, approval, and lock validate. |
| `WP-UPD003-CONTRACTS` | SPEC | Strict terrain types/schema/materials/masks/renderers and baseline regressions pass. |
| `WP-UPD003-PERSISTENCE` | CONTRACTS | IndexedDB v4 and Electron complete-graph persistence pass revision/snapshot/conflict tests. |
| `WP-UPD003-ARCHIVE` | CONTRACTS | Archive-v3, character-only compatibility, old-reader, tamper, and cross-host contracts pass. |
| `WP-UPD003-EXPORT` | CONTRACTS | Generic/Godot terrain packages and pinned downstream fixture pass. |
| `WP-UPD003-UX` | PERSISTENCE, EXPORT | Terrain empty/workspace/export/removal/recovery UI passes shared and packaged flows. |
| `WP-UPD003-REGRESSION` | ARCHIVE, UX | All retained MVP/UPD-001/UPD-002 evidence passes with no character drift. |

## Execution Rules

- Implement in dependency order and validate after each edit slice.
- Preserve character-only hashes and archive bytes before adding adjacent behavior.
- Use the existing project revision and host bridge; no terrain-only persistence bypass.
- Do not implement any excluded transition, scene, pack, animation, editor, or adapter scope.
- Actual UI evidence owns status promotion.
