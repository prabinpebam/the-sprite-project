# UPD-004 Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-CHARACTER-COLLECTION | Character collection | ordered recipe IDs, active recipe ID, capacity | implemented |
| IA-CHARACTER-RECIPE | Character recipe | stable ID, unique name, pack ID, selections, overrides | implemented |
| IA-ACTIVE-CHARACTER | Active character context | name, readiness, preview, export target | implemented |
| IA-PROJECT-SAVE | Atomic project save | project, recipe records, terrain, revision, snapshot | implemented |

## Navigation

| ID | Label | Destination | Back behavior | Status |
|---|---|---|---|---|
| NAV-CHARACTER-PROJECT | Project | `VIEW-CHARACTER-COLLECTION` | Active recipe and edits remain | implemented |
| NAV-CHARACTER-EDIT | Edit character | `VIEW-COMPOSE` | Returns to collection with active recipe | implemented |
| NAV-CHARACTER-STORAGE | Storage | `VIEW-STORAGE` | Collection remains in graph | implemented |
| NAV-CHARACTER-EXPORT | Export | `VIEW-EXPORT` | Active character remains selected | implemented |

## Views

| ID | Name | Purpose | Information | Status |
|---|---|---|---|---|
| VIEW-CHARACTER-COLLECTION | Project character collection | List, activate, create, and manage characters | `IA-CHARACTER-COLLECTION`, `IA-CHARACTER-RECIPE`, `IA-ACTIVE-CHARACTER` | implemented |
| VIEW-CHARACTER-NAME | Character name dialog | Create, duplicate, or rename with validation | `IA-CHARACTER-RECIPE` | implemented |
| VIEW-CHARACTER-DELETE | Delete character confirmation | Confirm isolated recoverable deletion | `IA-CHARACTER-RECIPE`, `IA-PROJECT-SAVE` | implemented |
| VIEW-COMPOSE | Existing compose view | Edit active recipe | `IA-ACTIVE-CHARACTER`, `IA-CHARACTER-RECIPE` | implemented |
| VIEW-STORAGE | Existing storage view | Save, restore, and transfer complete graph | `IA-PROJECT-SAVE`, `IA-CHARACTER-COLLECTION` | implemented |
| VIEW-EXPORT | Existing character export view | Export active character explicitly | `IA-ACTIVE-CHARACTER` | implemented |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-CHARACTER-LIST | `VIEW-CHARACTER-COLLECTION` | list | Project characters | implemented |
| UI-CHARACTER-CREATE | `VIEW-CHARACTER-COLLECTION` | button | Create character | implemented |
| UI-CHARACTER-OPEN | `VIEW-CHARACTER-COLLECTION` | button | Open character | implemented |
| UI-CHARACTER-EDIT | `VIEW-CHARACTER-COLLECTION` | button | Edit active character | implemented |
| UI-CHARACTER-DUPLICATE | `VIEW-CHARACTER-COLLECTION` | button | Duplicate character | implemented |
| UI-CHARACTER-RENAME | `VIEW-CHARACTER-COLLECTION` | button | Rename character | implemented |
| UI-CHARACTER-DELETE | `VIEW-CHARACTER-COLLECTION` | button | Delete character | implemented |
| UI-CHARACTER-NAME | `VIEW-CHARACTER-NAME` | textbox | Character name | implemented |
| UI-CHARACTER-NAME-CONFIRM | `VIEW-CHARACTER-NAME` | button | Confirm character | implemented |
| UI-CHARACTER-DELETE-CONFIRM | `VIEW-CHARACTER-DELETE` | button | Delete character permanently | implemented |
| UI-ACTIVE-CHARACTER-STATUS | `VIEW-COMPOSE` | status | Active character | implemented |
| UI-CHARACTER-SAVE | `VIEW-STORAGE` | button | Save project | implemented |
| UI-CHARACTER-RESTORE | `VIEW-STORAGE` | button | Restore recovery point | implemented |
| UI-CHARACTER-EXPORT | `VIEW-EXPORT` | button | Download generic package | implemented |

## Expected Behaviors

| ID | Flow | Steps | Oracle | Status |
|---|---|---|---|---|
| EB-CHARACTER-LIST | `TF-CHARACTER-CREATE` | `S1` | Project view lists every recipe once with name, pack, readiness, and exactly one visible Active label plus aria-current=true. | implemented |
| EB-CHARACTER-CREATE-VALIDATE | `TF-CHARACTER-CREATE` | `S2` | Blank, case-insensitive duplicate, over-80, and seventeenth character attempts keep the modal/draft open, show an adjacent error, and write nothing. | implemented |
| EB-CHARACTER-CREATE | `TF-CHARACTER-CREATE` | `S3` | Valid create appends one default recipe with a new ID, activates it, marks Unsaved, and preserves siblings and terrain. | implemented |
| EB-CHARACTER-SWITCH | `TF-CHARACTER-SWITCH-EDIT` | `S1` | Open character changes only active ID/project timestamp, updates named preview context, and marks Unsaved. | implemented |
| EB-CHARACTER-EDIT | `TF-CHARACTER-SWITCH-EDIT` | `S2` | Composition and overrides mutate only the active recipe while sibling and terrain canonical bytes stay equal. | implemented |
| EB-CHARACTER-EXPORT | `TF-CHARACTER-SWITCH-EDIT` | `S3` | Character export names and contains the active recipe only; switching produces that sibling's distinct output. | implemented |
| EB-CHARACTER-DUPLICATE | `TF-CHARACTER-MANAGE` | `S0`, `S1` | Duplicate prefill uses unique '<name> copy' then the smallest suffix 2+, deep-copies source pack/selections/overrides under a new ID/name, appends and activates it, and preserves source bytes. | implemented |
| EB-CHARACTER-RENAME | `TF-CHARACTER-MANAGE` | `S2` | Rename changes only selected recipe name and project timestamp; invalid name writes nothing. | implemented |
| EB-CHARACTER-DELETE-CANCEL | `TF-CHARACTER-MANAGE` | `S3` | Delete dialog names exact character/pack; Cancel restores trigger focus and graph equality. | implemented |
| EB-CHARACTER-DELETE | `TF-CHARACTER-MANAGE` | `S4` | Delete removes only target, blocks sole deletion, and active deletion selects next then previous deterministically. | implemented |
| EB-CHARACTER-RESTORE | `TF-CHARACTER-MANAGE` | `S5` | Snapshot restore returns deleted recipe, order, active ID, sibling bytes, and terrain exactly. | implemented |
| EB-CHARACTER-AUTOSAVE | `TF-CHARACTER-RETURN` | `S1` | Collection edit uses existing 750ms revision transaction with one pre-replacement snapshot. | implemented |
| EB-CHARACTER-REOPEN | `TF-CHARACTER-RETURN` | `S2` | Reload restores all recipe names/order/state, active ID, and terrain hashes exactly. | implemented |
| EB-CHARACTER-CONFLICT | `TF-CHARACTER-RETURN` | `S3` | Stale collection write stores nothing and exposes existing reload/overwrite checkpoint/save-copy/cancel choices. | implemented |
| EB-CHARACTER-OFFLINE | `TF-CHARACTER-RETURN` | `S4` | Installed web app creates, switches, saves, reopens, and exports characters with zero required network requests. | implemented |
| EB-CHARACTER-DESKTOP-OPEN | `TF-CHARACTER-DESKTOP` | `S1` | Packaged Electron opens all recipe files through existing opaque grants and shows correct active character. | implemented |
| EB-CHARACTER-DESKTOP-SAVE | `TF-CHARACTER-DESKTOP` | `S2` | Desktop save writes one file per listed recipe, removes stale canonical recipe files, and fingerprints complete inventory. | implemented |
| EB-CHARACTER-DESKTOP-CONFLICT | `TF-CHARACTER-DESKTOP` | `S3` | External edit to any recipe file causes existing conflict flow before overwrite. | implemented |
| EB-CHARACTER-UNSAVED-CLOSE | `TF-CHARACTER-DESKTOP` | `S4` | Collection edits participate in existing Save/Discard/Cancel close without new IPC or bypass. | implemented |
| EB-CHARACTER-ARCHIVE | `TF-CHARACTER-CROSS-HOST` | `S1` | Archive inventories exactly one recipe file per recipe ID and retains optional terrain/embedded packs. | implemented |
| EB-CHARACTER-CROSS-OPEN | `TF-CHARACTER-CROSS-HOST` | `S2` | Other host validates every recipe before rendering and matches all recipe/terrain hashes. | implemented |
| EB-CHARACTER-CROSS-RETURN | `TF-CHARACTER-CROSS-HOST` | `S3` | Unedited return preserves project/recipe/terrain semantics and active-character exports without host metadata. | implemented |
| EB-CHARACTER-OLD-READER | `TF-CHARACTER-CROSS-HOST` | `S4` | Single-character baseline reader rejects multi-character project schema before graph return or mutation. | implemented |
| EB-CHARACTER-BASELINE | `TF-CHARACTER-REGRESSION` | `S1` | Every retained one-character, pack, terrain, archive, export, offline, and host flow passes unchanged. | implemented |
| EB-CHARACTER-PERFORMANCE | `TF-CHARACTER-REGRESSION` | `S2` | 100 visible switches have p95 <=50ms and 16-recipe save/reopen <=2s with no task >100ms. | implemented |
