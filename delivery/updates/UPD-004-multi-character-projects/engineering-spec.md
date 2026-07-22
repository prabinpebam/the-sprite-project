# UPD-004 Engineering Specification

## 1. Domain Invariants

`SpriteProjectV2.recipeIds` has 1–16 unique identifiers. Update `projectV2Schema` from `.length(1)` to `.min(1).max(16)` and validate uniqueness plus inclusion of `activeRecipeId`. `ProjectGraphV2.recipes` has exactly the same keys. Each recipe key equals `recipe.id`. Character names are NFC-normalized after trim, 1–80 characters, and unique by `toLocaleLowerCase('en-US')` on normalized names.

No schema version changes. Existing one-character bytes remain valid. A multi-character graph is rejected by prior `.length(1)` readers before repository mutation.

## 2. Host-Neutral Operations

Add pure operations in `project-v2.ts`:

- `activeRecipe(graph)` returns the active recipe.
- `createCharacter(graph, name, activePack, now, id)` requires `activePack.id` to equal the active recipe pack ID and its version/document hash to match the existing project lock, then creates safe pack defaults and appends/activates. It never adds a new pack ID or lock.
- `duplicateCharacter(graph, sourceId, name, now, id)` deep-copies the source pack ID, selections, and overrides. Complete output validation also proves the source pack lock exists; stale or missing lock throws `invalid-project` before mutation.
- `renameCharacter(graph, recipeId, name, now)` changes only the named recipe.
- `activateCharacter(graph, recipeId, now)` changes only active ID and project timestamp.
- `removeCharacter(graph, recipeId, now)` enforces minimum one and deterministic fallback.
- `legacyProjection(graph, recipeId?)` projects a requested/active recipe.
- `applyLegacyProjection` replaces only the projected active recipe, preserves siblings/terrain, and merges rather than replaces pack locks.

All operations parse output through strict graph validation. IDs and timestamps are injectable for deterministic tests. Validation failures throw `ProductError` before mutation using `invalid-character-name` for blank, over-80, or duplicate normalized names; `character-limit` for a seventeenth recipe or sole-recipe deletion; `invalid-project` for missing recipe IDs; and `pack-in-use` for an exact-lock conflict.

## 3. Pack Locks

Every recipe pack ID must resolve to exactly one project lock. Character creation reuses the active recipe’s pack and lock; duplication copies its source pack ID. The existing active-character pack switch may append a lock for a new pack ID. A different lock for an existing pack ID is allowed only when no sibling recipe uses that pack ID; otherwise it throws `pack-in-use` before mutation. `applyLegacyProjection` merges the supplied active lock with sibling locks instead of replacing the array. Unreferenced locks may remain; cleanup is not part of this update.

## 4. Persistence

The existing IndexedDB `recipes` store remains keyed by `[projectId, recipeId]`. Create/save transactions write every listed recipe and delete any existing by-project recipe row whose ID is no longer listed. Project, recipes, terrain, snapshots, embedded packages, and revision commit or abort together.

Electron continues deriving folder entries from the complete archive payload. On save, the existing atomic folder replacement writes only the newly generated canonical inventory, so removed `recipes/*.json` entries disappear with the prior canonical folder. A project folder is app-owned canonical content; preserving unrelated files inside it is not promised. On open, only manifest-inventoried entries participate, and no cleanup occurs until a successful save.

## 5. Archive And Rollback

Archive v1/v2/v3 selection remains based on embedded packs and terrain, not recipe count. `project.json.recipeIds` preserves collection/creation order. Archive payload and manifest entries use the existing canonical UTF-8 path sort; each recipe filename is `recipes/<id>.json`. Readers validate in this order: container bounds/paths; manifest inventory against actual files and checksums; strict `project.json` including unique IDs and active inclusion; exactly one `recipes/<id>.json` for every listed ID; no orphan recipe file; strict recipe bodies whose IDs equal their keys; complete graph equality; then return. Any failure rejects the entire archive before graph return or repository mutation.

Rollback preserves project and all recipe entries byte-for-byte. Current single-character readers reject multi-character project schema before graph return.

## 6. UI State

`graph.project.activeRecipeId` is the sole active-character source of truth; do not add a second selected-character state. The existing `legacyProjection(graph)` then resolves active state consistently. Collection dialogs use transient name drafts and never serialize invalid text.

Character CRUD increments edit version, marks dirty, announces the exact result, and uses existing autosave/conflict/snapshot handling. Every strict recipe contains all six fixed slot keys, so switching preserves the current selected composition slot unconditionally. Preview settings remain project-level.

## 7. Capacity And Performance

- 1–16 recipes per project.
- Name 1–80 characters after trim/NFC.
- Switching and visible active render p95 <=50ms across 100 switches in the same test-owned local Chromium and packaged Electron environments recorded by the evidence run.
- Save/reopen of 16 ordinary recipes <=2s in those recorded environments.
- Existing archive global limits remain binding.

Performance artifacts record OS, architecture, CPU model/logical count when available, memory, Chromium/Playwright/Electron versions, viewport, and local-I/O conditions. The minimum supported evidence environment is Windows 10+, x86-64 CPU >=2 GHz, >=8 GiB RAM, Chromium >=120, and no remote operations.

## 8. Security And Failure

Recipes remain bounded strict JSON with no path, URL authority, executable content, or new IPC. User names never become file paths; IDs own recipe filenames. Invalid names, missing packs, stale revisions, quota/I/O failure, and malformed archives write nothing and retain the in-memory or last committed graph.