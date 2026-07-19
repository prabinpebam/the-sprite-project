# UPD-001 Binding Implementation Contract

This document resolves implementation choices that are load-bearing for the accepted UPD-001 promises. It is binding for web and Electron implementations. Repository-local function names may vary, but public behavior, canonical data, limits, error codes, state transitions, and evidence gates may not.

## 1. Authority and Compatibility Baseline

- Verified rollback baseline: `f29c9f9b8ea69df0f225f1b025b44cd7f30cc1bb` / `RUN-MVP-001`.
- Legacy browser source: localStorage key `the-sprite-project:mvp:project:v1` containing the verified `SpriteProject` schema version 1.
- New canonical project schema: version 2.
- Archive format, pack lock, and recipe schema versions evolve independently.
- UPD-001 supports project schema versions 1 and 2. Version 1 is read and migrated; writers emit version 2 only.
- A future unsupported major version is inspectable only to the safe summary extent defined by the archive contract and is never mutated.

## 2. Canonical Project Schema Version 2

Schema version 2 separates project metadata from recipe documents so the host-neutral core can eventually support more than one recipe without changing the archive shape. UPD-001 creates and edits exactly one active recipe; multiple-recipe UI remains outside this update.

### `project.json`

```ts
interface SpriteProjectV2 {
  schemaVersion: 2
  id: string
  name: string
  activeRecipeId: string
  recipeIds: string[] // UPD-001 requires exactly one item.
  packLocks: PackLockRef[]
  themePresetId: string
  theme: ThemeTokens
  preview: PreviewState
  createdAt: string // ISO 8601 UTC
  updatedAt: string // ISO 8601 UTC; non-semantic for parity
  revision: number // Non-negative safe integer; starts at 0.
}

interface PackLockRef {
  packId: string
  version: string
  sha256: string
}
```

### `recipes/<recipe-id>.json`

```ts
interface CharacterRecipeV1 {
  schemaVersion: 1
  id: string
  name: string
  packId: string
  selections: Record<SlotId, string | null>
  overrides: Partial<ThemeTokens>
}
```

### Invariants

1. `activeRecipeId` exists exactly once in `recipeIds` and resolves to one recipe file.
2. Every recipe `packId` resolves to an exact `packLocks` entry and `packs.lock.json` entry.
3. IDs are UUIDs for new records. Migrated baseline IDs are preserved even when they are not UUID-shaped.
4. `recipeIds` retain schema order. Object keys follow canonical JSON ordering.
5. Save and Save As preserve project and recipe identity. Only explicit Import as copy creates a new project ID.
6. Import as copy preserves recipe IDs because the project ID is the conflict boundary in UPD-001; a later multi-project merge feature would require a new collision policy.
7. `updatedAt` may change on save and is excluded from semantic and render parity. `revision` is repository concurrency metadata and is excluded from render parity but included in conflict evidence.
8. Host-only state listed by Project File Compatibility never enters either schema.
9. Pack locks change only after an explicit user action that switches or replaces a pack. Ordinary Save, Save As, host transfer, application update, and newly available pack versions preserve the exact lock.

### Canonical serialization

- One host-neutral package owns strict schemas, graph validation, canonicalization, and byte serialization. Web and Electron call the same package; host adapters may not implement independent JSON writers.
- Schemas reject unknown keys at every canonical object boundary. Host metadata is never silently stripped into a valid archive; serialization fails with `invalid-project` and names the offending path.
- Object keys sort by Unicode code point order. Arrays retain schema-defined order.
- Strings use JSON escaping with no ASCII-only conversion, UTF-8 without BOM, Unicode NFC where the field contract requires it, LF, and exactly one trailing LF.
- Numbers must be finite IEEE-754 values. Integers remain integers. Other numbers use ECMAScript shortest round-trippable JSON number serialization; negative zero serializes as `0`. NaN, Infinity, locale formatting, and application-level rounding during serialization are forbidden.
- No insignificant whitespace is emitted. Parsing and reserialization of a canonical value is byte-idempotent.
- Shared serializer fixtures include integer, decimal, exponent-boundary, negative-zero, escaped-control, non-ASCII, combining-character, object-order, and array-order cases. Both hosts must emit identical bytes and SHA-256 values.

## 3. Version 1 to Version 2 Migration

### Pure transformation

`migrateProjectV1ToV2` is a deterministic, side-effect-free function:

1. Validate the complete version 1 project before transformation.
2. Preserve project ID, name, theme, theme preset, preview, timestamps, character ID, character name, pack ID, selections, and overrides.
3. Move the version 1 `character` value into `recipes/<character.id>.json` and add `schemaVersion: 1`.
4. Set `activeRecipeId` and the sole `recipeIds` item to the preserved character ID.
5. Resolve the exact installed baseline pack version and checksum into one `PackLockRef`; fail closed if the exact baseline pack cannot be resolved.
6. Set project `schemaVersion` to 2 and `revision` to 0.
7. Validate the resulting project, recipe, and pack lock as one graph.
8. Render the migrated graph and require its frame, spritesheet, credits, animation metadata, and Godot metadata to equal the version 1 fixture.

### Legacy localStorage startup state machine

```text
NO LEGACY KEY -------------------------------> NORMAL START
     |
     v
PARSE + VALIDATE --failure--> MIGRATION BLOCKED (legacy bytes retained)
     |
     v
PURE V1->V2 TRANSFORM --failure--> MIGRATION BLOCKED
     |
     v
ONE IDB TRANSACTION: project + recipe + pack lock + migration backup + marker(pending)
     |
     v
READ BACK + SCHEMA + SEMANTIC + RENDER CHECK
     | failure                         | success
     v                                 v
ROLL BACK TRANSACTION             marker(verified)
legacy key retained               remove legacy project key
                                  retain raw backup in IndexedDB
                                  NORMAL START
```

### Trigger and recovery rules

- Migration runs on startup before the first project library is shown when the exact legacy key exists and no verified migration marker exists.
- The UI announces `Upgrading project storage` through a status region. The operation is automatic because it preserves the existing project and has no competing product choice.
- All new IndexedDB records and the pending marker are written in one transaction. A failed transaction commits nothing.
- Read-back comparison occurs before the legacy localStorage project key is removed.
- On success, raw source bytes and their SHA-256 remain in the IndexedDB migration record for 30 days or until the user exports a project backup after migration, whichever occurs first.
- On parse, validation, quota, transaction, or read-back failure, the legacy key remains unchanged and the new records are absent.
- Failure UI names the stage and stable error code and offers `Retry`, `Download recovery data`, and `Continue without opening the project`. Reset or deletion is never the default recovery action.
- `Download recovery data` downloads the untouched legacy JSON bytes. It does not claim to be a `.spriteproject` archive.
- Re-running a verified migration is a no-op. Re-running a pending or failed migration starts from untouched legacy bytes and replaces no current valid project.

### Migration record

The IndexedDB `migrations` store key is `legacy-localstorage-v1:<source-sha256>`. Its value is strict and contains:

```ts
interface LegacyMigrationRecord {
  id: string
  kind: 'legacy-localstorage-v1-to-project-v2'
  sourceKey: 'the-sprite-project:mvp:project:v1'
  sourceSha256: string
  status: 'pending' | 'verified' | 'failed'
  candidateProjectId: string
  createdAt: string
  completedAt: string | null
  failureCode: HostErrorCode | null
  failureStage: 'parse' | 'validate-v1' | 'transform' | 'write' | 'read-back' | 'parity' | null
  recoveryBytes: string
  recoveryExpiresAt: string | null
}
```

- The pending record, candidate graph, and recovery bytes commit together. There is no partially committed migration stage to resume.
- On startup with a pending record for the current source hash, validate and parity-check the committed candidate. If valid, mark verified and remove the legacy project key. If invalid, atomically delete the candidate graph, mark failed, and restart from untouched recovery bytes only after the user activates Retry.
- Pending records do not expire. Verified/failed recovery bytes expire 30 days after verification or after a successful post-migration archive export, whichever occurs first. Metadata without raw bytes remains for idempotency and diagnostics.
- A different legacy source hash creates a distinct migration ID and never overwrites a prior recovery record.
- IndexedDB is origin-scoped. Cross-browser profiles and browsers migrate independently and make no cross-device claim.

## 4. Web Repository and Revision Contract

### IndexedDB version 1 stores

| Store | Key | Binding contents |
|---|---|---|
| `projects` | project ID | project v2 document and current revision |
| `recipes` | project ID + recipe ID | recipe v1 document |
| `snapshots` | project ID + revision | prior known-good project graph, reason, created time |
| `packs` | pack ID + version | manifest, provenance, checksum, install state |
| `packBlobs` | SHA-256 | imported or installed binary content and reference count |
| `migrations` | migration ID | state, source hash, raw recovery bytes, diagnostics, completion time |
| `settings` | setting key | structured non-project preferences |

### Autosave and optimistic concurrency

- A meaningful project-data edit immediately sets `Unsaved` and schedules save after 750 ms without another meaningful edit.
- Meaningful fields are project name; theme preset and theme tokens; recipe name, selected pack, selections, and overrides; and preview animation, direction, speed, zoom, and playing state. Every mutation to these fields resets the quiet-period timer and rapid edits coalesce into one save.
- Navigation selection, panel expansion, focus, hover, active dialog, playback phase/timer, generated pixels, transient errors, storage estimates, and other host/UI state are not project edits and do not schedule save.
- Manual Save, archive export, navigation requiring a clean state, and window close flush pending edits immediately.
- A save transaction receives `expectedRevision`. It reads the current revision inside the same read-write transaction.
- Equal revision: snapshot the prior graph, write the new graph, increment by one, update indexes, commit, read back, then announce `Saved`.
- Mismatch: write nothing and return `revision-conflict` with expected and actual revisions.
- The web repository uses IndexedDB database `the-sprite-project-workspace-v1`. Web hosts use BroadcastChannel `the-sprite-project-project-revisions-v1` to announce committed project ID and revision to other same-origin tabs. GitHub Pages repository paths share an origin, so the product-specific database and channel names are mandatory. The transaction comparison remains the source of truth when messages are missed.
- Revision values are non-negative safe integers and never derive from wall-clock time.

### Revision conflict choices

The conflict dialog names the project and both revisions and provides:

- `Reload newer version`: discard only the conflicting in-memory attempt after a second confirmation when it contains unsaved edits; load the stored revision.
- `Overwrite with my version`: retry against the actual revision and create a named pre-overwrite snapshot of the stored graph.
- `Save as copy`: generate a new project ID and suggested name `<name> (conflict copy)`; preserve the original.
- `Cancel`: keep the current in-memory dirty state and write nothing.

No option is preselected. Focus enters the dialog heading, Tab reaches every choice, Escape performs Cancel, and closing the dialog restores focus to the control that initiated save.

## 5. Snapshot and Quota Policy

### Snapshot creation and retention

- Every successful replacement of a valid project graph snapshots the prior graph.
- Named checkpoints are also created before migration, pack-lock replacement, conflict overwrite, archive Replace, and destructive recovery.
- Keep the newest 20 snapshots per project and snapshots no older than 30 days.
- Always retain at least one last-known-good snapshot when a project has been saved more than once.
- Named migration, pack replacement, conflict overwrite, and archive Replace checkpoints are protected until a newer project backup is exported or 30 days pass.
- Retention cleanup occurs after a successful save transaction; cleanup failure cannot turn a successful project save into failure.

### Quota thresholds and eviction

- Show a warning when `usage / quota >= 0.80` or the pending write would cross 0.80.
- Enter critical mode at `usage / quota >= 0.90` or after `QuotaExceededError`.
- Evict only in this order: generated caches; unreferenced official pack blobs; snapshots outside retention policy; oldest unprotected snapshots above the one-per-project floor.
- Never evict current projects, current recipes, referenced exact packs, user-owned imports, provenance, migration recovery bytes within retention, or the last-known-good snapshot.
- If safe eviction cannot make room, block the write, retain dirty state, and show `Storage is full` with `Clear disposable data`, `Export project backup`, and `Cancel`.
- `Clear disposable data` previews categories and byte estimates before activation and reports exact categories removed.

## 6. Archive and Imported-Content Limits

Archive format version 1 uses these hard reader limits on both hosts:

| Limit | Value |
|---|---|
| Compressed archive bytes | 128 MiB |
| Entry count | 512 |
| Individual JSON or text entry | 8 MiB |
| Individual binary entry | 64 MiB |
| Total uncompressed bytes | 256 MiB |
| Compression ratio per entry and total | 100:1 |
| Relative path UTF-8 length | 240 bytes |
| Path depth | 8 segments |

Readers reject before project mutation when any limit is exceeded. Readers also reject encrypted entries, symlinks, absolute paths, dot segments, case-folded duplicate paths, unlisted entries, unsupported compression, bad signatures, bad checksums, malformed JSON, non-finite numbers, unsupported required extensions, and unsupported future major versions.

Validation order is central directory and container profile, paths and duplicates, declared sizes and expansion limits, streamed extraction with running limits, media signatures, checksums, schemas, graph references, pack availability, then semantic summary. A failed stage returns a stable error and preserves source bytes.

Required adversarial fixtures are `path-traversal`, `absolute-path`, `case-fold-duplicate`, `symlink-entry`, `encrypted-entry`, `too-many-entries`, `oversized-entry`, `oversized-total`, `excessive-ratio`, `checksum-mismatch`, `unlisted-entry`, `malformed-json`, `malformed-media`, `future-archive`, `future-project`, and `required-extension`.

Strict-schema leakage fixtures add browser object URLs, IndexedDB keys, absolute paths, drive letters, recent IDs, permission/grant IDs, window geometry, export destinations, and cache fields to each canonical object boundary and require `invalid-project` before serialization.

## 7. Archive Import Conflict Semantics

Conflict means the validated archive `projectId` equals an existing repository project ID.

- `Replace`: create a named `archive replace` snapshot of the existing graph, atomically replace canonical project/recipe/pack-lock data, preserve existing snapshots and the project ID, and update `updatedAt` and revision. The confirmation names the existing project and states that current data will be replaced while recovery history remains.
- `Import as copy`: create a new project ID, preserve recipe IDs, suggest `<name> (imported copy)`, create revision 0, and leave the existing project and all snapshots unchanged.
- `Cancel`: commit nothing and retain the source archive unchanged.

The visible choices are `Replace existing project with imported version (current work is kept as a recovery checkpoint)`, `Import as new project (creates a copy)`, and `Cancel`.

No conflict action is preselected. The summary shows source host/build, project name/ID, schema migration, exact packs, imported-content size, warnings, and the chosen action before commit.

## 8. Desktop Folder and External-Modification Contract

The canonical folder root contains `archive-manifest.json`, `project.json`, `packs.lock.json`, `recipes/`, `imported/`, `provenance/`, and `README.txt`. `exports/` and `.sprite-cache/` are non-portable. `sprite-project.json` is not a valid alternate filename.

On open, Electron records a `ProjectFingerprint` containing `manifestSha256`, computed from the canonical `archive-manifest.json` bytes, plus a path-to-SHA-256 map for every manifest-listed payload entry. The manifest does not list or checksum itself, so this definition is non-recursive. `exports/`, `.sprite-cache/`, and `.sprite-recovery/` are excluded. Before Save, Electron re-reads and compares the on-disk fingerprint. Save As computes a fresh fingerprint only after the new destination passes read-back validation.

- Equal fingerprint: write a complete sibling temporary payload, validate, flush files and directory where supported, then replace canonical entries. Update the in-memory fingerprint only after read-back.
- Mismatch: return `external-modification` and write nothing.
- Missing folder: return `path-missing` and keep the project dirty.
- Save As: write a complete new folder; existing non-empty destinations require explicit Replace or Cancel. Replace uses a sibling temporary folder and preserves the source folder.

External-modification choices are `Reload disk version`, `Overwrite from this window`, `Save As`, and `Cancel`. Overwrite creates a recovery copy of the disk payload beside the project as `.sprite-recovery/<UTC-timestamp>/` before replacement. Recovery copies are host-only and excluded from archives.

## 9. Electron Renderer Bridge Contract

The renderer receives one frozen `window.spriteHost` object through `contextBridge`. It never receives raw paths as authority, `ipcRenderer`, `fs`, shell, process, or arbitrary channel access.

```ts
type HostResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: HostError }

interface HostError {
  code: HostErrorCode
  message: string
  operation: string
  recoverable: boolean
  details?: Record<string, string | number | boolean>
}

interface ApprovedLocation {
  grantId: string // Opaque, random, session-scoped capability.
  displayPath: string // Display only; never accepted back as authority.
  kind: 'project-folder' | 'project-file' | 'export-directory'
}

interface SpriteHostBridge {
  getHostInfo(): Promise<HostResult<HostInfo>>
  listRecentProjects(): Promise<HostResult<RecentProject[]>>
  openRecentProject(recentId: string): Promise<HostResult<OpenedProject>>
  forgetRecentProject(recentId: string): Promise<HostResult<void>>
  chooseProjectFolder(mode: 'create' | 'open' | 'save-as'): Promise<HostResult<ApprovedLocation | null>>
  chooseProjectFile(mode: 'open' | 'save'): Promise<HostResult<ApprovedLocation | null>>
  chooseExportDirectory(): Promise<HostResult<ApprovedLocation | null>>
  readProject(sourceGrantId: string): Promise<HostResult<OpenedProject>>
  saveProject(request: SaveProjectRequest): Promise<HostResult<SavedProject>>
  inspectArchive(sourceGrantId: string): Promise<HostResult<ArchiveSummary>>
  writeArchive(request: WriteArchiveRequest): Promise<HostResult<WrittenArchive>>
  writeExport(request: WriteExportRequest): Promise<HostResult<WrittenExport>>
}
```

Internal channels are constants: `host:get-info`, `recent:list`, `recent:open`, `recent:forget`, `dialog:project-folder`, `dialog:project-file`, `dialog:export-directory`, `project:read`, `project:save`, `archive:inspect`, `archive:write`, and `export:write`. The preload owns those names; renderer code cannot construct a channel.

### Validation and authority

- Every request and response is validated in the main process against a shared schema. Unknown keys and unknown channel names are rejected.
- Dialog cancellation returns `{ ok: true, value: null }`, not an error.
- Approved locations are issued only from a native user gesture or a validated recent-project record. Grants expire when the window closes and are scoped to one operation class.
- Renderer-supplied display paths are ignored. Main-process operations resolve only opaque grants.
- Within a project grant, only documented canonical relative paths, host-only output/cache paths, and sibling temporary/recovery paths may be accessed.
- Existing path components are resolved and checked for reparse-point or symlink escape. Archive entries never create links. A root explicitly selected by the user may reside on a local, removable, or network filesystem, but unavailable atomic-replace semantics return `atomic-replace-unavailable` before modifying the destination.
- Project graph IPC payload limit is 16 MiB. Export requests allow at most 128 entries, 64 MiB per entry, and 128 MiB total. Binary values are length-checked before allocation and again while writing.
- Main blocks unexpected navigation and window creation. Explicit `https:` source links use a controlled external-open handler after user activation; all other schemes are rejected.
- Recent folders are stored atomically in Electron `userData/host-settings.json`, capped at 10, and contain only recent ID, display path, and last-opened time. They never enter project data.
- Recent records are validated when activated, not trusted from settings. Missing paths return `path-missing`; invalid projects return `invalid-project`; both keep the record visible with `Retry` and `Remove from recent`. Startup may mark a record unavailable but does not silently remove it.

## 10. Stable Error Taxonomy

Both hosts map internal exceptions to these product codes. UI copy may add context but must preserve the code in diagnostics.

| Code | Meaning | Required response |
|---|---|---|
| `cancelled` | User cancelled an operation | No mutation; return focus |
| `invalid-payload` | Request shape or size invalid | Reject before side effect |
| `invalid-project` | Project graph violates schema/invariant | Name invalid area; preserve source |
| `unsupported-version` | Future or unsupported version | Name required/current version; preserve source |
| `missing-pack` | Exact required pack unavailable | Block deterministic render/export; offer resolution |
| `revision-conflict` | Web expected revision is stale | Reload, overwrite, save copy, or cancel |
| `external-modification` | Desktop canonical files changed after open | Reload, overwrite with recovery, Save As, or cancel |
| `path-not-approved` | Operation is outside grant authority | Reject; ask user to choose location |
| `path-missing` | Approved source no longer exists | Keep dirty state; choose again/remove recent |
| `path-conflict` | Destination exists or is non-empty | Replace or cancel after explicit summary |
| `permission-denied` | Filesystem/browser denied access | Preserve state; choose another location or retry |
| `storage-full` | Browser or filesystem lacks capacity | Preserve dirty state; cleanup/export/choose another location |
| `archive-invalid` | Container, checksum, schema, or media invalid | Name validation stage; preserve archive |
| `archive-limit` | A binding safety limit was exceeded | Name limit and observed value; preserve archive |
| `atomic-replace-unavailable` | Destination cannot guarantee safe replacement | Write nothing; choose supported location |
| `io-failed` | Other read/write failure | Preserve last-known-good state and diagnostic context |

Catch-all handlers may prevent process crashes but cannot collapse these outcomes into a generic message.

## 11. Interaction and Accessibility Contract

- Target applicable WCAG 2.2 AA behavior in both hosts.
- Use native HTML controls first. Custom composite widgets follow the matching WAI-ARIA Authoring Practices keyboard pattern.
- All controls are reachable without pointer input. DOM, reading, and Tab order follow the visible task order.
- Focus is always visible and is distinct from selection. Opening a dialog moves focus to its heading or first safe control; closing restores focus to the trigger. Deleting a list item moves focus to the next item or list heading.
- Escape cancels modal dialogs. Enter activates the focused primary command only when doing so cannot silently select a destructive option. Arrow keys move within radio groups; Tab leaves the group.
- In the unsaved-close dialog, `Save` is the initial primary command and Enter activates it, `Discard` is visually and semantically destructive but never the default, and `Cancel` is activated by Escape.
- Save-status, migration, offline, import-validation, and write-result changes use programmatic status announcements without stealing focus.
- Error messages identify the affected field/file/project, state the stable error code in diagnostics, and provide a next action. Input is retained after validation failure.
- State is never conveyed by color alone. Text and non-text UI contrast meet AA; content reflows at 200% zoom without two-dimensional scrolling except the pixel canvas/tool surface where both-axis panning is essential.
- Pointer targets meet 24 by 24 CSS pixels minimum and aim for 44 by 44 on primary touch actions.
- Reduced-motion mode removes non-essential animation. No content flashes more than three times per second.
- Keyboard acceptance covers every new flow, including library actions, migration recovery, snapshot restore, conflict choices, import, folder operations, export, and unsaved close.

## 12. Distribution and Release Artifact Contract

- Web verification runs against the actual GitHub Pages repository subpath and service-worker scope, not a root-hosted substitute.
- The versioned static pack index marks each shipped pack `bundled: true|false`. Bundled packs are precached with the app shell. A non-bundled pack is offline-installed only after its exact manifest, provenance, and referenced blobs pass checksum validation and commit to the local pack stores; an archive-embedded pack is available only to projects whose lock references that embedded content.
- Before entering or testing offline work, project readiness compares every exact pack lock with bundled, installed, or embedded local records. The UI reports `Ready offline` only when all locks resolve locally; otherwise it names each unavailable pack and blocks deterministic render/export without silently substituting another version.
- Portable artifact name: `the-sprite-project-<version>-windows-x64-portable.zip`.
- Release includes `the-sprite-project-<version>-windows-x64-portable.zip.sha256` containing the lowercase SHA-256 and filename.
- Release notes state Windows x64 support, portable/no-install behavior, unsigned SmartScreen expectation, exact bypass steps (`More info` then `Run anyway`), source/build provenance, and manual upgrade/rollback steps.
- The portable ZIP contains no mutable user project data. Replacing the extracted app directory does not move or delete project folders.
- A clean supported Windows x64 machine must launch the extracted executable without administrator rights. The release gate records OS build, artifact hash, app version, launch result, and SmartScreen observation.
- Electron artifacts are independently withdrawable. Web rollback deploys the known-good build while retaining schema readers and migration recovery needed to avoid stranding data written by the withdrawn build.

## 13. Implementation Sequence

1. Shared schemas, parsers, canonical serializer, migration, error taxonomy, and fixtures.
2. Host-neutral repository/archive/export contracts and contract tests.
3. IndexedDB repository, migration state machine, snapshots, conflicts, and quota recovery.
4. Web library/storage/import UI and PWA lifecycle.
5. Electron main/preload shell and opaque-grant contract.
6. Desktop folder/archive/export adapters and external-modification recovery.
7. Cross-host parity harness and all affected baseline regressions.
8. Packaged release, actual Pages verification, clean-machine launch, rollback rehearsal, and evidence promotion.

No package may promote a flow or expected behavior to `verified` without generated actual-UI evidence on its declared host.