# UPD-003 Product and Experience Specification

## 1. Product Outcome

The Terrain Environment Producer proves that The Sprite Project can grow from a character tool into a coherent world-asset studio. A developer adds terrain to the same project, paints a bounded test map, themes the result, saves/reopens it, and exports a complete cardinal autotile atlas for generic engines or Godot.

The product does **not** become a level editor. The preview map demonstrates tile correctness and supports authoring; it is not exported as a playable scene.

## 2. Information Model

### Terrain document

One project has zero or one `TerrainDocumentV1` containing:

- stable document ID and display name;
- selected built-in material ID;
- four terrain-local colors: surface, detail, edge, shadow;
- fixed map dimensions 12×8;
- exactly 96 boolean occupancy cells in row-major order;
- creation and update timestamps.

### Material catalog

The built-in catalog contains Grass, Dirt, Sand, and Stone. Each material owns:

- stable ID and user-facing description;
- deterministic texture seed and generation rules;
- default color derivation from the active project theme;
- one code-owned CC0 provenance record.

No material is downloaded, installed, authored, or modified as a pack in UPD-003.

### Cardinal mask

Each occupied preview cell derives a four-bit adjacency mask from occupied cardinal neighbors:

- north = 1;
- east = 2;
- south = 4;
- west = 8.

Out-of-bounds and empty neighbors contribute zero. Empty cells render transparent. The atlas orders masks 0–15 in a 4×4 matrix; each tile is 32×32, producing a 128×128 atlas.

## 3. Navigation

Add **Terrain** between Theme and Preview in the shared workflow navigation. It is disabled when no project is open. Terrain does not replace Compose or the persistent character preview.

Terrain has two internal modes:

1. Workspace: material, palette, map, atlas, readiness.
2. Export: terrain-specific readiness, files, Godot metadata, credits.

Back from export returns to the same terrain map and focus position. Storage remains the project backup/recovery surface.

## 4. Terrain Empty State

When a project has no terrain:

- Heading: `Terrain`.
- Summary: creates a fixed 32px cardinal autotile set and test map in this project.
- Facts: 16 masks, 32px tiles, 12×8 preview, four built-in materials.
- Primary command: **Create terrain**.
- Existing character project name and render remain visible in the persistent preview.

Create terrain is one semantic edit. It creates Grass, derives its palette, fills all 96 cells, announces the action, and marks the project Unsaved. It never alters the character recipe, pack lock, project theme, or preview state.

## 5. Terrain Workspace

### Header

- Breadcrumb/eyebrow: `Second producer`.
- H1: terrain document name, initially `Project terrain`.
- Save state remains in the global header.
- Secondary command: **Remove terrain**.
- Primary command: **Open terrain export**.

### Material selector

Four radio options show material name, description, and four color swatches. Selecting a material:

- changes material ID;
- derives new default colors from project theme;
- keeps map occupancy unchanged;
- updates atlas/map pixels immediately;
- marks the graph dirty;
- announces the material.

### Palette controls

Four rows: Surface, Detail, Edge, Shadow. Each has swatch, named textbox containing `#rrggbb`, and description. Invalid text remains visible, sets `aria-invalid`, shows `Use #RRGGBB`, and does not change the committed terrain document. Valid values update the document and pixels.

Each textbox has transient component-local draft text, matching the existing character token editor. A valid value commits immediately as one project edit. Invalid text never marks the project dirty, never enters `TerrainDocumentV1`, and is replaced by the last committed value only when corrected, reset, material changes, reload occurs, or the view is reopened. Invalid draft text is never written to IndexedDB, a folder, an archive, a snapshot, or autosave; reload/reopen initializes from the last committed palette. Global Save never serializes invalid draft text. Undo/redo is not promised; project snapshots and conflict copies own recovery.

**Reset terrain theme** derives all four values from the current project theme. Terrain colors are local and do not modify any character token.

### Paint tools

Commands:

- **Paint mode** segmented control: Paint / Erase.
- **Fill map**.
- **Clear map**.

Paint and Erase are modes, not commands in text buttons where a familiar icon exists; use icons with accessible names. Fill and Clear are commands.

### Preview map

The 12×8 map is a labeled grid. Each gridcell is a stable 32×32 logical tile shown at a responsive integer-like display scale. Pointer click and Space/Enter apply the active paint mode. Each cell exposes row, column, occupied state, and computed mask in its accessible name.

The fixed 12×8 size is an authoring verification canvas: wide enough to inspect edges, corners, holes, and enclosed regions while remaining fully visible at ordinary desktop sizes. It is deliberately not a game-level dimension. Arbitrary sizing/import/export would create level-editor and scene semantics excluded from this update.

Painting recomputes visible results for the changed cell and its four direct neighbors. Layout dimensions never change.

### Autotile atlas

A live 128×128 canvas uses the same renderer as export. It is labeled `Generated autotile atlas` and exposes `data-render-hash`. Below it, a compact 4×4 mask legend labels `0` through `15` and N/E/S/W bits. The atlas may scroll horizontally only inside its bounded tool region at narrow widths; the page must not overflow.

### Readiness

`Terrain status` is Ready when:

- schema version and fixed dimensions are valid;
- all four colors are valid hex;
- the atlas contains all 16 masks;
- material ID is supported;
- provenance is complete.

Empty preview occupancy is allowed and exports the complete atlas. Invalid state names every blocker.

## 6. Removal

**Remove terrain** opens a modal:

- title: `Remove terrain from this project?`;
- names terrain document and material;
- explains that the next save creates a normal project snapshot;
- explicitly states character recipe, packs, theme, and exports are unaffected;
- Cancel restores focus and writes nothing;
- destructive command: **Remove terrain document**.

Confirmation sets graph terrain to null and marks Unsaved. It does not delete snapshots or project backups.

## 7. Terrain Export

Terrain export is separate from character export to preserve existing commands and hashes.

### Readiness panel

Shows Ready or Blocked with exact blockers, material, atlas size, tile size, and atlas hash.

### Generic package

Command: **Download terrain package** (web) or write through approved directory (Electron). Files:

- `terrain-atlas.png`;
- `terrain-manifest.json`;
- `build-manifest.json`;
- `credits.json`;
- `CREDITS.txt`.

### Godot package

Command: **Download Godot terrain package**. Adds:

- `terrain_tileset.tres`;
- `README-GODOT-TERRAIN.md`.

The resource uses one atlas source, 32×32 texture regions, terrain set 0, and peering bits derived from masks.

Godot target is **4.7.1 stable**. `terrain_tileset.tres` is a directly loadable `TileSet` with source ID 0, texture `res://terrain-atlas.png`, region size `Vector2i(32, 32)`, 16 base tiles ordered by mask, terrain set 0 in side-matching mode, and terrain ID 0 named from the material. It has no physics, navigation, occlusion, custom-data, probability, animation, or alternative records. The README tells the user to assign this resource to a `TileMapLayer`; no slicing or peering reconstruction is required.

### Credits

The Terrain credits region shows only the selected material’s source, author, chosen license, and material ID. Built-in materials are original procedural CC0 content by The Sprite Project.

### Failure

Blocked export disables both commands. Runtime encoding or desktop write failure retains terrain, reports a stable error, and produces no partial package.

Web exports are assembled from local project state and code-owned materials, encoded in memory, and handed directly to the browser download API. They do not pass through the service worker and require no network. Electron uses the existing approved-directory entry writer.

Canvas 2D, the procedural renderer, and every material definition are bundled application code available offline. Canvas/PNG initialization failure is a readiness blocker shown before either export command can be invoked.

## 8. Persistence and Recovery

Terrain participates in existing project behavior:

- 750ms browser autosave;
- integer project revision;
- snapshots before replacement/restore;
- stale-tab conflict choices;
- project copy;
- browser clear confirmation;
- desktop external-modification detection;
- desktop Save/Discard/Cancel close prompt;
- `.spriteproject` backup/import conflict choices.

The UI never offers a terrain-only cloud, filesystem, or account workflow.

## 9. Responsive and Accessible Behavior

- Full workflow is keyboard operable.
- Grid uses `role=grid`; cells use `role=gridcell` and support Enter/Space.
- Material and paint modes use native radio controls.
- Dialogs trap no focus, Escape cancels, and close restores trigger focus.
- Visible focus is distinct from selected/painted state.
- At 200% and 320px, page content reflows without document-level horizontal overflow; only atlas/map tool regions may have bounded internal scrolling.
- Reduced motion disables nonessential canvas animation; terrain is static in this increment.
- Color is never the only state signal; labels, occupancy, and mask IDs remain textual.
- Primary pointer targets aim for 44px and never fall below 24px.

## 10. Explicit Non-Promises

UPD-003 does not promise terrain packs, authoring imported terrain art, arbitrary map dimensions, exported maps/scenes, material transitions, diagonals/47-tile blobs, animation/water, decorators, structures/props, lighting maps, manual pixel editing, global token redesign, or another engine adapter.
