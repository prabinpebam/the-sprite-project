# UPD-001 Task Flows

Every flow is accepted only through visible interaction on its declared host. The verified MVP flows remain regression obligations.

## TF-WEB-PROJECT-LIBRARY

- **Host:** web
- **Scenarios:** `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY`
- **Capabilities:** `UC-WEB-OPEN-ZERO-INSTALL`, `UC-WEB-CREATE-PROJECT`, `UC-WEB-LIST-PROJECTS`, `UC-WEB-OPEN-PROJECT`, `UC-WEB-RENAME-PROJECT`, `UC-WEB-DELETE-PROJECT`
- **Preconditions:** GitHub Pages application loaded
- **Completion:** Browser project library manages several projects without cross-project mutation
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open Projects | `VIEW-PROJECTS` | `UI-PROJECT-LIBRARY` | `NAV-PROJECTS` | `EB-WEB-LIBRARY-LOAD`: Projects view lists exactly the IndexedDB projects ordered by updated time and shows name, pack state, save state, and last update. |
| S2 | Create a project | `VIEW-PROJECTS` | `UI-WEB-NEW-PROJECT` | No route change | `EB-WEB-LIBRARY-CREATE`: New project commits one valid IndexedDB record and adds one selected library item without changing existing projects. |
| S3 | Open another project | `VIEW-PROJECTS` | `UI-PROJECT-CARD` | No route change | `EB-WEB-LIBRARY-OPEN`: Open project loads the selected stable ID and exact render while every other project remains unchanged. |
| S4 | Rename selected project | `VIEW-PROJECTS` | `UI-PROJECT-RENAME` | No route change | `EB-WEB-LIBRARY-RENAME`: Rename changes only the project name, preserves stable ID and render hash, and updates the library after transaction success. |
| S5 | Cancel then confirm deletion | `VIEW-PROJECTS` | `UI-PROJECT-DELETE` | No route change | `EB-WEB-LIBRARY-DELETE`: Delete requires explicit project-name confirmation; Cancel changes nothing and Confirm removes only the selected project and declared snapshots. |

## TF-WEB-AUTOSAVE-REOPEN

- **Host:** web
- **Scenarios:** `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY`
- **Capabilities:** `UC-WEB-AUTOSAVE-IDB`, `UC-WEB-RESTORE-SESSION`, `UC-WEB-INSPECT-STORAGE`
- **Preconditions:** IndexedDB project open
- **Completion:** Semantic edit persists transactionally and restores exactly
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Make a semantic edit | `VIEW-WORKSPACE` | `UI-WORKSPACE-EDIT` | `NAV-WORKSPACE` | `EB-WEB-AUTOSAVE-DIRTY`: A semantic edit changes status from Saved to Unsaved then Saving without blocking continued editing. |
| S2 | Observe autosave | `VIEW-WORKSPACE` | `UI-SAVE-STATUS` | No route change | `EB-WEB-AUTOSAVE-COMMIT`: One atomic IndexedDB transaction advances revision, retains the prior known-good snapshot, and changes status to Saved only after read-back. |
| S3 | Reload and reopen project | `VIEW-PROJECTS` | `UI-PROJECT-CARD` | `NAV-PROJECTS` | `EB-WEB-AUTOSAVE-REOPEN`: Browser reload restores exact project ID, recipe, theme, preview state, revision, and render hash. |
| S4 | Inspect storage state | `VIEW-STORAGE` | `UI-STORAGE-STATUS` | `NAV-STORAGE` | `EB-WEB-STORAGE-STATUS`: Storage view reports IndexedDB location, persistence result, approximate usage and quota, latest revision, and snapshot time without promising cloud backup. |

## TF-WEB-BACKUP-RESTORE

- **Host:** web
- **Scenarios:** `SC-WEB-BACKUP-RESTORE`
- **Capabilities:** `UC-WEB-EXPORT-ARCHIVE`, `UC-WEB-IMPORT-ARCHIVE`
- **Preconditions:** Valid browser project
- **Completion:** Archive restores the project after browser project storage is cleared
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export project backup | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-WEB-ARCHIVE-EXPORT`: Export downloads one .spriteproject archive with versioned manifest, project, pack locks, provenance, owned imports, and verified checksums. |
| S2 | Choose backup for import | `VIEW-STORAGE` | `UI-IMPORT-ARCHIVE` | No route change | `EB-WEB-ARCHIVE-INSPECT`: Import validates entries, expansion bounds, checksums, schema versions, project summary, and required packs before enabling commit. |
| S3 | Resolve project ID conflict | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-CONFLICT` | No route change | `EB-WEB-ARCHIVE-CONFLICT`: An existing project ID requires Replace, Import as copy, or Cancel; no option is precommitted before user activation. |
| S4 | Import after clearing project storage | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-SUMMARY` | No route change | `EB-WEB-ARCHIVE-RESTORE`: After browser project storage is cleared, import restores exact semantic data, render hash, credits, and export metadata. |

## TF-WEB-OFFLINE

- **Host:** web
- **Scenarios:** `SC-WEB-OFFLINE`
- **Capabilities:** `UC-WEB-WORK-OFFLINE`, `UC-WEB-OPEN-PROJECT`
- **Preconditions:** App and selected packs loaded online once
- **Completion:** Installed project workflow and exports complete offline
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Restart while offline | `VIEW-HOST-START` | `UI-OFFLINE-STATUS` | No route change | `EB-WEB-OFFLINE-START`: After one online load, an offline restart opens the cached app shell and visibly reports Offline. |
| S2 | Open installed project | `VIEW-PROJECTS` | `UI-PROJECT-CARD` | `NAV-PROJECTS` | `EB-WEB-OFFLINE-PROJECT`: An installed project and all installed pack content open and render with zero failed required network requests. |
| S3 | Export files offline | `VIEW-EXPORT` | `UI-EXPORT-GENERIC` | `NAV-EXPORT` | `EB-WEB-OFFLINE-EXPORT`: Generic and Godot downloads complete offline with the same hashes as the online project. |

## TF-DESKTOP-PORTABLE-LAUNCH

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-PORTABLE-LAUNCH`
- **Capabilities:** `UC-DESKTOP-LAUNCH-PORTABLE`, `UC-DESKTOP-SEE-HOST`, `UC-DESKTOP-OPEN-RECENT`
- **Preconditions:** Portable Windows x64 ZIP extracted
- **Completion:** Desktop host opens with correct capabilities and recent-folder state
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Launch portable executable | `VIEW-HOST-START` | `UI-HOST-IDENTITY` | No route change | `EB-DESKTOP-LAUNCH`: The extracted Windows x64 executable launches without installation or administrator rights and identifies its version. |
| S2 | Inspect host capabilities | `VIEW-HOST-START` | `UI-HOST-IDENTITY` | No route change | `EB-DESKTOP-CAPABILITIES`: Host status identifies Desktop and exposes folder actions while the renderer has no direct Node.js globals. |
| S3 | Inspect and open recent folder | `VIEW-HOST-START` | `UI-DESKTOP-RECENT` | No route change | `EB-DESKTOP-RECENT`: Recent list shows valid user-opened project folders; selecting a missing entry reports it and offers removal without creating files. |

## TF-DESKTOP-PROJECT-FOLDER

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-PROJECT-FOLDER`
- **Capabilities:** `UC-DESKTOP-CREATE-FOLDER`, `UC-DESKTOP-OPEN-FOLDER`, `UC-DESKTOP-SAVE-ATOMIC`, `UC-DESKTOP-SAVE-AS`, `UC-DESKTOP-OPEN-RECENT`
- **Preconditions:** Desktop host active
- **Completion:** Project folder creates, saves, opens, and relocates without semantic drift
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Create project folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-CREATE-FOLDER` | `NAV-DESKTOP-FILE` | `EB-DESKTOP-FOLDER-CREATE`: Create folder writes the canonical project structure only inside the user-selected empty or approved location. |
| S2 | Edit and save project | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-SAVE` | No route change | `EB-DESKTOP-FOLDER-SAVE`: Save writes a temporary validated document then atomically replaces the target; failure preserves the prior file and dirty state. |
| S3 | Close then open folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-OPEN-FOLDER` | No route change | `EB-DESKTOP-FOLDER-OPEN`: Open validates schema, pack locks, references, and external revision before exposing the project for editing. |
| S4 | Save As to another folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-SAVE-AS` | No route change | `EB-DESKTOP-FOLDER-SAVE-AS`: Save As writes a complete new folder, preserves semantic project identity unless Copy is chosen, and leaves the source untouched. |

## TF-DESKTOP-DIRECT-EXPORT

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-DIRECT-EXPORT`
- **Capabilities:** `UC-DESKTOP-DIRECT-EXPORT`
- **Preconditions:** Complete desktop project
- **Completion:** Generic and Godot outputs are written safely to selected directory
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Choose export folder | `VIEW-EXPORT` | `UI-DESKTOP-EXPORT-DIR` | `NAV-EXPORT` | `EB-DESKTOP-EXPORT-DESTINATION`: Choose export folder displays the resolved user-selected destination and overwrite policy before writing. |
| S2 | Export generic files | `VIEW-EXPORT` | `UI-EXPORT-GENERIC` | No route change | `EB-DESKTOP-EXPORT-GENERIC`: Generic export writes exactly spritesheet, animations, build manifest, machine credits, and human credits with expected hashes. |
| S3 | Export Godot files | `VIEW-EXPORT` | `UI-EXPORT-GODOT` | No route change | `EB-DESKTOP-EXPORT-GODOT`: Godot export adds valid SpriteFrames and instructions; a real pinned Godot fixture loads all declared animations without manual slicing. |
| S4 | Attempt export to unavailable destination | `VIEW-EXPORT` | `UI-DESKTOP-EXPORT-DIR` | No route change | `EB-DESKTOP-EXPORT-FAILURE`: Permission, conflict, or partial-write failure identifies the destination and leaves no result that appears complete. |

## TF-DESKTOP-UNSAVED-CLOSE

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-UNSAVED-CLOSE`
- **Capabilities:** `UC-DESKTOP-SAVE-ATOMIC`, `UC-DESKTOP-CLOSE-SAFELY`
- **Preconditions:** Dirty desktop project
- **Completion:** Save, Discard, and Cancel each produce the exact selected outcome
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Request window close | `VIEW-WORKSPACE` | `UI-CLOSE-WINDOW` | `NAV-WORKSPACE` | `EB-DESKTOP-CLOSE-PROMPT`: Closing a dirty project blocks window destruction and presents Save, Discard, and Cancel with project name. |
| S2 | Choose Cancel | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-CANCEL`: Cancel returns focus to the unchanged project and keeps the dirty state. |
| S3 | Request close and choose Save | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-SAVE`: Save closes only after atomic persistence succeeds; save failure keeps the window open with recovery actions. |
| S4 | Request close and choose Discard | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-DISCARD`: Discard closes without writing and the next open loads the last saved revision. |

## TF-CROSS-HOST-WEB-TO-DESKTOP

- **Host:** cross-host
- **Scenarios:** `SC-CROSS-HOST-HANDOFF`
- **Capabilities:** `UC-WEB-EXPORT-ARCHIVE`, `UC-CROSS-HOST-WEB-TO-DESKTOP`, `UC-CROSS-HOST-IDENTICAL-OUTPUT`, `UC-DESKTOP-OPEN-FOLDER`
- **Preconditions:** Verified project in web
- **Completion:** Electron continues the web project with exact parity
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export web project archive | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-CROSS-WEB-EXPORT`: Web exports a valid archive whose manifest names the baseline schema, packs, checksums, and no browser-specific state. |
| S2 | Open archive in Electron | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-OPEN-ARCHIVE` | `NAV-DESKTOP-FILE` | `EB-CROSS-DESKTOP-OPEN`: Electron opens the web archive after validation and reports exact project, pack, migration, and source summary. |
| S3 | Inspect imported summary and export | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-SUMMARY` | No route change | `EB-CROSS-WEB-DESKTOP-PARITY`: Desktop render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the web source. |

## TF-CROSS-HOST-DESKTOP-TO-WEB

- **Host:** cross-host
- **Scenarios:** `SC-CROSS-HOST-HANDOFF`
- **Capabilities:** `UC-CROSS-HOST-DESKTOP-TO-WEB`, `UC-CROSS-HOST-IDENTICAL-OUTPUT`, `UC-WEB-IMPORT-ARCHIVE`
- **Preconditions:** Verified project folder in Electron
- **Completion:** Web continues the desktop project with exact parity
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export desktop project backup | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-CROSS-DESKTOP-EXPORT`: Electron exports a portable archive without absolute paths, permission handles, recent entries, or host-only settings. |
| S2 | Import backup in web | `VIEW-STORAGE` | `UI-IMPORT-ARCHIVE` | No route change | `EB-CROSS-WEB-IMPORT`: Web validates and imports the desktop archive transactionally with explicit conflict handling. |
| S3 | Inspect imported summary and export | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-SUMMARY` | No route change | `EB-CROSS-DESKTOP-WEB-PARITY`: Web render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the desktop source. |

## TF-DATA-CUSTODY

- **Host:** shared
- **Scenarios:** `SC-DATA-CUSTODY`
- **Capabilities:** `UC-SEE-DATA-LOCATION`, `UC-WEB-EXPORT-ARCHIVE`, `UC-DESKTOP-SEE-HOST`
- **Preconditions:** Project open on web or desktop
- **Completion:** User sees storage location and owns a portable backup with no undeclared transfer
- **Status:** specified

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open Storage and inspect data location | `VIEW-STORAGE` | `UI-DATA-LOCATION` | `NAV-STORAGE` | `EB-DATA-LOCATION`: Storage view states IndexedDB for web or the exact approved project folder for desktop and explicitly says no cloud backup is active. |
| S2 | Export project backup | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | No route change | `EB-DATA-BACKUP`: Backup action produces a user-owned archive and reports completion only after its bytes and checksums are generated. |
| S3 | Complete local edit save and export | `VIEW-WORKSPACE` | `UI-SAVE-STATUS` | `NAV-WORKSPACE` | `EB-DATA-NETWORK`: Creating, editing, saving, backing up, and exporting project data causes zero undeclared project-data network requests. |
