# UPD-004 Impact Analysis

| Surface | Classification | Required action |
|---|---|---|
| Character composition, preview, theme overrides, export | Retained and affected | Bind every existing active-character flow to the selected recipe and regress unchanged output semantics. |
| `ProjectGraphV2.recipes` and `recipeIds` | Changed cardinality | Accept 1–16 unique recipes; active ID must be a listed recipe. |
| `project.json` schema version 2 | Retained | No fields change; the previously reserved array supports multiple IDs. |
| `CharacterRecipeV1` | Retained | Each character remains one strict recipe document with stable ID and name. |
| IndexedDB `recipes` store | Retained and affected | Save all listed recipes and delete removed recipe rows atomically. |
| Electron folder projects | Retained and affected | Continue one `recipes/<id>.json` file per character; removed files disappear only on successful atomic save. |
| `.spriteproject` archive v1/v2/v3 | Retained and affected | Inventory every listed recipe. Current single-character readers reject multi-character project schema before mutation. |
| Project theme and preview settings | Retained | Theme preset/tokens and preview controls remain project-level; per-character overrides stay recipe-local. |
| Pack locks | Retained and affected | Preserve locks used by sibling recipes; one exact lock per pack ID remains project-wide. |
| Terrain document and exports | Retained | Terrain remains optional and project-level; character collection edits do not change terrain bytes or hashes. |
| Existing project save/autosave/snapshot/conflict lifecycle | Retained | A save is one atomic project revision even though recipe records/files are separate. |

## Migration And Compatibility

- Existing one-character projects already satisfy the new 1–16 invariant and require no rewrite.
- Multi-character data uses existing schema versions and paths; no archive or database version increase is required.
- An older single-character reader fails strict project validation before returning or storing a graph.
- Removing a character must delete its IndexedDB row or folder entry in the same successful transaction/write plan as the new project manifest.
- Rollback readers must preserve every recipe entry even if the collection UI is disabled.