# MVP User-Can Catalog

This is the complete positive capability scope. If a capability is absent, it is not silently implied. Plausible adjacent expectations are in [scope-ledger.md](scope-ledger.md).

| ID | User can statement | Scenarios | Status |
|---|---|---|---|
| UC-CREATE-PROJECT | User can create a named local project from a valid starter recipe. | `SC-FIRST-USE` | verified |
| UC-CANCEL-CREATE | User can cancel project creation without creating data. | `SC-FIRST-USE` | verified |
| UC-RENAME-PROJECT | User can rename the open project. | `SC-FIRST-USE`, `SC-RETURN` | verified |
| UC-SELECT-PACK | User can select an installed content pack and receive compatible defaults. | `SC-COMPOSE`, `SC-SECOND-PACK` | verified |
| UC-SELECT-LAYER | User can select an asset for each supported content slot. | `SC-COMPOSE` | verified |
| UC-CLEAR-LAYER | User can clear or replace a selected layer; clearing a required layer exposes an exact readiness blocker until restored. | `SC-COMPOSE`, `SC-RECOVERY` | verified |
| UC-SEE-COVERAGE | User can see required-slot, compatibility, and animation-coverage status before export. | `SC-COMPOSE`, `SC-RECOVERY` | verified |
| UC-INSPECT-ASSET | User can inspect the selected asset's pack, author, source, license, and animation coverage. | `SC-COMPOSE`, `SC-CREDITS` | verified |
| UC-APPLY-THEME | User can apply a complete project theme preset. | `SC-THEME` | verified |
| UC-EDIT-TOKEN | User can edit semantic project color tokens using accessible color controls. | `SC-THEME` | verified |
| UC-OVERRIDE-TOKEN | User can override a project token for the current character. | `SC-THEME` | verified |
| UC-RESET-OVERRIDE | User can reset a character override to the project value. | `SC-THEME` | verified |
| UC-SELECT-ANIMATION | User can select idle or walk animation. | `SC-PREVIEW` | verified |
| UC-SELECT-DIRECTION | User can preview north, east, south, or west direction. | `SC-PREVIEW` | verified |
| UC-CONTROL-PLAYBACK | User can play, pause, change speed, and change pixel-perfect zoom without layout shift. | `SC-PREVIEW` | verified |
| UC-SAVE-PROJECT | User can explicitly save the complete project recipe locally. | `SC-RETURN` | verified |
| UC-REOPEN-PROJECT | User can reload or reopen the saved project and receive the same render. | `SC-RETURN` | verified |
| UC-RECOVER-PROJECT | User can recover from incomplete or unreadable local state without silent data loss. | `SC-RECOVERY` | verified |
| UC-EXPORT-GENERIC | User can download a generic export package. | `SC-GENERIC-EXPORT` | verified |
| UC-EXPORT-GODOT | User can download a Godot 4 export package with no manual frame slicing. | `SC-GODOT-EXPORT` | verified |
| UC-SEE-READINESS | User can see export readiness and resolve each blocking item. | `SC-GENERIC-EXPORT`, `SC-GODOT-EXPORT`, `SC-RECOVERY` | verified |
| UC-INSPECT-CREDITS | User can inspect exact merged credits for the current recipe before export. | `SC-CREDITS` | verified |
| UC-EXPORT-CREDITS | User receives machine-readable and human-readable credits with every export. | `SC-CREDITS`, `SC-GENERIC-EXPORT`, `SC-GODOT-EXPORT` | verified |
| UC-USE-SECOND-PACK | User can complete the same composition, preview, persistence, and export workflow with a second pack. | `SC-SECOND-PACK` | verified |
| UC-KEYBOARD-WORKFLOW | User can complete the core create-to-export journey with keyboard-visible focus and no pointer-only control. | `SC-FIRST-USE`, `SC-COMPOSE`, `SC-THEME`, `SC-PREVIEW`, `SC-GENERIC-EXPORT` | verified |
