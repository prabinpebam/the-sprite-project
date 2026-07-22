# UPD-003 Engineering Specification

## 1. Architecture Boundary

UPD-003 adds a host-neutral terrain domain beside the character domain. It reuses project identity/revision, repository transactions, archive framing, export writing, provenance conventions, web/Electron adapters, and evidence infrastructure. Character types, humanoid pack types, renderer semantics, and existing export entry sets remain unchanged.

Dependency direction:

```text
Terrain UI -> terrain domain/render/export -> shared project graph
Web repository / Electron project adapter -> shared project graph + archive
No terrain domain import from React, IndexedDB, Electron, or filesystem modules
```

## 2. Canonical Types

```ts
type TerrainMaterialId = 'grass' | 'dirt' | 'sand' | 'stone'
type TerrainColorRole = 'surface' | 'detail' | 'edge' | 'shadow'
type TerrainPalette = Record<TerrainColorRole, `#${string}`>

interface TerrainDocumentV1 {
  schemaVersion: 1
  id: string
  name: string
  materialId: TerrainMaterialId
  palette: TerrainPalette
  map: {
    width: 12
    height: 8
    occupied: boolean[] // exactly 96, row-major
  }
  createdAt: string
  updatedAt: string
}

interface ProjectGraphV2 {
  project: SpriteProjectV2
  recipes: Record<string, CharacterRecipeV1>
  terrain: TerrainDocumentV1 | null
}
```

`project.json` remains strict `SpriteProjectV2`, schema version 2, with no terrain keys. Missing graph `terrain` is accepted only at compatibility boundaries and normalizes to null in memory. New canonical graph writes include `terrain` in the in-memory envelope; repository/archive serialization owns its physical location.

## 3. Strict Schema

`terrainDocumentV1Schema` is strict and enforces:

- schema literal 1;
- identifier length 1–128;
- name 1–120 after trim;
- one finite material enum;
- exactly four lowercase or uppercase six-digit hex values;
- width literal 12, height literal 8;
- occupied array length exactly 96, booleans only;
- UTC timestamps matching existing project timestamp rules;
- no host paths, URLs, blobs, canvas data, derived masks, derived pixels, or extension keys.

Stable errors use existing `invalid-project`, `archive-invalid`, `unsupported-version`, `revision-conflict`, `external-modification`, `storage-full`, and `io-failed`. Add `terrain-invalid` only if UI/reporting needs to distinguish terrain validation from the containing project; otherwise schema failures at project/archive boundaries remain `invalid-project`/`archive-invalid`.

## 4. Compatibility Normalization

`parseProjectGraphV2(value)` accepts two exact envelope shapes:

1. baseline `{ project, recipes }` -> returns `{ project, recipes, terrain: null }`;
2. new `{ project, recipes, terrain }` -> strict-parse terrain or null.

Unknown envelope keys still fail. All callers receive `terrain` explicitly. Baseline graph tests compare semantic values with null normalization; baseline archive bytes remain unchanged because character-only archive serialization omits `terrain.json` and does not serialize the graph envelope.

`legacyProjection`, `applyLegacyProjection`, and character updates preserve `graph.terrain`. Pack changes never alter terrain. Project copy deep-copies terrain and changes only project ID/name/timestamps/revision.

## 5. Materials and Palette Derivation

Code-owned material registry:

```ts
interface TerrainMaterialDefinition {
  id: TerrainMaterialId
  name: string
  description: string
  textureSeed: number
  provenance: Provenance
  derivePalette(theme: ThemeTokens): TerrainPalette
}
```

All materials use author `The Sprite Project`, source `<Material> Procedural Terrain`, HTTPS repository source, offered/chosen license `CC0-1.0`, null attribution.

Derivation is deterministic and treats existing theme colors as immutable inputs. It returns a new four-field `TerrainPalette`; it never retains or mutates the theme object:

- Grass: surface `clothPrimary,0`; detail `clothSecondary,+1`; edge `leather,-1`; shadow `hair,-2`.
- Dirt: surface `leather,0`; detail `clothSecondary,-1`; edge `clothPrimary,-1`; shadow `hair,-2`.
- Sand: surface `clothSecondary,+1`; detail `skin,+1`; edge `leather,0`; shadow `hair,-1`.
- Stone: surface `metal,0`; detail `clothSecondary,-1`; edge `leather,-1`; shadow `hair,-2`.

`adjustHex(hex, signedSteps)` parses the six hex digits into integer RGB channels, adds `signedSteps * 12` to every channel, clamps each result to inclusive `[0,255]`, and emits lowercase `#rrggbb`. There is no HSL conversion, rounding, alpha, color-space correction, or host API. Example: `adjustHex('#5b8c51', -1) === '#4f8045'`. Stored terrain palette is explicit, so later project-theme edits do not silently alter existing terrain; **Reset terrain theme** is the explicit re-derivation action.

## 6. Cardinal Mask and Rendering

Constants:

```ts
TERRAIN_TILE_SIZE = 32
TERRAIN_MASK_COUNT = 16
TERRAIN_ATLAS_COLUMNS = 4
TERRAIN_ATLAS_ROWS = 4
TERRAIN_MAP_WIDTH = 12
TERRAIN_MAP_HEIGHT = 8
```

Mask bits: N=1, E=2, S=4, W=8. `cardinalMask(document, x, y)` returns 0 for empty cells and otherwise checks only occupied in-bounds neighbors.

### Procedural tile algorithm

Every tile is rendered into a fresh 32×32 RGBA buffer using opaque palette colors only:

1. Fill `[0,0,32,32]` with `surface`.
2. Seed xorshift32 with `(textureSeed ^ Math.imul(mask + 1, 0x9e3779b1)) >>> 0`; replace zero with `0x6d2b79f5`. One PRNG step applies `state ^= state << 13; state ^= state >>> 17; state ^= state << 5`, with JavaScript bitwise operations and an unsigned `state >>> 0` return.
3. Draw 12 `detail` marks. For mark index 0 through 11, consume two states and set `x = 4 + stateX % 24`, `y = 4 + stateY % 24`. Even-index marks fill `[x,y,1,1]`; odd-index marks fill `[x,y,2,1]`.
4. Draw absent-side bands in this exact order: if N is absent, fill `[0,0,32,3]` with `edge`; if W is absent, fill `[0,0,3,32]` with `edge`; if S is absent, fill `[0,29,32,3]` with `shadow`; if E is absent, fill `[29,0,3,32]` with `shadow`. Later fills overwrite earlier fills at corners, so precedence is E over S over W over N.
5. Connected sides receive no band. No blending, antialiasing, opacity, gradients, filters, host randomness, device-pixel scaling, or color conversion is permitted.
6. Atlas cell `(mask % 4, floor(mask / 4))` is rendered independently from material seed, mask, and palette. Map cells copy that exact atlas cell; map position never changes tile pixels.

`renderTerrainAtlas(document)` returns a 128×128 canvas. `drawTerrainMap(canvas, document)` draws transparent empty cells and the exact mask tile for occupied cells. Both use integer coordinates, `imageSmoothingEnabled=false`, and the same pure tile renderer. `terrainPixelHash` uses the existing FNV-style pixel hash helper.

Derived masks and pixels never enter project state.

## 7. Repository Persistence

IndexedDB upgrades from version 3 to 4 with:

```text
terrainDocuments: key projectId, value { projectId, terrain }
```

`loadGraph` reads `projects`, `recipes`, and `terrainDocuments` in one readonly transaction. `createGraph` and `saveGraph` include `terrainDocuments` in the owning readwrite transaction:

- null terrain deletes any terrain record;
- non-null terrain writes strict parsed terrain;
- revision compare, prior graph snapshot, project, recipes, terrain, pack records, and embedded packs commit atomically;
- stale revision writes nothing;
- read-back parses complete graph.

Delete project and clear all include terrain store. Snapshot graph includes terrain automatically. Migration from DB v3 creates the empty store only when it is absent; existing project bytes/records are untouched. Reopening v4 never recreates or clears the store.

Electron needs no new repository: folder/archive writers receive the complete graph. Existing manifest-based fingerprints hash `archive-manifest.json` plus every inventoried entry; therefore a terrain project fingerprint includes `terrain.json`. Comparison occurs before save and an external terrain change uses the existing Reload/Overwrite/Cancel conflict path.

## 8. Project Archive Format 3

Terrain projects write:

```text
archive-manifest.json  // archiveFormatVersion: 3
project.json           // unchanged schema v2
packs.lock.json
recipes/<id>.json
terrain.json           // TerrainDocumentV1
provenance/selected-credits.json
README.txt
embedded-packs/...     // only when existing non-bundled character locks require them
```

Manifest v3 fields equal v2 plus:

```ts
archiveFormatVersion: 3
terrainSchemaVersion: 1
```

Format 3 always includes `terrainSchemaVersion: 1` and exactly one inventoried `terrain.json`. A format-3 manifest missing either is malformed. Character-only projects never write format 3.

`terrain.json` media type is `application/json`. It is in the complete checksum/size inventory. Validation order:

1. ZIP central directory/path/size limits;
2. manifest parse and literal version detection;
3. complete entry inventory/checksums;
4. project/packs/recipes;
5. terrain strict parse;
6. embedded packs/locks;
7. complete graph.

Format 1 and 2 readers reject literal 3 with `unsupported-version` at validation step 2, immediately after manifest parse and before inventory/checksum or project parsing; no graph is returned and no repository is mutated. Updated reader behavior:

- format 1: bundled character project, no terrain;
- format 2: embedded character packs, no terrain;
- format 3: terrain required exactly once; embedded packs optional according to locks.

Writers choose 3 whenever `graph.terrain !== null`. Otherwise current v1/v2 byte behavior remains.

Folder projects mirror the same files and manifest. No migration rewrites existing archives.

## 9. Generic Terrain Export

`buildTerrainPackage(graph, target)` is parallel to character `buildPackage` and never changes `buildPackage` output.

Readiness blockers:

- no terrain document;
- invalid terrain schema/palette/material/map;
- canvas PNG encoding failure;
- incomplete provenance.

Generic files:

### `terrain-atlas.png`

128×128 RGBA image, masks in row-major order.

### `terrain-manifest.json`

```ts
{
  schemaVersion: 1,
  tileWidth: 32,
  tileHeight: 32,
  columns: 4,
  rows: 4,
  materialId,
  atlasHash,
  masks: Array<{
    mask: 0..15,
    north: boolean,
    east: boolean,
    south: boolean,
    west: boolean,
    x: number,
    y: number,
    width: 32,
    height: 32
  }>
}
```

### `build-manifest.json`

Schema version 1, project ID/name, terrain document ID, material ID, atlas hash, generated-by value.

### Credits

`credits.json` schema version 1 with one selected material record; `CREDITS.txt` human-readable equivalent.

ZIP uses deterministic insertion order and level 6. Existing character package names and hashes remain unaffected.

## 10. Godot Terrain Export

Adds:

- `terrain_tileset.tres`;
- `README-GODOT-TERRAIN.md`.

The target is Godot **4.7.1 stable**. The resource is Godot 4 text format with one `TileSetAtlasSource` over `res://terrain-atlas.png`, source ID `0`, `texture_region_size = Vector2i(32, 32)`, 16 base tiles at `(mask % 4, floor(mask / 4))`, alternative `0`, terrain set `0` in `TERRAIN_MODE_MATCH_SIDES`, and one terrain ID `0`. Each tile data record sets terrain set/terrain `0` and peering bits `top_side <- N(1)`, `right_side <- E(2)`, `bottom_side <- S(4)`, `left_side <- W(8)`. There are no collision, navigation, occlusion, custom-data, probability, alternative, or animation records. `terrain_tileset.tres` is directly loadable; no helper/import script fallback is permitted after lock.

The pinned Godot 4.7.1 fixture imports `terrain-atlas.png`, loads `terrain_tileset.tres` headlessly, retrieves source ID 0, and asserts texture region size, 16 atlas coordinates, terrain set/mode/count, and representative masks 0, 1, 3, 5, 10, 15. ResourceSaver-generated fixture output is the structural syntax oracle for the TypeScript serializer; generated IDs and property order need not match, but headless semantic assertions must. Changing the pinned Godot version requires an approved contract amendment and fixture regeneration.

## 11. UI and Host Integration

- Add `terrain` and `terrain-export` views to `App.tsx` navigation/routing.
- `EnvironmentWorkspace` receives terrain, project theme, and callbacks; it imports no repository or Electron module.
- `TerrainCanvas` renders atlas/map and exposes hashes.
- `updateTerrain` updates graph directly, increments edit version, marks dirty, and announces.
- Browser autosave and desktop Save use existing complete graph functions.
- Desktop direct terrain export uses existing `chooseExportDirectory` and `writeExport`; no bridge method/channel change.
- Persistent right preview remains character-only, proving producers coexist without a scene.

## 12. Limits and Performance

- one terrain document per project;
- 12×8 fixed map, 96 booleans;
- four materials and four color roles;
- 16 atlas tiles;
- terrain JSON <=64 KiB canonical bytes;
- terrain render/update p95 <=50 ms on reference Chromium/Electron;
- export <=2 s ordinary reference machine;
- archive format remains within current project archive limits.

## 13. Security and Privacy

Terrain accepts no files, URLs, HTML, SVG, scripts, shaders, remote data, arbitrary seeds, paths, or executable content. Material definitions are code-owned. Palette strings are escaped native input values and strict hex. Terrain JSON cannot influence archive paths or filesystem names. Diagnostics contain IDs, masks, dimensions, colors, and hashes, never unrelated user data.

## 14. Rollout and Rollback

Web and Electron terrain readers/writers ship together. A rollback build must retain:

- archive-v3 reader;
- terrain-v1 schema reader;
- terrain preservation in project save/copy/backup;
- character-v1/v2 and archive-v1/v2 behavior.

Terrain UI may be hidden/read-only during withdrawal, but no operation may erase `terrain.json` or terrain IndexedDB records. Rollback rehearsal exports baseline character project, adds terrain, exports archive-v3, opens with reader-only mode, removes UI, and proves terrain and character hashes survive.
