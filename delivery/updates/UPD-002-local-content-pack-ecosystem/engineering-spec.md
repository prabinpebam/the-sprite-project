# UPD-002 Binding Engineering and Architecture Specification

This document resolves implementation decisions required by UPD-002. Names internal to modules may vary, but public behavior, formats, schemas, paths, limits, state transitions, trust boundaries, migration, errors, and evidence gates may not.

## 1. Authority and Version Dimensions

- Baseline: `4e890b082d4df3b2758cdcc27f7f905bfee3afe0` / `RUN-UPD001-001`.
- Existing project schema remains version 2.
- Existing recipe schema remains version 1.
- Pack container format begins at `packFormatVersion: 1`.
- Runtime pack schema becomes `packSchemaVersion: 2` for both bundled adapters and installed packs.
- Pack draft schema begins at `draftSchemaVersion: 1` and never enters projects or distributed packs.
- Project archive format v1 remains canonical for bundled-only projects.
- Project archive format v2 is required only when non-bundled pack packages are embedded.
- Versions are independent. A host never infers one from another or from application version.

## 2. Runtime Pack Model

```ts
type PackOrigin = 'bundled' | 'installed-local' | 'authored-local' | 'embedded-project'
type PackSubjectProfile = 'humanoid-lpc-64'

type RuntimeAssetSource =
  | { kind: 'primitive-v1'; parts: PixelPart[] }
  | {
      kind: 'sheet-v1'
      pngSha256: string
      sheetPath: string
      width: 256
      height: 512
      sourceColorBindings: Record<HexRgb, FixedColorBinding | TokenColorBinding>
    }

interface FixedColorBinding { kind: 'fixed' }
interface TokenColorBinding { kind: 'token'; token: TokenId; shade: -2 | -1 | 0 | 1 | 2 }

interface PackAssetV2 {
  schemaVersion: 2
  id: string
  name: string
  slot: SlotId
  description: string
  source: RuntimeAssetSource
  coverage: ['idle', 'walk']
  provenanceId: string
}

interface ContentPackV2 {
  packSchemaVersion: 2
  id: string
  version: string
  name: string
  description: string
  subjectProfile: 'humanoid-lpc-64'
  assets: PackAssetV2[]
  defaults: Record<SlotId, string | null>
}
```

Bundled Wayfarer and Harbor adapt their current primitive assets to this interface in memory. Their serialized project locks, selected asset IDs, render pixels, credits, and exports remain unchanged. Installed assets use `sheet-v1`; runtime composition receives `PackAssetV2` and must not branch on origin.

## 3. Humanoid Sheet Profile

`humanoid-lpc-64` format v1 requires one 256×512 PNG per layer asset:

- 4 columns × 8 rows of 64×64 cells.
- Rows in exact order: `idle_south`, `idle_west`, `idle_east`, `idle_north`, `walk_south`, `walk_west`, `walk_east`, `walk_north`.
- Idle rows use column 0 as the semantic frame. Columns 1–3 must be byte-identical to column 0 after decode; otherwise `image-profile-invalid`.
- Walk rows use all four columns in playback order 0,1,2,3.
- PNG signature, IHDR, CRCs, dimensions, color type, bit depth, interlace, decompression bounds, and decoded byte count are validated before repository mutation.
- Accepted PNG: 8-bit RGBA, color type 6, non-interlaced, no animation. Ancillary chunks may be ignored after bounded parsing; executable metadata is never evaluated.
- Transparent pixels may contain RGB bytes but do not require color mappings and render transparent.
- Mapping keys are lowercase `#rrggbb` for every distinct RGB whose alpha is greater than zero. Runtime replacement preserves source alpha.
- Maximum 256 distinct mapped RGB values per asset. Above the boundary fails `image-color-limit`.
- Every source RGB has exactly one fixed or token disposition. Unknown and duplicate keys fail strict schema validation.
- Token replacement uses the existing project/recipe resolved token and current shade algorithm. No application-level color quantization or nearest-color matching occurs.

A pack asset is one composited layer, not a complete character. The existing slot and z-order determine composition. UPD-002 does not introduce custom anchors, offsets, masks, blend modes, or frame geometry.

### Alpha-preserving token replacement

For every decoded pixel with alpha `1..255`, lookup uses the source RGB bytes only. A fixed binding preserves source RGB and alpha. A token binding replaces source RGB with the existing resolved token+shade RGB and preserves the source alpha byte unchanged. Alpha zero always emits RGBA zero and does not require a binding. Partially transparent and anti-aliased pixels are valid and do not trigger heuristic warnings or alternate rendering. The reference fixtures include the same bound RGB at alpha 1, 64, 128, 254, and 255 and require byte-identical web/Electron output.

## 4. `.spritepack` Container Format Version 1

### Required paths

```text
pack-manifest.json
pack.json
assets/<lowercase-png-sha256>.png
provenance/<provenance-id>.json
README.txt
```

No other root paths are valid. The manifest lists every payload entry except itself.

```ts
interface SpritePackManifestV1 {
  packFormatVersion: 1
  packSchemaVersion: 2
  packId: string
  packVersion: string
  packageSha256: string | null // null in canonical manifest bytes; package identity is computed externally.
  createdWith: string
  entries: Array<{
    path: string
    mediaType: 'application/json' | 'image/png' | 'text/plain; charset=utf-8'
    size: number
    sha256: string
  }>
}
```

`packageSha256` is always `null` to avoid recursion. Installed identity stores SHA-256 of the complete `.spritepack` bytes separately. Manifest entry order is `pack.json`, assets sorted by UTF-8 path, provenance sorted by UTF-8 path, `README.txt`.

One host-neutral writer owns complete package bytes. It canonicalizes payload entries, computes uncompressed entry hashes/sizes, emits `pack-manifest.json` first followed by the manifest entry order above, applies fixed 1980 timestamps and deterministic Deflate level 6, then computes SHA-256 over the final ZIP byte sequence. Web and Electron must call this writer; host adapters may only choose destinations. Readers recompute final package SHA-256 before extraction validation and compare it to installed/embedded repository identity when one is expected. A final-byte mismatch for the same ID/version is `pack-conflict`; an internal listed-entry mismatch is `pack-invalid`.

### Canonical rules

Use UPD-001 canonical JSON and ZIP rules: UTF-8 without BOM, NFC where specified, LF, one trailing LF, Unicode code-point object keys, array schema order, finite shortest-round-trip numbers, negative zero to zero, fixed 1980 timestamp, deterministic Deflate, no encryption, symlinks, absolute/dot paths, duplicate case-folded paths, data descriptors required for interpretation, or unlisted entries.

### Hard limits

| Limit | Value |
|---|---:|
| Compressed package | 64 MiB |
| Entries including manifest | 256 |
| JSON/text entry | 4 MiB |
| PNG entry | 16 MiB |
| Total expanded | 128 MiB |
| Compression ratio per entry/total | 100:1 |
| Relative UTF-8 path | 180 bytes |
| Path depth | 3 segments |
| Assets | 128 |
| Provenance records | 128 |
| Distinct mapped RGB per asset | 256 |
| Pack name | 80 Unicode scalar values |
| Description | 500 Unicode scalar values |
| Canonical IDs | 64 lowercase ASCII chars |

Readers enforce central directory/container, paths/duplicates, declared size/ratio, streamed expansion, media signatures, checksums, strict schemas, graph references, image profile, mappings, provenance/license profiles, runtime coverage, and semantic summary in that order. Failure returns before repository or project mutation.

## 5. Identity, IDs, and SemVer

- Pack ID: lowercase reverse-domain or slug segments matching `^[a-z0-9]+(?:[.-][a-z0-9]+)*$`, length 3–64. Examples: `io.example.pirate-wardrobe`, `studio-pack`.
- Asset and provenance IDs: lowercase path-like IDs matching `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, unique within pack, length 3–64.
- Version: SemVer 2.0.0 without leading `v`; build metadata is allowed but excluded from precedence, not identity.
- Exact installed identity is `(packId, version, packageSha256)`.
- Same triple is idempotent. Same ID/version with different checksum fails `pack-conflict`; it never overwrites.
- Versions install side by side. No `latest` pointer enters project data.
- `PackLockRef.sha256` retains one meaning for every origin: SHA-256 of canonical `pack.json` bytes (`ContentPackV2` after bundled adaptation), preserving the UPD-001 canonical-pack-document lock semantics. It never stores complete ZIP bytes.
- Complete `.spritepack` SHA-256 is separate installed/package identity and is recorded by the installed-version record and project archive v2 `embeddedPacks`. A non-bundled project lock resolves only when canonical embedded/installed `pack.json` hashes to the lock and its containing package hash matches repository/manifest identity.
- Existing UPD-001 bundled locks continue using their recorded canonical pack-document hash. The bundled adapter must emit a `ContentPackV2` whose canonical bytes hash to that exact existing value; otherwise implementation stops as an incompatible contract defect rather than migrating/re-saving projects.

## 6. Provenance and License Profiles

```ts
type SupportedLicense =
  | 'CC0-1.0'
  | 'CC-BY-3.0'
  | 'CC-BY-4.0'
  | 'CC-BY-SA-3.0'
  | 'CC-BY-SA-4.0'
  | 'OGA-BY-3.0'
  | 'GPL-3.0-only'
  | 'GPL-3.0-or-later'

interface PackProvenanceV1 {
  schemaVersion: 1
  id: string
  author: string
  source: string
  sourceUrl: string // absolute https URL
  offeredLicenses: SupportedLicense[]
  chosenLicense: SupportedLicense
  attributionText: string | null
  authorRightsConfirmed: true
}
```

```ts
interface LicenseProfile {
  id: SupportedLicense
  label: string
  referenceUrl: string // authoritative absolute HTTPS URL
  attributionRequired: boolean
  defaultExportWording: string
  offeredCompatibility: SupportedLicense[]
}
```

The checked-in `license-profiles` registry is strict, canonical, complete for every `SupportedLicense`, and contains no runtime override. Unknown profile IDs in a package fail `unsupported-license` before graph commit; a known chosen profile absent from `offeredLicenses` fails `provenance-invalid`.

The registry is defined and exported only from the host-neutral `product/src/domain/license-profiles.ts` module as `LICENSE_PROFILES: Record<SupportedLicense, LicenseProfile>`. Web, Electron main/preload validation bundles, authoring, credits, and tests import that module; no adapter duplicates literals or loads profiles from package, user settings, filesystem, or network data.

- Chosen license must be offered.
- CC0 allows null attribution; other profiles require non-empty attribution.
- License combination/legal compatibility is not adjudicated. Validation checks structure and deterministic credit rules only.
- UI and reports state that legal ownership and compatibility remain the author's responsibility.
- Adding a license requires a reviewed profile defining canonical ID, attribution requirements, exported wording, and evidence fixtures.
- Installed `.spritepack` bytes and their provenance are immutable. Any metadata, source, image, mapping, or credit change requires a new SemVer and complete package checksum; no in-place package/provenance edit API exists.

### Deterministic credit merge contract

Credit generation preserves the existing bundled output contract while accepting installed assets:

1. Traverse selected recipe asset IDs in canonical slot order `body`, `legs`, `feet`, `torso`, `hair`, `headwear`.
2. Resolve each asset's complete provenance record from its exact pack version.
3. Group records by the tuple `(author, source, sourceUrl, chosenLicense, attributionText)`; pack versions never share mutable provenance records.
4. Within a group, append unique asset IDs/names in traversal order.
5. Sort groups by Unicode code-point order of `(source, author, chosenLicense, sourceUrl, attributionText ?? '')`.
6. Machine `credits.json` keeps the current `CreditRecord[]` shape for bundled records and adds optional `packageSha256` and `attributionText` only for non-bundled records. Human `CREDITS.txt` preserves the current lines and adds `Pack checksum:` and `Attribution:` only when those optional values exist. Existing Wayfarer/Harbor output bytes remain unchanged.
7. JSON is canonical UTF-8/LF. Human text is UTF-8/LF with exactly one trailing LF.

No host performs locale-sensitive sorting. A pack version contains immutable copies of every provenance record it references; later versions cannot alter credits for prior locks.

### License profile governance

The registry is a checked-in shared-core artifact owned by product engineering and approved by the product owner. Adding or changing a profile is a material compatibility/legal-metadata change and requires a product-update amendment or later update containing: canonical SPDX-like ID, display label, authoritative HTTPS license reference, offered/chosen compatibility rule, attribution-required boolean, deterministic exported wording, fixtures, and owner approval. It cannot ship as data from a pack or remote source. Legal counsel is required only when the product owner cannot accept the documented metadata risk; the application never represents a profile as legal clearance.

## 7. Pack Draft Schema and Repository

```ts
interface PackDraftV1 {
  draftSchemaVersion: 1
  id: string // UUID
  revision: number
  packId: string
  version: string
  name: string
  description: string
  subjectProfile: 'humanoid-lpc-64'
  assetIds: string[]
  activeAssetId: string | null
  createdAt: string
  updatedAt: string
  lastExportedPackageSha256: string | null
}

interface PackDraftAssetV1 {
  draftId: string
  assetId: string
  sourceBlobSha256: string
  name: string
  slot: SlotId
  description: string
  sourceColorBindings: Record<HexRgb, FixedColorBinding | TokenColorBinding>
  provenance: PackProvenanceV1 | null
}
```

### Web stores

Extend `the-sprite-project-workspace-v1` through the next IndexedDB version:

- `packVersions`: key `[packId, version, packageSha256]`; installed metadata, origin, enabled, installedAt.
- `packBlobs`: existing SHA-256 store extended to PNG/package blobs, MIME, expanded bytes, reference count, userOwned.
- `packDrafts`: key draft UUID; strict draft metadata/revision.
- `packDraftAssets`: key `[draftId, assetId]`; configuration and source blob reference; index by draft.

Existing bundled pack metadata may be projected into the library but is not duplicated as blobs.

### Electron storage

Main owns `<userData>/packs/v1/`:

```text
index.json
packages/<package-sha256>.spritepack
```

`index.json` is strict, canonical, atomically written, and contains installed records and enabled state. Package bytes remain the source of truth and are revalidated on activation. Drafts use renderer local IndexedDB so web and Electron authoring share one adapter and no source path authority enters draft data.

### Draft repository contract

Both hosts use the same origin-local IndexedDB draft repository and the exact stores above. Electron does **not** persist drafts under `userData`; its packaged renderer owns the same IndexedDB database. Draft metadata is one `packDrafts` record and each asset is one `packDraftAssets` record referencing immutable SHA-256 blobs in `packBlobs`. Import writes a blob only when absent and adjusts reference counts in the same transaction as the asset record. Autosave writes only changed metadata/configuration records; immutable source blobs are not rewritten.

Limits: 32 concurrent drafts, 128 assets per draft, 16 MiB compressed source PNG per asset, 128 MiB referenced source bytes per draft, and 512 MiB total user-owned draft blobs per origin. Crossing a limit blocks the new write with `draft-limit`; existing drafts remain readable. Draft deletion previews blob impact and deletes only zero-reference source blobs after 30-day recovery retention or a successful recovery/package export, whichever occurs first.

`revision` is the non-negative integer optimistic-concurrency token. Save reads the current revision inside the same transaction, writes nothing on mismatch, and offers Reload, overwrite with named checkpoint, Save copy, or Cancel. A failed/quota-exceeded transaction exposes no partial records. Unsaved edits and newly selected `File` bytes remain in memory, the last committed draft remains intact, and `Download draft recovery` serializes canonical draft/asset JSON plus every original referenced PNG into deterministic `spritepack-draft-recovery-v1.zip`. If memory is lost before recovery export, only the last committed draft is promised.

One IndexedDB `readwrite` transaction owns `packDrafts`, every affected `packDraftAssets` key for the draft, `packBlobs`, and draft snapshots. It first reads `packDrafts[id].revision`, then all affected old/new blob references, and performs revision compare, snapshot, draft/asset writes, and blob reference increments/decrements before commit. IndexedDB transaction serialization is the source of truth; BroadcastChannel is notification only. First commit wins. A stale tab writes nothing and receives `draft-conflict` with expected/actual revisions and Reload/overwrite-with-checkpoint/Save-copy/Cancel. Zero-reference blobs are marked disposable in the transaction but physical deletion runs only after commit and rechecks references in a new transaction, so a concurrent save cannot orphan content.

### Draft recovery export format

```text
recovery-manifest.json
draft.json
assets/<source-blob-sha256>.png
validation-report.txt
README.txt
```

`recovery-manifest.json` is strict schema version 1 and lists every payload entry/checksum, draft ID/revision, exported-at UTC timestamp, and application version. `draft.json` contains canonical `PackDraftV1` plus asset configurations ordered by `assetIds`; original PNG bytes are unchanged and deduplicated by SHA-256. Text is UTF-8/LF with one trailing LF. ZIP uses the same fixed timestamp, UTF-8 path, deterministic order, and Deflate rules as `.spritepack`.

The recovery ZIP is intentionally **not** accepted by Add pack or opened as a draft. It is an inspection/manual-recovery artifact that preserves source art and configuration if local storage is lost. README names this limitation and points to Create pack / Add layer sheet for reconstruction. A future automated recovery importer requires a separate schema/versioned promise.

### Draft autosave

- Meaningful metadata, asset, mapping, and provenance edits schedule save after 750 ms quiet.
- A transaction receives expected integer revision, snapshots the prior draft metadata/config, writes draft and asset records, updates blob refs, commits, reads back, then announces Saved.
- Revision mismatch writes nothing and offers Reload, overwrite with checkpoint, save copy, or cancel.
- Original imported PNG bytes are user-owned and never evicted automatically while referenced by a draft or installed package.
- Failed decode/config assets remain attached until user removes them; recovery export contains draft JSON plus original source blobs and validation report.
- A meaningful edit is any change to pack identity/name/version/description, asset ordering/identity/name/slot/description/source, a source-color disposition, or provenance/license fields. Focus, selection, active section, preview playback/frame, filters, expansion, validation display, and transient errors do not mark dirty.

## 8. Validation Report and Stable Errors

```ts
interface PackValidationIssue {
  code: PackErrorCode
  severity: 'blocker' | 'warning'
  stage: 'container' | 'path' | 'size' | 'checksum' | 'schema' | 'image' | 'mapping' | 'coverage' | 'provenance' | 'runtime' | 'repository'
  ownerPath: string
  message: string
  observed?: string | number
  allowed?: string | number
}
```

Add stable codes without collapsing existing host errors:

- `pack-invalid`
- `pack-limit`
- `pack-conflict`
- `pack-missing`
- `pack-in-use`
- `pack-disabled`
- `draft-conflict`
- `image-invalid`
- `image-profile-invalid`
- `image-color-limit`
- `color-binding-invalid`
- `coverage-incomplete`
- `provenance-invalid`
- `unsupported-license`

### Error registry

| Code | Owning condition | Required response |
|---|---|---|
| `pack-invalid` | Container/path/duplicate/unlisted/strict graph/reference violation | Preserve source/repository; name stage and owner path |
| `pack-limit` | Package entry/count/path/size/ratio/asset boundary | Preserve source; report observed and allowed |
| `pack-conflict` | Same pack ID+version with different package checksum | Keep both source and installed version; require new SemVer/ID |
| `pack-missing` | Exact project lock unavailable | Preserve/open blocked project; locate exact or replace copy |
| `pack-in-use` | Removal target is bundled, embedded-only, draft test, or project referenced | Write nothing; list dependencies |
| `pack-disabled` | Pack unavailable for new selection by local setting | Keep existing locks usable; offer Enable |
| `draft-conflict` | Expected draft revision is stale | Write nothing; explicit conflict choices |
| `draft-limit` | Draft count/asset/source/total boundary | Preserve draft; cleanup/recovery/cancel |
| `image-invalid` | PNG signature/chunk/CRC/decompression/decoded-byte failure | Retain offending source; replace/remove/report |
| `image-profile-invalid` | Dimensions/color type/bit depth/interlace/idle duplicate/profile failure | Retain source; report exact expected profile |
| `image-color-limit` | More than 256 mapped non-transparent RGB colors | Retain source; edit externally/reimport/remove |
| `color-binding-invalid` | Missing/unknown/duplicate RGB, token, shade, or disposition | Focus exact color row; retain mappings |
| `coverage-incomplete` | Required semantic frame has no non-transparent pixels | Focus asset coverage; replace/remove |
| `provenance-invalid` | Missing/invalid author/source/URL/license/attribution/confirmation | Focus exact provenance field |
| `unsupported-license` | License not in checked-in profile registry | Preserve input; choose supported profile or cancel |
| `unsupported-version` | Future pack container/schema/draft/project archive/profile | Preserve source; name required/current versions |

Traversal/symlink/encryption/malformed JSON map to `pack-invalid`; any numeric archive boundary maps to `pack-limit`; PNG decompression overrun maps to `image-invalid`; same ID/version/different bytes maps only to `pack-conflict`. Existing `invalid-payload`, `permission-denied`, `storage-full`, `path-*`, `atomic-replace-unavailable`, and `io-failed` remain host-boundary codes.

`PackErrorCode` is added directly to the shared `HostErrorCode` union and `ProductError`; it is not nested in `details` and no second top-level error type exists. A blocking `PackValidationIssue` converts to `ProductError` using its exact code, stage in `operation`, human message, `recoverable: true`, and owner/observed/allowed values in details. Warnings never throw and remain validation-report records. Web repository and Electron main must return the same top-level code for the same fixture.

Repository adapters map quota, permission, path, atomic replace, and generic I/O to existing host codes. Catch-all handlers cannot replace specific codes.

Required adversarial fixtures: path traversal, absolute path, dot segment, case-fold duplicate, symlink, encrypted entry, too many entries, oversized JSON, oversized PNG, oversized total, excessive ratio, checksum mismatch, unlisted entry, malformed JSON, future pack container, future pack schema, unknown key at every canonical boundary, wrong PNG signature, CRC failure, wrong dimensions, wrong color type/bit depth/interlace, decompression overrun, duplicate asset/provenance ID, missing blob, unmapped color, unknown token, invalid shade, empty required frame, missing provenance, chosen-not-offered license, unsupported license, non-HTTPS source, and same ID/version checksum conflict.

## 9. Install, Enable, Update, and Remove Transactions

### Install

1. Read complete source bytes under limits.
2. Validate package and compute package SHA-256 without mutation.
3. Summarize and obtain user confirmation.
4. In one web transaction or one Electron temporary-index operation: write missing blobs/package, write installed version disabled/enabled as chosen, increment references.
5. Read back and revalidate package/runtime summary.
6. Commit index/transaction and announce exact identity.
7. On any failure, commit nothing; cleanup best-effort temporary bytes only.

### Enable/disable

Enabled state is host-local settings for future selection. It does not enter `.spritepack` or project data and cannot make an exact locked pack unavailable to that project.

Enabled/disabled state is intentionally not portable or synchronized. A transferred project carries exact pack content/locks, not the source host's library preferences. On the destination, an embedded exact pack resolves the project even when the same global version is locally disabled; it remains absent from new selections until enabled locally.

### Version activation in a project

1. Validate target installed package and current project.
2. Compare selected asset IDs, defaults, semantic project, rendered frames/sheet, exports, and credits.
3. Block if selected asset IDs disappear unless the user explicitly resolves selections in a new project copy.
4. Create a named snapshot/checkpoint.
5. Update only the active project's exact lock and affected recipe after confirmation through existing optimistic concurrency/fingerprint rules.

### Remove

- Recompute dependencies inside the removal transaction/atomic operation.
- Bundled, embedded-only, referenced, active test-copy, or concurrently referenced versions return `pack-in-use` and write nothing.
- Remove installed record, decrement blob refs, and delete only zero-ref package/PNG blobs not protected by drafts, projects, recovery, or retention.
- Failure restores prior complete index and bytes.

## 10. Runtime Rendering and Export

PNG-backed asset render steps:

1. Resolve exact pack package by lock and validate local availability.
2. Decode bounded PNG once into an immutable cached RGBA buffer keyed by PNG SHA-256.
3. Select source cell using current animation/direction/frame profile.
4. For each non-transparent pixel, look up lowercase source RGB binding.
5. Fixed retains RGB; token computes existing resolved token shade. Preserve alpha.
6. Composite in existing slot order using source-over and integer coordinates; no scaling/filtering.

Both browser Canvas and Electron renderer consume this shared algorithm. A reference pure RGBA compositor owns semantic hash fixtures so Canvas implementation differences cannot hide drift.

The bundled adapter lives in a host-neutral `pack-runtime` module beside pack schemas, not in React, web, or Electron code. It adapts current `PixelPart` primitive assets to `PackAssetV2` at runtime and delegates both primitive and sheet assets to one composition/export/credits facade. The pre-UPD-002 primitive implementation remains available only as a test oracle during migration and may be removed after every bundled frame/sheet/export/credit hash passes; rollback releases retain a compatible adapter reader.

Generic and Godot exports remain structurally unchanged except selected pack identity/checksum and credits may name installed packs. Existing bundled project output hashes must remain unchanged. Runtime caches and object URLs never enter project/pack data or archives.

## 11. Project Archive Format Version 2

A project requiring any non-bundled pack writes project archive v2. It retains all v1 canonical entries and adds:

```text
embedded-packs/<package-sha256>.spritepack
```

Manifest v2 lists embedded packages with media type `application/vnd.sprite-project.pack+zip`. Each embedded package is validated under pack limits before project graph resolution. The manifest `packageSha256` matches complete embedded bytes; the project lock SHA-256 matches canonical `pack.json` bytes inside that package.

```ts
interface SpriteProjectArchiveManifestV2 {
  archiveFormatVersion: 2
  projectSchemaVersion: 2
  packLockVersion: 1
  projectId: string
  createdWith: string
  embeddedPacks: Array<{
    packId: string
    version: string
    packageSha256: string
    path: `embedded-packs/${string}.spritepack`
    size: number
  }>
  entries: ArchiveManifestEntry[] // complete payload inventory excluding manifest
}
```

Readers detect version from `archive-manifest.json.archiveFormatVersion` after central-directory/path/manifest-size checks and before extracting any payload entry. Version 1 readers see literal `2` and return existing `unsupported-version` with required/current versions; presence of an `embedded-packs/` path is never used as version detection. Manifest v2 is strict: every embedded record path/checksum/size must match exactly one listed entry. Bundled packages MUST NOT be embedded. A lock whose exact ID/version/canonical-pack hash resolves to the host's bundled registry requires no embedded record; every other lock requires exactly one embedded record whose package contains that canonical pack hash. A forbidden bundled package entry fails `pack-invalid`.

Project archive hard limits remain 128 MiB compressed, 512 entries, 256 MiB expanded, and 100:1 ratio. At most 16 embedded packs are allowed; each remains within 64 MiB compressed pack limits and total embedded expanded package bytes must be <=192 MiB within the project total. Nested `.spritepack` bytes are stored, never recursively extracted into the project ZIP. Validation order is project container/paths/limits, manifest v2, embedded package byte checksum/size, each pack's complete validator, lock-to-package graph, then project graph. Any failure returns before project repository/folder mutation.

Opening a valid v2 project keeps embedded packs project-scoped with origin `embedded-project`; it does not globally install or alter local enabled state. Embedded bytes are authoritative for that project even if an exact global package is disabled. If the exact global package already exists, runtime may deduplicate decoded/cache bytes by checksum but preserves the embedded archive entry on unedited re-save. `Add to pack library` is a separate explicit install action. Corrupt/missing embedded content blocks project open before commit and offers preserve/download source, locate exact pack, or cancel; no partial read-only project is promised in v1.

- Embedded content is project-scoped, offline-capable, and not installed globally without explicit Add to pack library.
- Folder projects use `embedded-packs/` with identical rules.
- Bundled-only projects continue v1 to preserve byte compatibility.
- Hosts supporting v2 preserve embedded package bytes unchanged on unedited re-save.
- Older hosts reject project archive v2 before extraction/mutation with `unsupported-version`.
- Import conflict choices preserve embedded packages with project snapshot/copy semantics.

Project schema v2 does not change because exact `packLocks` already describe the semantic dependency.

## 12. Electron Bridge Version 2

Preserve the existing 12 methods and add only:

```ts
interface SpriteHostBridgeV2 extends SpriteHostBridge {
  choosePackFile(mode: 'open' | 'save'): Promise<HostResult<ApprovedLocation | null>>
  readPack(sourceGrantId: string): Promise<HostResult<ReadPackBytes>>
  listInstalledPacks(): Promise<HostResult<InstalledPackSummary[]>>
  installPack(request: InstallPackRequest): Promise<HostResult<InstalledPackSummary>>
  removePack(request: RemovePackRequest): Promise<HostResult<void>>
  writePack(request: WritePackRequest): Promise<HostResult<WrittenPack>>
}
```

Internal channels: `dialog:pack-file`, `pack:read`, `pack:list`, `pack:install`, `pack:remove`, `pack:write`. Renderer cannot construct channels. Pack grants are opaque, session-scoped, kind `pack-file`, and scoped to read or write. Display paths are never accepted as authority.

A grant is a main-memory record `{ grantId: UUID, webContentsId, kind: 'pack-file', scope: 'read'|'write', absolutePath, issuedAt }`. It is minted only from a successful native dialog initiated by that renderer or a validated recent package record, is bound to the issuing `webContents.id`, expires when that webContents closes, and is never persisted or accepted from renderer display data. Every operation resolves the UUID in main, verifies owner/kind/scope and that the path still satisfies approved-root/reparse rules, then performs the operation; missing/forged/wrong-scope grants return `path-not-approved` before I/O.

Pack payload maximum is 64 MiB. Main validates request shape/size before allocation and package bytes before repository mutation. `pack:remove` accepts only exact identity, expected index revision, and dependency summary token minted by main; main recomputes dependencies before commit.

Pack read resolves every existing path component and rejects symbolic links, junction/reparse escape, devices, directories, and non-regular files before opening. Pack write creates a random sibling temporary regular file under the approved parent, writes and flushes complete bytes, reads back through the pack validator, compares expected complete SHA-256, then atomically replaces the destination where supported. Before replacement main re-resolves parent/destination and rejects changed reparse identity. Existing destination moves to a sibling rollback name until replacement/read-back succeeds; failure restores it and removes temporary output. Filesystems without guaranteed replacement return `atomic-replace-unavailable` before destination mutation.

## 13. Security and Privacy Boundary

- Packs are untrusted local files. No package content executes, navigates, opens URLs, loads remote images, or influences filesystem paths.
- Source URLs render as escaped text/controlled HTTPS links and open only under existing user-activated external policy.
- PNG parser must be maintained, bounded, and fuzz-tested; browser decode alone is not validation.
- No analytics, remote catalog, account, upload, or undeclared request is added.
- Draft and installed content remain local; diagnostics exclude full user PNG bytes unless the user explicitly exports recovery.
- CSP remains compatible with static/offline operation and disallows remote script execution.

See `threat-model.md` for threats and mitigations.

### Resource scheduling

ZIP entry bodies are streamed and checksummed sequentially. At most one compressed entry and one 16 MiB PNG compressed source are resident beyond the package source buffer. PNG structural validation and bounded inflate run in a Web Worker on web and renderer worker thread in Electron with a 20 MiB decoded RGBA ceiling per asset; at most two PNG workers run concurrently on the reference 2-CPU machine. Runtime preview decodes one asset at a time and caches immutable RGBA by checksum under the existing disposable-cache policy. The UI thread receives progress messages at stage boundaries and at least every 500 ms; no continuous main-thread task may exceed 100 ms. Cancellation terminates workers, discards temporary results, and commits nothing.

## 14. Migration and Compatibility

- Existing IndexedDB and Electron settings upgrade additively. No existing project/recipe/pack lock changes.
- Bundled packs are adapted in code; no migration writes them into repositories.
- Existing `packBlobs` records gain defaults when read; migration is transactionally idempotent.
- Draft schema migration is independent and retains original source blobs until read-back validation.
- Unsupported future pack/draft/project archive versions remain intact and unopened.
- Rollback readers for pack v1, runtime pack v2, draft v1, and project archive v2 must remain while any data exists.

## 15. Implementation Sequence

1. Shared format/schema/license/image validation and adversarial fixtures.
2. PNG-backed shared runtime plus bundled adapter and unchanged-output regressions.
3. Web and Electron pack repositories and bridge v2 contract.
4. Install/library/version/remove/missing-lock UX.
5. Draft repository and guided authoring UX.
6. Validation/export/self-install.
7. Project archive v2 embedding and cross-host parity.
8. Offline, performance, accessibility, security, rollback, and full UPD-001 regressions.

No implementation package may invent a new profile, license, script capability, project mutation, remote distribution, or engine adapter.
