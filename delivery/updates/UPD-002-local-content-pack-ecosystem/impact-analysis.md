# UPD-002 Impact Analysis

## Baseline

- Revision: `4e890b082d4df3b2758cdcc27f7f905bfee3afe0`
- Evidence: `RUN-UPD001-001`
- Lifecycle: UPD-001 is implemented locally; actual Pages and clean-machine release gates remain.
- Lock: `LOCK-UPD-001-002` remains intact. UPD-002 is additive and does not reopen its settled product semantics.

## Product Record Impact

| Classification | Surface | Required action |
|---|---|---|
| Retained | Dual-host local-first promises, project library, autosave, migration, snapshots, quota recovery, conflicts, project archives, offline, desktop files, direct generic/Godot export, unsaved close, cross-host parity, data custody | Reference baseline and run affected regressions on both hosts |
| Added | Local pack install, validation, library, version lifecycle, dependency recovery, guided authoring, draft recovery, deterministic pack export, self-install, offline packs, pack cross-host transfer | Full promise-to-evidence derivation in `traceability.json` |
| Changed implementation, retained oracle | Renderer and credits accept bundled code-defined assets plus installed PNG-backed assets through one runtime contract | Prove existing bundled output hashes remain unchanged and authored assets use no renderer branch |
| Changed compatibility boundary | `.spriteproject` embeds non-bundled required packs and prevents older readers from dropping them | Add archive format version 2 for projects with embedded local packs; retain v1 for bundled-only projects |
| Changed Electron bridge | Pack file selection, install repository, list/read/remove, and pack write require narrow new methods | Version the frozen bridge contract; preserve all 12 existing methods and add only named pack methods |
| Added data | Pack manifests, package bytes, installed version records, content-addressed PNGs, provenance records, and pack drafts | Define ownership, retention, limits, migration, and deletion semantics |
| Unaffected | Project schema version 2, recipe schema version 1, current slot IDs, project revisions, snapshot policy, generic and Godot semantic output contracts | No schema bump; regression required when code paths are touched |
| Unaffected | Terrain, scenes, structures/props, manual pixel editing, material maps, live links, cloud/collaboration | Explicit exclusions remain outside UPD-002 |

## Architecture Impact

### Shared core

Add strict schemas and canonical serialization for `SpritePackManifestV1`, `ContentPackV2`, `PackAssetV2`, `PackProvenanceV1`, `PackDraftV1`, validation reports, license profiles, and installed-pack records. Add one PNG-backed runtime asset implementation behind the existing selected-asset/render/export behavior.

### Web

Extend the IndexedDB workspace with pack-version, pack-blob, pack-draft, and draft-asset records. Install and remove are transactional. Service-worker/offline readiness is based on repository checksums, not network cache assumptions.

### Electron

Extend the frozen preload through versioned, narrow pack operations. Main validates packages and owns atomic `userData/packs/v1` storage. Renderer display paths never authorize pack reads or writes. Pack drafts remain in the renderer's local draft repository; exporting or installing crosses the bridge only through validated bounded payloads or user-approved pack grants.

### Project portability

Projects using only bundled packs continue writing archive format v1. Projects requiring non-bundled content write archive format v2 and embed complete `.spritepack` bytes by package checksum. Older hosts reject v2 before mutation. Current hosts may use embedded content for that project without silently installing it globally.

Opening project archive v2 validates every embedded package synchronously within the import/open validation phase before project graph resolution or repository mutation. Valid embedded packages remain project-scoped (`embedded-project`), are available offline to that project, and are not added to the global pack library unless the user explicitly chooses Add to pack library. An exact globally installed package may deduplicate runtime cache work but never removes or rewrites embedded source bytes on unedited re-save.

## Regression Obligations

- Bundled Wayfarer and Harbor render, generic/Godot export, credits, archive hashes, and cross-host behavior remain unchanged.
- All UPD-001 security guarantees remain: context isolation, no Node renderer authority, opaque grants, strict schemas, limits, and navigation controls.
- Existing projects open without migration and keep exact locks.
- Project archive v1 remains readable/writable for bundled-only projects.
- Quota, snapshot, conflict, offline, failure, and rollback paths include installed pack data where applicable.

## Rollout / Rollback

- Feature ships only after the spec is approved and UPD-001 entry condition is satisfied or rescheduled explicitly.
- Web and Electron release together because authored pack projects rely on shared format v2 support.
- Rollback keeps readers for `.spritepack` v1, `ContentPackV2`, project archive v2, and installed repository records even if authoring UI is disabled.
- Withdrawing authoring must not remove installed packs, embedded project content, drafts, or source recovery data.
