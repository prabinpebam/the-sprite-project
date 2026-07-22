# UPD-003 Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-TERRAIN-DOCUMENT | Terrain document | schema version, material, palette, 12x8 occupancy map, created and updated timestamps | implemented |
| IA-TERRAIN-MATERIAL | Terrain material | stable ID, display name, texture seed, default palette, provenance | implemented |
| IA-TERRAIN-TILESET | Cardinal autotile set | 16 masks, 32px tile geometry, 128x128 atlas, mask-to-region metadata | implemented |
| IA-TERRAIN-MAP | Terrain preview map | 12 columns, 8 rows, occupied cells, computed cardinal masks | implemented |
| IA-TERRAIN-EXPORT | Terrain export | atlas PNG, terrain manifest, build manifest, credits, Godot resource when selected | implemented |
| IA-TERRAIN-PROVENANCE | Terrain provenance | generator source, author, license, material IDs | implemented |

## Navigation

| ID | Label | Destination | Back behavior | Status |
|---|---|---|---|---|
| NAV-TERRAIN | Terrain | `VIEW-TERRAIN` | Project and character state remain unchanged | implemented |
| NAV-TERRAIN-EXPORT | Terrain export | `VIEW-TERRAIN-EXPORT` | Returns to terrain with map unchanged | implemented |
| NAV-TERRAIN-STORAGE | Storage | `VIEW-STORAGE` | Terrain remains in the current project graph | implemented |

## Views

| ID | Name | Purpose | Information | Status |
|---|---|---|---|---|
| VIEW-TERRAIN-EMPTY | Terrain empty state | Explain and create the optional second producer | `IA-TERRAIN-DOCUMENT` | implemented |
| VIEW-TERRAIN | Terrain workspace | Choose material, paint the map, inspect generated tiles, and recolor terrain | `IA-TERRAIN-DOCUMENT`, `IA-TERRAIN-MATERIAL`, `IA-TERRAIN-TILESET`, `IA-TERRAIN-MAP`, `IA-TERRAIN-PROVENANCE` | implemented |
| VIEW-TERRAIN-REMOVE | Remove terrain confirmation | Remove only the terrain document after explicit identity and recovery summary | `IA-TERRAIN-DOCUMENT` | implemented |
| VIEW-TERRAIN-EXPORT | Terrain export | Inspect readiness, credits, and produce generic or Godot outputs | `IA-TERRAIN-EXPORT`, `IA-TERRAIN-PROVENANCE`, `IA-TERRAIN-TILESET` | implemented |
| VIEW-STORAGE | Existing project storage | Save, snapshot, backup, import, copy, and recover the complete graph | `IA-TERRAIN-DOCUMENT` | implemented |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-TERRAIN-CREATE | `VIEW-TERRAIN-EMPTY` | button | Create terrain | implemented |
| UI-TERRAIN-MATERIAL | `VIEW-TERRAIN` | radio | Terrain material | implemented |
| UI-TERRAIN-MAP | `VIEW-TERRAIN` | grid | Terrain preview map | implemented |
| UI-TERRAIN-CELL | `VIEW-TERRAIN` | gridcell | Terrain cell | implemented |
| UI-TERRAIN-FILL | `VIEW-TERRAIN` | button | Fill map | implemented |
| UI-TERRAIN-ATLAS | `VIEW-TERRAIN` | img | Generated autotile atlas | implemented |
| UI-TERRAIN-COLOR | `VIEW-TERRAIN` | textbox | Terrain color | implemented |
| UI-TERRAIN-RESET | `VIEW-TERRAIN` | button | Reset terrain theme | implemented |
| UI-TERRAIN-STATUS | `VIEW-TERRAIN` | status | Terrain status | implemented |
| UI-TERRAIN-REMOVE | `VIEW-TERRAIN` | button | Remove terrain | implemented |
| UI-TERRAIN-REMOVE-CONFIRM | `VIEW-TERRAIN-REMOVE` | button | Remove terrain document | implemented |
| UI-TERRAIN-EXPORT-NAV | `VIEW-TERRAIN` | button | Open terrain export | implemented |
| UI-TERRAIN-EXPORT-GENERIC | `VIEW-TERRAIN-EXPORT` | button | Download terrain package | implemented |
| UI-TERRAIN-EXPORT-GODOT | `VIEW-TERRAIN-EXPORT` | button | Download Godot terrain package | implemented |
| UI-TERRAIN-CREDITS | `VIEW-TERRAIN-EXPORT` | region | Terrain credits | implemented |
| UI-TERRAIN-BACKUP | `VIEW-STORAGE` | button | Download project backup | implemented |

## Expected Behaviors

| ID | Flow | Steps | Oracle | Status |
|---|---|---|---|---|
| EB-TERRAIN-CREATE | `TF-TERRAIN-FIRST` | `S1` | Create terrain adds one schema-version-1 terrain document with grass defaults and leaves the character recipe, lock, pixels, and credits unchanged. | implemented |
| EB-TERRAIN-DEFAULT | `TF-TERRAIN-FIRST` | `S2` | The initial document fills a 12x8 map, displays a nonblank preview, and generates exactly sixteen 32px cardinal-mask tiles in a 128x128 atlas. | implemented |
| EB-TERRAIN-REMOVE | `TF-TERRAIN-FIRST` | `S3`, `S4` | Remove opens a confirmation; confirmation creates a normal project snapshot on save, deletes only terrain state, and preserves character state while cancel writes nothing. | implemented |
| EB-TERRAIN-MATERIAL | `TF-TERRAIN-PAINT` | `S1` | Selecting grass, dirt, sand, or stone changes stable material identity, derived defaults, atlas pixels, preview pixels, and credits in one edit. | implemented |
| EB-TERRAIN-PAINT | `TF-TERRAIN-PAINT` | `S2` | Toggling a cell changes only that occupancy value and recomputes its cardinal mask plus the four direct neighbors. | implemented |
| EB-TERRAIN-FILL-CLEAR | `TF-TERRAIN-PAINT` | `S3` | Fill makes all 96 cells occupied; Clear makes all cells empty; both are one undoable project edit and never resize the grid. | implemented |
| EB-TERRAIN-MASKS | `TF-TERRAIN-PAINT` | `S4` | Atlas and map expose mask IDs 0 through 15 using N=1, E=2, S=4, W=8; identical documents produce identical hashes. | implemented |
| EB-TERRAIN-THEME-DERIVE | `TF-TERRAIN-THEME` | `S1` | Reset derives four terrain colors deterministically from the active project theme without adding or changing global character token fields. | implemented |
| EB-TERRAIN-THEME-EDIT | `TF-TERRAIN-THEME` | `S2` | A valid #RRGGBB terrain color updates atlas and map pixels; invalid text stays visible, reports an adjacent error, and does not mutate committed terrain. | implemented |
| EB-TERRAIN-THEME-ISOLATE | `TF-TERRAIN-THEME` | `S3` | Terrain-local overrides never change character theme values, selected assets, character render hash, or character export hash. | implemented |
| EB-TERRAIN-AUTOSAVE | `TF-TERRAIN-RETURN` | `S1` | A terrain edit marks Unsaved in one frame and commits through the existing 750ms project revision transaction with a prior snapshot. | implemented |
| EB-TERRAIN-REOPEN | `TF-TERRAIN-RETURN` | `S2` | Reload or relaunch restores the exact terrain document, map occupancy, atlas hash, map hash, and unchanged character hash. | implemented |
| EB-TERRAIN-CONFLICT | `TF-TERRAIN-RETURN` | `S3` | A stale terrain edit writes nothing and offers the existing reload, overwrite-with-checkpoint, save-copy, or cancel choices. | implemented |
| EB-TERRAIN-OFFLINE | `TF-TERRAIN-RETURN` | `S4` | After one controlled load, terrain paint, theme, save, reopen, backup, and export complete with zero required network requests. | implemented |
| EB-TERRAIN-GENERIC | `TF-TERRAIN-EXPORT` | `S1` | Generic export emits terrain-atlas.png, terrain-manifest.json, build-manifest.json, credits.json, and CREDITS.txt with exact 32px regions for all sixteen masks. | implemented |
| EB-TERRAIN-GODOT | `TF-TERRAIN-EXPORT` | `S2` | Godot export adds terrain_tileset.tres and README-GODOT-TERRAIN.md whose atlas coordinates, tile size, source ID, and terrain peering bits match the manifest. | implemented |
| EB-TERRAIN-CREDITS | `TF-TERRAIN-EXPORT` | `S3` | Terrain credits name generator source, author, CC0 license, material ID, and project identity with no unselected material. | implemented |
| EB-TERRAIN-EXPORT-BLOCK | `TF-TERRAIN-EXPORT` | `S4` | Invalid palette, schema, or empty required atlas state blocks both commands, names exact issues, and emits no partial download or filesystem output. | implemented |
| EB-TERRAIN-EXPORT-NAV | `TF-TERRAIN-EXPORT` | `S0` | Open terrain export preserves the terrain document and shows current readiness, atlas identity, and credits before enabling commands. | implemented |
| EB-TERRAIN-DESKTOP-OPEN | `TF-TERRAIN-DESKTOP` | `S1` | Packaged Electron opens archive-v3 or folder terrain through existing opaque project grants with no new renderer path authority. | implemented |
| EB-TERRAIN-DESKTOP-SAVE | `TF-TERRAIN-DESKTOP` | `S2` | Desktop save writes terrain.json atomically with the complete graph and fingerprints it for external-change detection. | implemented |
| EB-TERRAIN-DESKTOP-EXPORT | `TF-TERRAIN-DESKTOP` | `S3` | Desktop generic and Godot terrain exports write only canonical relative entries to the approved export directory and read back successfully. | implemented |
| EB-TERRAIN-UNSAVED-CLOSE | `TF-TERRAIN-DESKTOP` | `S4` | Terrain edits participate in the existing Save, Discard, or Cancel close contract without a producer-specific bypass. | implemented |
| EB-TERRAIN-ARCHIVE-V3 | `TF-TERRAIN-CROSS-HOST` | `S1` | A terrain project writes archive format 3 with terrain.json in the complete manifest; character-only archives remain byte-compatible v1/v2. | implemented |
| EB-TERRAIN-CROSS-OPEN | `TF-TERRAIN-CROSS-HOST` | `S2` | The other host opens terrain only after checksum and strict terrain schema validation and renders identical atlas/map hashes. | implemented |
| EB-TERRAIN-CROSS-RETURN | `TF-TERRAIN-CROSS-HOST` | `S3` | Unedited re-export preserves terrain document semantics, character semantics, and all generated terrain output hashes without host metadata. | implemented |
| EB-TERRAIN-OLD-READER | `TF-TERRAIN-COMPATIBILITY` | `S1` | Archive-v1/v2 readers see literal format 3 and fail with unsupported-version before returning or mutating a project. | implemented |
| EB-TERRAIN-BASELINE | `TF-TERRAIN-COMPATIBILITY` | `S2` | Every retained MVP, UPD-001, and UPD-002 character, pack, archive-v1/v2, generic/Godot, offline, and cross-host regression passes unchanged. | implemented |
