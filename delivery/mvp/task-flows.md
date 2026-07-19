# MVP Task Flows

A task flow is accepted only through visible interaction in the production UI. Supporting code tests do not set flow status to verified.

## TF-FIRST-PROJECT

- **Scenarios:** `SC-FIRST-USE`
- **Capabilities:** `UC-CREATE-PROJECT`, `UC-CANCEL-CREATE`
- **Preconditions:** No saved project
- **Completion:** Named project with starter render
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Activate New project | `VIEW-PROJECT` | `UI-NEW-PROJECT` | `NAV-PROJECT` | `EB-FIRST-DIALOG`: Activating New project opens a named dialog, focuses Project name, and leaves storage unchanged. |
| S2 | Cancel once and reopen | `VIEW-PROJECT` | `UI-CANCEL-CREATE` | No route change | `EB-FIRST-CANCEL`: Cancel closes the dialog, returns focus to New project, and creates no project. |
| S3 | Enter a project name | `VIEW-PROJECT` | `UI-PROJECT-NAME` | No route change | `EB-FIRST-NAME`: Project name accepts trimmed text; Create project remains disabled for whitespace-only input. |
| S4 | Create project | `VIEW-PROJECT` | `UI-CREATE-PROJECT` | No route change | `EB-FIRST-CREATE`: Create project opens Project home with the exact name and a visible nonblank starter preview. |

## TF-COMPOSE

- **Scenarios:** `SC-COMPOSE`
- **Capabilities:** `UC-SELECT-PACK`, `UC-SELECT-LAYER`
- **Preconditions:** Open valid project
- **Completion:** Complete visible recipe
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open Compose | `VIEW-COMPOSE` | `UI-COVERAGE-STATUS` | `NAV-COMPOSE` | `EB-COMPOSE-NAV`: Compose navigation becomes current and the persistent preview remains nonblank without horizontal overflow. |
| S2 | Select content pack | `VIEW-COMPOSE` | `UI-PACK-SELECT` | No route change | `EB-COMPOSE-PACK`: Changing pack replaces incompatible selections with declared defaults and announces the change. |
| S3 | Select each slot | `VIEW-COMPOSE` | `UI-SLOT-LIST` | No route change | `EB-COMPOSE-SLOT`: Selecting each slot exposes only assets declared for that slot and identifies the selected asset. |
| S4 | Choose an asset option | `VIEW-COMPOSE` | `UI-ASSET-OPTION` | No route change | `EB-COMPOSE-ASSET`: Selecting an asset changes visible preview pixels, selected state, recipe state, and status synchronously. |

## TF-EDIT-COMPOSITION

- **Scenarios:** `SC-COMPOSE`, `SC-CREDITS`
- **Capabilities:** `UC-CLEAR-LAYER`, `UC-SEE-COVERAGE`, `UC-INSPECT-ASSET`
- **Preconditions:** Complete composed character
- **Completion:** Edited recipe with accurate status and provenance
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Clear optional slot | `VIEW-COMPOSE` | `UI-CLEAR-SLOT` | `NAV-COMPOSE` | `EB-EDIT-CLEAR`: Clear removes an optional layer, changes preview pixels, and does not affect required layers. |
| S2 | Choose replacement asset | `VIEW-COMPOSE` | `UI-ASSET-OPTION` | No route change | `EB-EDIT-REPLACE`: Choosing another option replaces rather than stacks the slot and updates the selected control. |
| S3 | Inspect selected asset | `VIEW-COMPOSE` | `UI-ASSET-DETAILS` | No route change | `EB-ASSET-PROVENANCE`: Asset details visibly names pack, author, source, chosen license, and idle/walk coverage for the selection. |
| S4 | Inspect composition status | `VIEW-COMPOSE` | `UI-COVERAGE-STATUS` | No route change | `EB-COVERAGE`: Composition status lists zero blockers for a complete recipe and exact missing required slots for an incomplete recipe. |

## TF-THEME

- **Scenarios:** `SC-THEME`
- **Capabilities:** `UC-APPLY-THEME`, `UC-EDIT-TOKEN`, `UC-OVERRIDE-TOKEN`, `UC-RESET-OVERRIDE`
- **Preconditions:** Open composed character
- **Completion:** Resolved project theme and optional character override
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open Theme | `VIEW-THEME` | `UI-THEME-PRESET` | `NAV-THEME` | `EB-THEME-NAV`: Theme navigation becomes current and exposes all six semantic token groups. |
| S2 | Apply preset | `VIEW-THEME` | `UI-THEME-PRESET` | No route change | `EB-THEME-PRESET`: Selecting a preset updates all token values and visibly changes the preview in one committed action. |
| S3 | Edit token color | `VIEW-THEME` | `UI-TOKEN-COLOR` | No route change | `EB-THEME-EDIT`: Entering a valid six-digit hex updates the named project token; invalid input exposes an inline error and does not change pixels. |
| S4 | Enable character override | `VIEW-THEME` | `UI-TOKEN-OVERRIDE` | No route change | `EB-THEME-OVERRIDE`: Enabling an override stores a character value distinct from the project value and labels its source as Character. |
| S5 | Reset character override | `VIEW-THEME` | `UI-RESET-OVERRIDE` | No route change | `EB-THEME-RESET`: Reset removes the override, restores the project token visibly, and disables Reset until another override exists. |

## TF-PREVIEW

- **Scenarios:** `SC-PREVIEW`
- **Capabilities:** `UC-SELECT-ANIMATION`, `UC-SELECT-DIRECTION`, `UC-CONTROL-PLAYBACK`
- **Preconditions:** Open composed character
- **Completion:** Every required animation and direction inspected
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open Preview | `VIEW-PREVIEW` | `UI-ANIMATION` | `NAV-PREVIEW` | `EB-PREVIEW-NAV`: Preview navigation becomes current and canvas dimensions remain stable during control changes. |
| S2 | Select idle then walk | `VIEW-PREVIEW` | `UI-ANIMATION` | No route change | `EB-PREVIEW-ANIMATION`: Idle exposes one stable pose; Walk advances through the declared four-frame cycle. |
| S3 | Select every direction | `VIEW-PREVIEW` | `UI-DIRECTION` | No route change | `EB-PREVIEW-DIRECTION`: Each direction control produces the declared orientation and remains selected through pause/play. |
| S4 | Pause and resume | `VIEW-PREVIEW` | `UI-PLAYBACK` | No route change | `EB-PREVIEW-PLAY`: Pause freezes the frame index; Play resumes from that index and accessible name reflects the next action. |
| S5 | Change speed | `VIEW-PREVIEW` | `UI-SPEED` | No route change | `EB-PREVIEW-SPEED`: Changing speed updates the visible multiplier and measured frame interval within 20 percent. |
| S6 | Change zoom | `VIEW-PREVIEW` | `UI-ZOOM` | No route change | `EB-PREVIEW-ZOOM`: Zoom changes by integer scale, uses nearest-neighbor pixels, and causes no overlap or page overflow. |

## TF-SAVE-REOPEN

- **Scenarios:** `SC-RETURN`
- **Capabilities:** `UC-SAVE-PROJECT`, `UC-REOPEN-PROJECT`, `UC-RENAME-PROJECT`
- **Preconditions:** Modified project
- **Completion:** Reloaded project has identical state and render
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Save project | `VIEW-PROJECT` | `UI-SAVE-PROJECT` | `NAV-PROJECT` | `EB-SAVE`: Save writes the complete versioned project, changes status to Saved, and disables until another edit. |
| S2 | Reload page | `VIEW-PROJECT` | `UI-SAVE-PROJECT` | No route change | `EB-RELOAD`: Reload restores exact project name, selections, token values, overrides, preview state, and render hash. |
| S3 | Rename and save | `VIEW-PROJECT` | `UI-RENAME-PROJECT` | No route change | `EB-RENAME`: Rename validates nonblank input, updates shell and saved record, and preserves character state. |

## TF-EXPORT-GENERIC

- **Scenarios:** `SC-GENERIC-EXPORT`
- **Capabilities:** `UC-EXPORT-GENERIC`, `UC-SEE-READINESS`, `UC-EXPORT-CREDITS`
- **Preconditions:** Complete recipe
- **Completion:** Generic package downloaded and inspected
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open Export and inspect readiness | `VIEW-EXPORT` | `UI-READINESS` | `NAV-EXPORT` | `EB-GENERIC-READY`: Export view shows Ready only when every required slot and provenance record is valid. |
| S2 | Download generic package | `VIEW-EXPORT` | `UI-EXPORT-GENERIC` | No route change | `EB-GENERIC-DOWNLOAD`: Download produces one ZIP with spritesheet.png, animations.json, build-manifest.json, credits.json, and CREDITS.txt. |

## TF-EXPORT-GODOT

- **Scenarios:** `SC-GODOT-EXPORT`
- **Capabilities:** `UC-EXPORT-GODOT`, `UC-SEE-READINESS`, `UC-EXPORT-CREDITS`
- **Preconditions:** Complete recipe
- **Completion:** Godot package downloaded and fixture-validated
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Confirm Godot readiness | `VIEW-EXPORT` | `UI-READINESS` | `NAV-EXPORT` | `EB-GODOT-READY`: Godot export command is enabled exactly when generic readiness passes and identifies Godot 4.x. |
| S2 | Download Godot package | `VIEW-EXPORT` | `UI-EXPORT-GODOT` | No route change | `EB-GODOT-DOWNLOAD`: Download adds character_sprite_frames.tres and README-GODOT.md whose regions and animation names match animations.json. |

## TF-INSPECT-CREDITS

- **Scenarios:** `SC-CREDITS`
- **Capabilities:** `UC-INSPECT-CREDITS`, `UC-INSPECT-ASSET`, `UC-EXPORT-CREDITS`
- **Preconditions:** Character uses selected layers
- **Completion:** Visible credits exactly match selected sources
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Inspect credits preview | `VIEW-EXPORT` | `UI-CREDITS` | `NAV-EXPORT` | `EB-CREDITS-VIEW`: Credits preview lists each unique selected asset source and chosen license with no unselected source. |
| S2 | Replace one layer and return | `VIEW-COMPOSE` | `UI-ASSET-OPTION` | `NAV-COMPOSE` | `EB-CREDITS-CHANGE`: Replacing a layer removes its obsolete source and adds the new source before export. |

## TF-RECOVER

- **Scenarios:** `SC-RECOVERY`
- **Capabilities:** `UC-CLEAR-LAYER`, `UC-SEE-COVERAGE`, `UC-SEE-READINESS`, `UC-RECOVER-PROJECT`
- **Preconditions:** Open project
- **Completion:** Invalid state is blocked then explicitly restored
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Remove a required layer and inspect Export | `VIEW-EXPORT` | `UI-READINESS` | `NAV-EXPORT` | `EB-RECOVERY-BLOCK`: Removing a required layer changes readiness to Blocked, lists the exact slot, and disables both downloads. |
| S2 | Restore safe project | `VIEW-PROJECT` | `UI-RECOVER-PROJECT` | `NAV-PROJECT` | `EB-RECOVERY-RESTORE`: Restore safe project replaces invalid state with valid defaults only after explicit activation and announces recovery. |

## TF-SECOND-PACK

- **Scenarios:** `SC-SECOND-PACK`
- **Capabilities:** `UC-SELECT-PACK`, `UC-USE-SECOND-PACK`
- **Preconditions:** Open valid project
- **Completion:** Second pack follows the same complete contract
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Select second pack | `VIEW-COMPOSE` | `UI-PACK-SELECT` | `NAV-COMPOSE` | `EB-SECOND-PACK`: Selecting the second pack updates pack ID, all compatible defaults, preview pixels, and provenance through the same controls. |
| S2 | Export second-pack recipe | `VIEW-EXPORT` | `UI-EXPORT-GENERIC` | `NAV-EXPORT` | `EB-SECOND-EXPORT`: The second-pack recipe reaches Ready and downloads the same generic file contract without a pack-specific UI. |

## TF-KEYBOARD-JOURNEY

- **Scenarios:** `SC-FIRST-USE`, `SC-COMPOSE`, `SC-THEME`, `SC-PREVIEW`, `SC-GENERIC-EXPORT`
- **Capabilities:** `UC-KEYBOARD-WORKFLOW`
- **Preconditions:** No saved project; Keyboard input only
- **Completion:** Generic export command reached without pointer
- **Status:** verified

| Step | User action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Create with keyboard | `VIEW-PROJECT` | `UI-NEW-PROJECT` | `NAV-PROJECT` | `EB-KEYBOARD`: Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. |
| S2 | Compose with keyboard | `VIEW-COMPOSE` | `UI-ASSET-OPTION` | `NAV-COMPOSE` | `EB-KEYBOARD`: Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. |
| S3 | Apply theme with keyboard | `VIEW-THEME` | `UI-THEME-PRESET` | `NAV-THEME` | `EB-KEYBOARD`: Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. |
| S4 | Preview walk with keyboard | `VIEW-PREVIEW` | `UI-PLAYBACK` | `NAV-PREVIEW` | `EB-KEYBOARD`: Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. |
| S5 | Reach export with keyboard | `VIEW-EXPORT` | `UI-EXPORT-GENERIC` | `NAV-EXPORT` | `EB-KEYBOARD`: Keyboard-only interaction creates a project, changes a layer and theme, previews walk, and starts export with visible focus and no trap. |
