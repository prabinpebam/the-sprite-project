# MVP Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-PROJECT | Project | name, schema version, pack reference, characters, theme, timestamps | verified |
| IA-CHARACTER | Character recipe | stable id, name, slot selections, token overrides, preview state | verified |
| IA-PACK | Content pack | stable id, version, assets, slots, animations, provenance | verified |
| IA-ASSET | Layer asset | slot, pixel layer, draw order, coverage, palette bindings, source record | verified |
| IA-THEME | Semantic theme | skin, hair, primary cloth, secondary cloth, leather, metal | verified |
| IA-ANIMATION | Animation descriptor | idle, walk, four directions, frames, duration, regions | verified |
| IA-PROVENANCE | Provenance and credits | author, source, license options, chosen license, asset references | verified |
| IA-EXPORT | Export package | spritesheet, animation metadata, build manifest, credits, Godot resources when selected | verified |

## Navigation

| ID | Label | Destination | Back behavior |
|---|---|---|---|
| NAV-PROJECT | Project | `VIEW-PROJECT` | Returns to the prior workflow view without discarding draft state |
| NAV-COMPOSE | Compose | `VIEW-COMPOSE` | Project remains open |
| NAV-THEME | Theme | `VIEW-THEME` | Recipe remains unchanged |
| NAV-PREVIEW | Preview | `VIEW-PREVIEW` | Playback pauses only when reduced motion requires it |
| NAV-EXPORT | Export | `VIEW-EXPORT` | No package is generated until commanded |

## Views

| ID | Name | Purpose | Information |
|---|---|---|---|
| VIEW-PROJECT | Project home | Create, name, save, reopen, and recover local work | `IA-PROJECT`, `IA-CHARACTER` |
| VIEW-COMPOSE | Composition workspace | Choose packs and layers while inspecting compatibility and provenance | `IA-PROJECT`, `IA-CHARACTER`, `IA-PACK`, `IA-ASSET`, `IA-PROVENANCE` |
| VIEW-THEME | Theme workspace | Apply project tokens and character overrides | `IA-PROJECT`, `IA-CHARACTER`, `IA-THEME` |
| VIEW-PREVIEW | Animation preview | Evaluate supported motion at pixel-perfect zoom | `IA-CHARACTER`, `IA-ANIMATION` |
| VIEW-EXPORT | Export and credits | Resolve readiness, inspect credits, and produce generic or Godot packages | `IA-PROJECT`, `IA-CHARACTER`, `IA-ANIMATION`, `IA-PROVENANCE`, `IA-EXPORT` |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-NEW-PROJECT | `VIEW-PROJECT` | button | New project | verified |
| UI-PROJECT-NAME | `VIEW-PROJECT` | textbox | Project name | verified |
| UI-CANCEL-CREATE | `VIEW-PROJECT` | button | Cancel | verified |
| UI-CREATE-PROJECT | `VIEW-PROJECT` | button | Create project | verified |
| UI-RENAME-PROJECT | `VIEW-PROJECT` | button | Rename project | verified |
| UI-SAVE-PROJECT | `VIEW-PROJECT` | button | Save project | verified |
| UI-RECOVER-PROJECT | `VIEW-PROJECT` | button | Restore safe project | verified |
| UI-PACK-SELECT | `VIEW-COMPOSE` | combobox | Content pack | verified |
| UI-SLOT-LIST | `VIEW-COMPOSE` | tablist | Character slots | verified |
| UI-ASSET-OPTION | `VIEW-COMPOSE` | radio | Asset option | verified |
| UI-CLEAR-SLOT | `VIEW-COMPOSE` | button | Clear selected slot | verified |
| UI-ASSET-DETAILS | `VIEW-COMPOSE` | region | Asset details | verified |
| UI-COVERAGE-STATUS | `VIEW-COMPOSE` | status | Composition status | verified |
| UI-THEME-PRESET | `VIEW-THEME` | radio | Theme preset | verified |
| UI-TOKEN-COLOR | `VIEW-THEME` | textbox | Token color | verified |
| UI-TOKEN-OVERRIDE | `VIEW-THEME` | checkbox | Override for this character | verified |
| UI-RESET-OVERRIDE | `VIEW-THEME` | button | Reset override | verified |
| UI-ANIMATION | `VIEW-PREVIEW` | radio | Animation | verified |
| UI-DIRECTION | `VIEW-PREVIEW` | radio | Direction | verified |
| UI-PLAYBACK | `VIEW-PREVIEW` | button | Play or pause | verified |
| UI-SPEED | `VIEW-PREVIEW` | slider | Playback speed | verified |
| UI-ZOOM | `VIEW-PREVIEW` | slider | Preview zoom | verified |
| UI-READINESS | `VIEW-EXPORT` | status | Export readiness | verified |
| UI-CREDITS | `VIEW-EXPORT` | region | Credits preview | verified |
| UI-EXPORT-GENERIC | `VIEW-EXPORT` | button | Download generic package | verified |
| UI-EXPORT-GODOT | `VIEW-EXPORT` | button | Download Godot package | verified |

## Expected Behaviors

| ID | Flow | Steps | Objective oracle | Status |
|---|---|---|---|---|
| EB-FIRST-DIALOG | `TF-FIRST-PROJECT` | `S1` | Activating New project opens a named dialog, focuses Project name, and leaves storage unchanged. | verified |
| EB-FIRST-CANCEL | `TF-FIRST-PROJECT` | `S2` | Cancel closes the dialog, returns focus to New project, and creates no project. | verified |
| EB-FIRST-NAME | `TF-FIRST-PROJECT` | `S3` | Project name accepts trimmed text; Create project remains disabled for whitespace-only input. | verified |
| EB-FIRST-CREATE | `TF-FIRST-PROJECT` | `S4` | Create project opens Project home with the exact name and a visible nonblank starter preview. | verified |
| EB-COMPOSE-NAV | `TF-COMPOSE` | `S1` | Compose navigation becomes current and the persistent preview remains nonblank without horizontal overflow. | verified |
| EB-COMPOSE-PACK | `TF-COMPOSE` | `S2` | Changing pack replaces incompatible selections with declared defaults and announces the change. | verified |
| EB-COMPOSE-SLOT | `TF-COMPOSE` | `S3` | Selecting each slot exposes only assets declared for that slot and identifies the selected asset. | verified |
| EB-COMPOSE-ASSET | `TF-COMPOSE` | `S4` | Selecting an asset changes visible preview pixels, selected state, recipe state, and status synchronously. | verified |
| EB-EDIT-CLEAR | `TF-EDIT-COMPOSITION` | `S1` | Clear removes an optional layer, changes preview pixels, and does not affect required layers. | verified |
| EB-EDIT-REPLACE | `TF-EDIT-COMPOSITION` | `S2` | Choosing another option replaces rather than stacks the slot and updates the selected control. | verified |
| EB-ASSET-PROVENANCE | `TF-EDIT-COMPOSITION` | `S3` | Asset details visibly names pack, author, source, chosen license, and idle/walk coverage for the selection. | verified |
| EB-COVERAGE | `TF-EDIT-COMPOSITION` | `S4` | Composition status lists zero blockers for a complete recipe and exact missing required slots for an incomplete recipe. | verified |
| EB-THEME-NAV | `TF-THEME` | `S1` | Theme navigation becomes current and exposes all six semantic token groups. | verified |
| EB-THEME-PRESET | `TF-THEME` | `S2` | Selecting a preset updates all token values and visibly changes the preview in one committed action. | verified |
| EB-THEME-EDIT | `TF-THEME` | `S3` | Entering a valid six-digit hex updates the named project token; invalid input exposes an inline error and does not change pixels. | verified |
| EB-THEME-OVERRIDE | `TF-THEME` | `S4` | Enabling an override stores a character value distinct from the project value and labels its source as Character. | verified |
| EB-THEME-RESET | `TF-THEME` | `S5` | Reset removes the override, restores the project token visibly, and disables Reset until another override exists. | verified |
| EB-PREVIEW-NAV | `TF-PREVIEW` | `S1` | Preview navigation becomes current and canvas dimensions remain stable during control changes. | verified |
| EB-PREVIEW-ANIMATION | `TF-PREVIEW` | `S2` | Idle exposes one stable pose; Walk advances through the declared four-frame cycle. | verified |
| EB-PREVIEW-DIRECTION | `TF-PREVIEW` | `S3` | Each direction control produces the declared orientation and remains selected through pause/play. | verified |
| EB-PREVIEW-PLAY | `TF-PREVIEW` | `S4` | Pause freezes the frame index; Play resumes from that index and accessible name reflects the next action. | verified |
| EB-PREVIEW-SPEED | `TF-PREVIEW` | `S5` | Changing speed updates the visible multiplier and measured frame interval within 20 percent. | verified |
| EB-PREVIEW-ZOOM | `TF-PREVIEW` | `S6` | Zoom changes by integer scale, uses nearest-neighbor pixels, and causes no overlap or page overflow. | verified |
| EB-SAVE | `TF-SAVE-REOPEN` | `S1` | Save writes the complete versioned project, changes status to Saved, and disables until another edit. | verified |
| EB-RELOAD | `TF-SAVE-REOPEN` | `S2` | Reload restores exact project name, selections, token values, overrides, preview state, and render hash. | verified |
| EB-RENAME | `TF-SAVE-REOPEN` | `S3` | Rename validates nonblank input, updates shell and saved record, and preserves character state. | verified |
| EB-GENERIC-READY | `TF-EXPORT-GENERIC` | `S1` | Export view shows Ready only when every required slot and provenance record is valid. | verified |
| EB-GENERIC-DOWNLOAD | `TF-EXPORT-GENERIC` | `S2` | Download produces one ZIP with spritesheet.png, animations.json, build-manifest.json, credits.json, and CREDITS.txt. | verified |
| EB-GODOT-READY | `TF-EXPORT-GODOT` | `S1` | Godot export command is enabled exactly when generic readiness passes and identifies Godot 4.x. | verified |
| EB-GODOT-DOWNLOAD | `TF-EXPORT-GODOT` | `S2` | Download adds character_sprite_frames.tres and README-GODOT.md whose regions and animation names match animations.json. | verified |
| EB-CREDITS-VIEW | `TF-INSPECT-CREDITS` | `S1` | Credits preview lists each unique selected asset source and chosen license with no unselected source. | verified |
| EB-CREDITS-CHANGE | `TF-INSPECT-CREDITS` | `S2` | Replacing a layer removes its obsolete source and adds the new source before export. | verified |
| EB-RECOVERY-BLOCK | `TF-RECOVER` | `S1` | Removing a required layer changes readiness to Blocked, lists the exact slot, and disables both downloads. | verified |
| EB-RECOVERY-RESTORE | `TF-RECOVER` | `S2` | Restore safe project replaces invalid state with valid defaults only after explicit activation and announces recovery. | verified |
| EB-SECOND-PACK | `TF-SECOND-PACK` | `S1` | Selecting the second pack updates pack ID, all compatible defaults, preview pixels, and provenance through the same controls. | verified |
| EB-SECOND-EXPORT | `TF-SECOND-PACK` | `S2` | The second-pack recipe reaches Ready and downloads the same generic file contract without a pack-specific UI. | verified |
| EB-KEYBOARD | `TF-KEYBOARD-JOURNEY` | `S1`, `S2`, `S3`, `S4`, `S5` | Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. | verified |
