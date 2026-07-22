# UPD-004 Task Flows

Every flow is accepted only through public UI on its declared host.

## TF-CHARACTER-CREATE

- **Host:** shared
- **Scenarios:** `SC-CHARACTER-CREATE`
- **Capabilities:** `UC-CHARACTER-LIST`, `UC-CHARACTER-CREATE`
- **Preconditions:** Project has one character
- **Completion:** A second named default character is active without sibling or terrain drift
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Inspect collection | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-LIST` | `NAV-CHARACTER-PROJECT` | `EB-CHARACTER-LIST`: Project view lists every recipe once with name, pack, readiness, and exactly one visible Active label plus aria-current=true. |
| S2 | Open create and test invalid names | `VIEW-CHARACTER-NAME` | `UI-CHARACTER-NAME` | No route change | `EB-CHARACTER-CREATE-VALIDATE`: Blank, case-insensitive duplicate, over-80, and seventeenth character attempts keep the modal/draft open, show an adjacent error, and write nothing. |
| S3 | Confirm valid character | `VIEW-CHARACTER-NAME` | `UI-CHARACTER-NAME-CONFIRM` | No route change | `EB-CHARACTER-CREATE`: Valid create appends one default recipe with a new ID, activates it, marks Unsaved, and preserves siblings and terrain. |

## TF-CHARACTER-SWITCH-EDIT

- **Host:** shared
- **Scenarios:** `SC-CHARACTER-SWITCH-EDIT`
- **Capabilities:** `UC-CHARACTER-SWITCH`, `UC-CHARACTER-EDIT`, `UC-CHARACTER-EXPORT-ACTIVE`
- **Preconditions:** At least two characters exist
- **Completion:** Active character edits and exports distinctly while sibling remains unchanged
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open another character | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-OPEN` | `NAV-CHARACTER-PROJECT` | `EB-CHARACTER-SWITCH`: Open character changes only active ID/project timestamp, updates named preview context, and marks Unsaved. |
| S2 | Choose Edit active character, then change composition and override | `VIEW-COMPOSE` | `UI-CHARACTER-EDIT` | `NAV-CHARACTER-EDIT` | `EB-CHARACTER-EDIT`: Composition and overrides mutate only the active recipe while sibling and terrain canonical bytes stay equal. |
| S3 | Export active then switch and export sibling | `VIEW-EXPORT` | `UI-CHARACTER-EXPORT` | `NAV-CHARACTER-EXPORT` | `EB-CHARACTER-EXPORT`: Character export names and contains the active recipe only; switching produces that sibling's distinct output. |

## TF-CHARACTER-MANAGE

- **Host:** shared
- **Scenarios:** `SC-CHARACTER-MANAGE`
- **Capabilities:** `UC-CHARACTER-DUPLICATE`, `UC-CHARACTER-RENAME`, `UC-CHARACTER-DELETE`, `UC-CHARACTER-RESTORE`
- **Preconditions:** Collection has at least two characters
- **Completion:** Duplicate/rename/delete are isolated and deletion is recoverable
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S0 | Choose Duplicate character | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-DUPLICATE` | No route change | `EB-CHARACTER-DUPLICATE`: Duplicate prefill uses unique '<name> copy' then the smallest suffix 2+, deep-copies source pack/selections/overrides under a new ID/name, appends and activates it, and preserves source bytes. |
| S1 | Confirm duplicate name | `VIEW-CHARACTER-NAME` | `UI-CHARACTER-NAME-CONFIRM` | No route change | `EB-CHARACTER-DUPLICATE`: Duplicate prefill uses unique '<name> copy' then the smallest suffix 2+, deep-copies source pack/selections/overrides under a new ID/name, appends and activates it, and preserves source bytes. |
| S1A | Choose Rename character | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-RENAME` | No route change | `EB-CHARACTER-RENAME`: Rename changes only selected recipe name and project timestamp; invalid name writes nothing. |
| S2 | Enter and confirm a unique name | `VIEW-CHARACTER-NAME` | `UI-CHARACTER-NAME` | No route change | `EB-CHARACTER-RENAME`: Rename changes only selected recipe name and project timestamp; invalid name writes nothing. |
| S3 | Open delete and cancel | `VIEW-CHARACTER-DELETE` | `UI-CHARACTER-DELETE` | No route change | `EB-CHARACTER-DELETE-CANCEL`: Delete dialog names exact character/pack; Cancel restores trigger focus and graph equality. |
| S4 | Confirm delete | `VIEW-CHARACTER-DELETE` | `UI-CHARACTER-DELETE-CONFIRM` | No route change | `EB-CHARACTER-DELETE`: Delete removes only target, blocks sole deletion, and active deletion selects next then previous deterministically. |
| S5 | Restore project snapshot | `VIEW-STORAGE` | `UI-CHARACTER-RESTORE` | `NAV-CHARACTER-STORAGE` | `EB-CHARACTER-RESTORE`: Snapshot restore returns deleted recipe, order, active ID, sibling bytes, and terrain exactly. |

## TF-CHARACTER-RETURN

- **Host:** web
- **Scenarios:** `SC-CHARACTER-RETURN`
- **Capabilities:** `UC-CHARACTER-SAVE`, `UC-CHARACTER-RESTORE`, `UC-CHARACTER-OFFLINE`
- **Preconditions:** Browser project has multiple characters
- **Completion:** Collection persists, conflicts safely, and works offline
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Edit and autosave | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-SAVE` | No route change | `EB-CHARACTER-AUTOSAVE`: Collection edit uses existing 750ms revision transaction with one pre-replacement snapshot. |
| S2 | Reload | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-LIST` | No route change | `EB-CHARACTER-REOPEN`: Reload restores all recipe names/order/state, active ID, and terrain hashes exactly. |
| S3 | Resolve stale-tab save | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | `NAV-CHARACTER-STORAGE` | `EB-CHARACTER-CONFLICT`: Stale collection write stores nothing and exposes existing reload/overwrite checkpoint/save-copy/cancel choices. |
| S4 | Restart offline and manage collection | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-CREATE` | No route change | `EB-CHARACTER-OFFLINE`: Installed web app creates, switches, saves, reopens, and exports characters with zero required network requests. |

## TF-CHARACTER-DESKTOP

- **Host:** desktop
- **Scenarios:** `SC-CHARACTER-DESKTOP`
- **Capabilities:** `UC-CHARACTER-SAVE`, `UC-CHARACTER-SWITCH`
- **Preconditions:** Packaged Electron is open
- **Completion:** Folder collection saves and detects external recipe edits securely
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Open folder project | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | `NAV-CHARACTER-STORAGE` | `EB-CHARACTER-DESKTOP-OPEN`: Packaged Electron opens all recipe files through existing opaque grants and shows correct active character. |
| S2 | Delete recipe and save | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | No route change | `EB-CHARACTER-DESKTOP-SAVE`: Desktop save writes one file per listed recipe, removes stale canonical recipe files, and fingerprints complete inventory. |
| S3 | Externally edit a recipe and save | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | No route change | `EB-CHARACTER-DESKTOP-CONFLICT`: External edit to any recipe file causes existing conflict flow before overwrite. |
| S4 | Close with collection edits | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-LIST` | No route change | `EB-CHARACTER-UNSAVED-CLOSE`: Collection edits participate in existing Save/Discard/Cancel close without new IPC or bypass. |

## TF-CHARACTER-CROSS-HOST

- **Host:** cross-host
- **Scenarios:** `SC-CHARACTER-CROSS-HOST`
- **Capabilities:** `UC-CHARACTER-TRANSFER`, `UC-CHARACTER-EXPORT-ACTIVE`
- **Preconditions:** Three-character project with terrain exists
- **Completion:** Collection round trips with exact active and output parity
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Export project archive | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | `NAV-CHARACTER-STORAGE` | `EB-CHARACTER-ARCHIVE`: Archive inventories exactly one recipe file per recipe ID and retains optional terrain/embedded packs. |
| S2 | Open on other host | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-LIST` | `NAV-CHARACTER-PROJECT` | `EB-CHARACTER-CROSS-OPEN`: Other host validates every recipe before rendering and matches all recipe/terrain hashes. |
| S3 | Re-export and return | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | No route change | `EB-CHARACTER-CROSS-RETURN`: Unedited return preserves project/recipe/terrain semantics and active-character exports without host metadata. |
| S4 | Open with old reader | `VIEW-STORAGE` | `UI-CHARACTER-SAVE` | No route change | `EB-CHARACTER-OLD-READER`: Single-character baseline reader rejects multi-character project schema before graph return or mutation. |

## TF-CHARACTER-REGRESSION

- **Host:** shared
- **Scenarios:** `SC-CHARACTER-SWITCH-EDIT`, `SC-CHARACTER-RETURN`, `SC-CHARACTER-DESKTOP`, `SC-CHARACTER-CROSS-HOST`
- **Capabilities:** `UC-CHARACTER-EDIT`, `UC-CHARACTER-SAVE`, `UC-CHARACTER-TRANSFER`
- **Preconditions:** Baseline fixtures and hosts exist
- **Completion:** Existing single-character and terrain promises do not drift
- **Status:** implemented

| Step | Action | View | UI | Navigation | Expected behavior |
|---|---|---|---|---|---|
| S1 | Run retained product flows | `VIEW-CHARACTER-COLLECTION` | `UI-ACTIVE-CHARACTER-STATUS` | No route change | `EB-CHARACTER-BASELINE`: Every retained one-character, pack, terrain, archive, export, offline, and host flow passes unchanged. |
| S2 | Measure switching and max collection save | `VIEW-CHARACTER-COLLECTION` | `UI-CHARACTER-OPEN` | No route change | `EB-CHARACTER-PERFORMANCE`: 100 visible switches have p95 <=50ms and 16-recipe save/reopen <=2s with no task >100ms. |
