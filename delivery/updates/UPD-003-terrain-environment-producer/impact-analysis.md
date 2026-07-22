# UPD-003 Impact Analysis

## Baseline Classification

| Surface | Classification | Consequence and required action |
|---|---|---|
| Verified MVP character promises and 12 flows | Retained | No semantic changes. Run the complete browser/Godot regression suite. |
| UPD-001 web project library, IndexedDB revisions, snapshots, desktop folders, direct exports, cross-host portability | Retained and affected | Terrain joins the graph and must use the same transaction, fingerprint, conflict, and unsaved-close behavior. Fresh evidence required. |
| UPD-002 humanoid pack install/author/lifecycle/runtime | Retained | Terrain does not enter `.spritepack` v1 or `ContentPackV2`; all pack flows regress unchanged. |
| Project `project.json` schema version 2 | Retained | No terrain fields are added. Existing strict bytes remain valid. |
| `ProjectGraphV2` envelope | Changed | Adds optional `terrain: TerrainDocumentV1 | null`. Missing terrain normalizes to null only in memory. |
| `.spriteproject` archive formats 1 and 2 | Retained | Character-only writers continue existing format selection and entries. |
| `.spriteproject` archive format 3 | Added | Terrain projects add `terrain.json`; old readers reject literal version 3 before mutation. |
| Generic and Godot character exports | Retained | Existing output files and hashes are unchanged. Terrain has separate commands/packages. |
| Project theme | Retained | Existing six character tokens stay byte-identical. Terrain derives local defaults but stores its own four colors. |
| Provenance and credits | Extended | Built-in procedural terrain carries one deterministic CC0 source record; terrain exports include only the chosen material. |
| Electron bridge | Retained | Existing project graph and export-entry methods are sufficient; no new IPC channel or path authority. |
| Pack repositories and embedded package behavior | Unaffected | Terrain is built in and has no package bytes or lock in this update. |

## Migration

- Existing project graphs without `terrain` parse as `{ terrain: null }` in memory.
- Existing stored project/recipe records require no database rewrite.
- The web repository adds no terrain-specific store; terrain commits atomically with `project` through a strict serialized graph payload held in a new project companion store only if required by implementation. The selected implementation keeps terrain inside the graph transaction and adds one `terrainDocuments` object store keyed by project ID so existing `projects` values remain strict schema-v2.
- Electron folder projects add `terrain.json` only when terrain exists.
- Archive-v3 import validates container, manifest, terrain checksum, terrain schema, then graph before repository mutation.

## Compatibility Policy

1. Character-only graphs, archives, render hashes, generic exports, Godot exports, and credits remain byte-compatible where already guaranteed.
2. Terrain is optional and cannot block character editing or character-only export.
3. Terrain export is separately ready/blocked.
4. Old hosts reject terrain archive version 3 before extraction/mutation.
5. A terrain project copied or restored preserves the terrain document through existing project semantics.

## Security and Privacy

No new remote input, URL fetch, executable format, account, analytics, filesystem authority, or backend is added. Terrain is generated from bounded local JSON state and fixed code-owned material definitions.

## Rollback

A withdrawn UI must retain archive-v3 and `TerrainDocumentV1` readers. Terrain may become read-only, but project open/export-backup must preserve `terrain.json`; no rollback deletes terrain state, character state, packs, snapshots, or recovery data.
