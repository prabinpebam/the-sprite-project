# UPD-003 Task Flows

Every flow is accepted only through public UI on its declared host.

## TF-TERRAIN-FIRST

- **Host:** shared
- **Scenarios:** `SC-TERRAIN-FIRST`
- **Capabilities:** `UC-TERRAIN-CREATE`, `UC-TERRAIN-REMOVE`, `UC-TERRAIN-SEE-TILES`, `UC-TERRAIN-SEE-READINESS`
- **Preconditions:** Project is open; No terrain document exists
- **Completion:** Optional terrain is created, inspected, and removable without character drift
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Create terrain | `VIEW-TERRAIN-EMPTY` | `UI-TERRAIN-CREATE` | `NAV-TERRAIN` | `EB-TERRAIN-CREATE`: Create terrain adds one schema-version-1 terrain document with grass defaults and leaves the character recipe, lock, pixels, and credits unchanged. |
| S2 | Inspect generated map and atlas | `VIEW-TERRAIN` | `UI-TERRAIN-ATLAS` | No route change | `EB-TERRAIN-DEFAULT`: The initial document fills a 12x8 map, displays a nonblank preview, and generates exactly sixteen 32px cardinal-mask tiles in a 128x128 atlas. |
| S3 | Choose Remove terrain | `VIEW-TERRAIN` | `UI-TERRAIN-REMOVE` | No route change | `EB-TERRAIN-REMOVE`: Remove opens a confirmation; confirmation creates a normal project snapshot on save, deletes only terrain state, and preserves character state while cancel writes nothing. |
| S4 | Confirm removal or cancel | `VIEW-TERRAIN-REMOVE` | `UI-TERRAIN-REMOVE-CONFIRM` | No route change | `EB-TERRAIN-REMOVE`: Remove opens a confirmation; confirmation creates a normal project snapshot on save, deletes only terrain state, and preserves character state while cancel writes nothing. |

## TF-TERRAIN-PAINT

- **Host:** shared
- **Scenarios:** `SC-TERRAIN-PAINT`
- **Capabilities:** `UC-TERRAIN-CHOOSE-MATERIAL`, `UC-TERRAIN-PAINT`, `UC-TERRAIN-FILL`, `UC-TERRAIN-SEE-TILES`
- **Preconditions:** Terrain exists
- **Completion:** Painted map and complete autotile set reflect exact cardinal masks
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Choose material | `VIEW-TERRAIN` | `UI-TERRAIN-MATERIAL` | `NAV-TERRAIN` | `EB-TERRAIN-MATERIAL`: Selecting grass, dirt, sand, or stone changes stable material identity, derived defaults, atlas pixels, preview pixels, and credits in one edit. |
| S2 | Paint and erase cells | `VIEW-TERRAIN` | `UI-TERRAIN-CELL` | No route change | `EB-TERRAIN-PAINT`: Toggling a cell changes only that occupancy value and recomputes its cardinal mask plus the four direct neighbors. |
| S3 | Fill then clear map | `VIEW-TERRAIN` | `UI-TERRAIN-FILL` | No route change | `EB-TERRAIN-FILL-CLEAR`: Fill makes all 96 cells occupied; Clear makes all cells empty; both are one undoable project edit and never resize the grid. |
| S4 | Inspect masks and deterministic hashes | `VIEW-TERRAIN` | `UI-TERRAIN-MAP` | No route change | `EB-TERRAIN-MASKS`: Atlas and map expose mask IDs 0 through 15 using N=1, E=2, S=4, W=8; identical documents produce identical hashes. |

## TF-TERRAIN-THEME

- **Host:** shared
- **Scenarios:** `SC-TERRAIN-THEME`
- **Capabilities:** `UC-TERRAIN-RECOLOR`, `UC-TERRAIN-RESET-THEME`
- **Preconditions:** Terrain and character exist
- **Completion:** Terrain matches project mood without changing character semantics
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Reset terrain theme from project | `VIEW-TERRAIN` | `UI-TERRAIN-RESET` | `NAV-TERRAIN` | `EB-TERRAIN-THEME-DERIVE`: Reset derives four terrain colors deterministically from the active project theme without adding or changing global character token fields. |
| S2 | Edit terrain colors and correct invalid input | `VIEW-TERRAIN` | `UI-TERRAIN-COLOR` | No route change | `EB-TERRAIN-THEME-EDIT`: A valid #RRGGBB terrain color updates atlas and map pixels; invalid text stays visible, reports an adjacent error, and does not mutate committed terrain. |
| S3 | Compare character state and hash | `VIEW-TERRAIN` | `UI-TERRAIN-STATUS` | No route change | `EB-TERRAIN-THEME-ISOLATE`: Terrain-local overrides never change character theme values, selected assets, character render hash, or character export hash. |

## TF-TERRAIN-RETURN

- **Host:** web
- **Scenarios:** `SC-TERRAIN-RETURN`
- **Capabilities:** `UC-TERRAIN-SAVE`, `UC-TERRAIN-REOPEN`, `UC-TERRAIN-RECOVER`, `UC-TERRAIN-WORK-OFFLINE`
- **Preconditions:** Browser project contains terrain
- **Completion:** Terrain persists, conflicts safely, and remains usable offline
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Edit and wait for autosave | `VIEW-TERRAIN` | `UI-TERRAIN-STATUS` | `NAV-TERRAIN` | `EB-TERRAIN-AUTOSAVE`: A terrain edit marks Unsaved in one frame and commits through the existing 750ms project revision transaction with a prior snapshot. |
| S2 | Reload project | `VIEW-TERRAIN` | `UI-TERRAIN-MAP` | No route change | `EB-TERRAIN-REOPEN`: Reload or relaunch restores the exact terrain document, map occupancy, atlas hash, map hash, and unchanged character hash. |
| S3 | Resolve stale-tab conflict | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | `NAV-TERRAIN-STORAGE` | `EB-TERRAIN-CONFLICT`: A stale terrain edit writes nothing and offers the existing reload, overwrite-with-checkpoint, save-copy, or cancel choices. |
| S4 | Restart offline and continue | `VIEW-TERRAIN` | `UI-TERRAIN-MAP` | No route change | `EB-TERRAIN-OFFLINE`: After one controlled load, terrain paint, theme, save, reopen, backup, and export complete with zero required network requests. |

## TF-TERRAIN-EXPORT

- **Host:** shared
- **Scenarios:** `SC-TERRAIN-EXPORT`
- **Capabilities:** `UC-TERRAIN-EXPORT-GENERIC`, `UC-TERRAIN-EXPORT-GODOT`, `UC-TERRAIN-SEE-READINESS`
- **Preconditions:** Terrain document exists
- **Completion:** Generic and Godot terrain packages are complete and credited
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S0 | Open terrain export | `VIEW-TERRAIN` | `UI-TERRAIN-EXPORT-NAV` | `NAV-TERRAIN-EXPORT` | `EB-TERRAIN-EXPORT-NAV`: Open terrain export preserves the terrain document and shows current readiness, atlas identity, and credits before enabling commands. |
| S1 | Export generic terrain package | `VIEW-TERRAIN-EXPORT` | `UI-TERRAIN-EXPORT-GENERIC` | No route change | `EB-TERRAIN-GENERIC`: Generic export emits terrain-atlas.png, terrain-manifest.json, build-manifest.json, credits.json, and CREDITS.txt with exact 32px regions for all sixteen masks. |
| S2 | Export Godot terrain package | `VIEW-TERRAIN-EXPORT` | `UI-TERRAIN-EXPORT-GODOT` | No route change | `EB-TERRAIN-GODOT`: Godot export adds terrain_tileset.tres and README-GODOT-TERRAIN.md whose atlas coordinates, tile size, source ID, and terrain peering bits match the manifest. |
| S3 | Inspect terrain credits | `VIEW-TERRAIN-EXPORT` | `UI-TERRAIN-CREDITS` | No route change | `EB-TERRAIN-CREDITS`: Terrain credits name generator source, author, CC0 license, material ID, and project identity with no unselected material. |
| S4 | Attempt export with invalid color | `VIEW-TERRAIN-EXPORT` | `UI-TERRAIN-EXPORT-GENERIC` | No route change | `EB-TERRAIN-EXPORT-BLOCK`: Invalid palette, schema, or empty required atlas state blocks both commands, names exact issues, and emits no partial download or filesystem output. |

## TF-TERRAIN-DESKTOP

- **Host:** desktop
- **Scenarios:** `SC-TERRAIN-DESKTOP`
- **Capabilities:** `UC-TERRAIN-SAVE`, `UC-TERRAIN-REOPEN`, `UC-TERRAIN-EXPORT-DIRECT`
- **Preconditions:** Packaged Electron host is open
- **Completion:** Terrain project and outputs use secure native locations
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open terrain project | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | `NAV-TERRAIN-STORAGE` | `EB-TERRAIN-DESKTOP-OPEN`: Packaged Electron opens archive-v3 or folder terrain through existing opaque project grants with no new renderer path authority. |
| S2 | Save terrain project | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | No route change | `EB-TERRAIN-DESKTOP-SAVE`: Desktop save writes terrain.json atomically with the complete graph and fingerprints it for external-change detection. |
| S3 | Write terrain outputs | `VIEW-TERRAIN-EXPORT` | `UI-TERRAIN-EXPORT-GODOT` | `NAV-TERRAIN-EXPORT` | `EB-TERRAIN-DESKTOP-EXPORT`: Desktop generic and Godot terrain exports write only canonical relative entries to the approved export directory and read back successfully. |
| S4 | Close with dirty terrain | `VIEW-TERRAIN` | `UI-TERRAIN-STATUS` | No route change | `EB-TERRAIN-UNSAVED-CLOSE`: Terrain edits participate in the existing Save, Discard, or Cancel close contract without a producer-specific bypass. |

## TF-TERRAIN-CROSS-HOST

- **Host:** cross-host
- **Scenarios:** `SC-TERRAIN-CROSS-HOST`
- **Capabilities:** `UC-TERRAIN-TRANSFER`, `UC-TERRAIN-REOPEN`
- **Preconditions:** Terrain project exists on one host
- **Completion:** Terrain round trips with exact semantic and output parity
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Export archive-v3 project | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | `NAV-TERRAIN-STORAGE` | `EB-TERRAIN-ARCHIVE-V3`: A terrain project writes archive format 3 with terrain.json in the complete manifest; character-only archives remain byte-compatible v1/v2. |
| S2 | Open on other host | `VIEW-TERRAIN` | `UI-TERRAIN-MAP` | `NAV-TERRAIN` | `EB-TERRAIN-CROSS-OPEN`: The other host opens terrain only after checksum and strict terrain schema validation and renders identical atlas/map hashes. |
| S3 | Re-export and return | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | No route change | `EB-TERRAIN-CROSS-RETURN`: Unedited re-export preserves terrain document semantics, character semantics, and all generated terrain output hashes without host metadata. |

## TF-TERRAIN-COMPATIBILITY

- **Host:** shared
- **Scenarios:** `SC-TERRAIN-COMPATIBILITY`
- **Capabilities:** `UC-TERRAIN-REOPEN`, `UC-TERRAIN-RECOVER`
- **Preconditions:** Baseline character fixtures and old reader exist
- **Completion:** Terrain is fail-closed for old hosts and invisible to character-only outputs
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open archive-v3 with old reader | `VIEW-STORAGE` | `UI-TERRAIN-BACKUP` | `NAV-TERRAIN-STORAGE` | `EB-TERRAIN-OLD-READER`: Archive-v1/v2 readers see literal format 3 and fail with unsupported-version before returning or mutating a project. |
| S2 | Run all retained regressions | `VIEW-TERRAIN` | `UI-TERRAIN-STATUS` | `NAV-TERRAIN` | `EB-TERRAIN-BASELINE`: Every retained MVP, UPD-001, and UPD-002 character, pack, archive-v1/v2, generic/Godot, offline, and cross-host regression passes unchanged. |
