# UPD-001 Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-HOST | Host context | host type, version, capabilities, distribution channel | specified |
| IA-PROJECT-SUMMARY | Project summary | stable ID, name, updated time, pack state, revision, recovery state | specified |
| IA-PROJECT-DOCUMENT | Canonical project document | schema version, recipes, theme, pack locks, provenance references | specified |
| IA-PROJECT-REPOSITORY | Project repository | projects, revisions, snapshots, migration state | specified |
| IA-PROJECT-ARCHIVE | Portable project archive | manifest, project, pack locks, owned imports, provenance, checksums | specified |
| IA-PROJECT-FOLDER | Desktop project folder | project JSON, pack lock, recipes, imports, exports, cache | specified |
| IA-STORAGE-STATUS | Storage status | location, persistence, usage, quota, last save, last snapshot | specified |
| IA-EXPORT-DESTINATION | Export destination | target host, directory, overwrite policy, result files, hashes | specified |

## Navigation

| ID | Label | Destination | Back behavior | Status |
|---|---|---|---|---|
| NAV-PROJECTS | Projects | `VIEW-PROJECTS` | Returns to the previously open project without discarding edits | specified |
| NAV-WORKSPACE | Workspace | `VIEW-WORKSPACE` | Returns to the current creative view | specified |
| NAV-STORAGE | Storage & Backup | `VIEW-STORAGE` | Returns without changing project data | specified |
| NAV-EXPORT | Export | `VIEW-EXPORT` | No output is written until commanded | specified |
| NAV-DESKTOP-FILE | File | `VIEW-DESKTOP-FILE` | Native dialog cancellation leaves the project unchanged | specified |

## Views

| ID | Name | Purpose | Information | Status |
|---|---|---|---|---|
| VIEW-HOST-START | Host start | Identify host capabilities and offer appropriate entry actions | `IA-HOST`, `IA-PROJECT-SUMMARY` | specified |
| VIEW-PROJECTS | Project library | List and manage local projects | `IA-PROJECT-SUMMARY`, `IA-PROJECT-REPOSITORY` | specified |
| VIEW-WORKSPACE | Creative workspace | Retain the verified compose, theme, preview, and export workflow | `IA-PROJECT-DOCUMENT`, `IA-STORAGE-STATUS` | specified |
| VIEW-STORAGE | Storage and backup | Explain data custody, manage archives, and expose recovery state | `IA-STORAGE-STATUS`, `IA-PROJECT-ARCHIVE` | specified |
| VIEW-ARCHIVE-IMPORT | Archive import | Inspect, validate, migrate, and resolve archive conflicts before commit | `IA-PROJECT-ARCHIVE`, `IA-PROJECT-DOCUMENT` | specified |
| VIEW-EXPORT | Export | Generate downloads or direct desktop directory output | `IA-PROJECT-DOCUMENT`, `IA-EXPORT-DESTINATION` | specified |
| VIEW-DESKTOP-FILE | Desktop file operations | Create, open, save, relocate, and archive local project folders | `IA-PROJECT-FOLDER`, `IA-PROJECT-SUMMARY` | specified |
| VIEW-UNSAVED-DIALOG | Unsaved changes confirmation | Resolve Save, Discard, or Cancel before close | `IA-PROJECT-DOCUMENT`, `IA-STORAGE-STATUS` | specified |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-HOST-IDENTITY | `VIEW-HOST-START` | status | Active host and capabilities | specified |
| UI-PROJECT-LIBRARY | `VIEW-PROJECTS` | list | Local projects | specified |
| UI-WEB-NEW-PROJECT | `VIEW-PROJECTS` | button | New project | specified |
| UI-PROJECT-CARD | `VIEW-PROJECTS` | button | Open project | specified |
| UI-PROJECT-RENAME | `VIEW-PROJECTS` | button | Rename project | specified |
| UI-PROJECT-DELETE | `VIEW-PROJECTS` | button | Delete project | specified |
| UI-WORKSPACE-EDIT | `VIEW-WORKSPACE` | control | Creative edit | specified |
| UI-SAVE-STATUS | `VIEW-WORKSPACE` | status | Project save status | specified |
| UI-STORAGE-STATUS | `VIEW-STORAGE` | status | Storage status | specified |
| UI-DATA-LOCATION | `VIEW-STORAGE` | region | Data location | specified |
| UI-EXPORT-ARCHIVE | `VIEW-STORAGE` | button | Export project backup | specified |
| UI-IMPORT-ARCHIVE | `VIEW-STORAGE` | button | Import project backup | specified |
| UI-IMPORT-SUMMARY | `VIEW-ARCHIVE-IMPORT` | region | Archive summary | specified |
| UI-IMPORT-CONFLICT | `VIEW-ARCHIVE-IMPORT` | radiogroup | Import conflict action | specified |
| UI-OFFLINE-STATUS | `VIEW-HOST-START` | status | Offline availability | specified |
| UI-DESKTOP-RECENT | `VIEW-HOST-START` | list | Recent project folders | specified |
| UI-DESKTOP-CREATE-FOLDER | `VIEW-DESKTOP-FILE` | button | Create project folder | specified |
| UI-DESKTOP-OPEN-FOLDER | `VIEW-DESKTOP-FILE` | button | Open project folder | specified |
| UI-DESKTOP-SAVE | `VIEW-DESKTOP-FILE` | button | Save | specified |
| UI-DESKTOP-SAVE-AS | `VIEW-DESKTOP-FILE` | button | Save As | specified |
| UI-DESKTOP-OPEN-ARCHIVE | `VIEW-DESKTOP-FILE` | button | Open project backup | specified |
| UI-DESKTOP-EXPORT-DIR | `VIEW-EXPORT` | button | Choose export folder | specified |
| UI-EXPORT-GENERIC | `VIEW-EXPORT` | button | Export generic files | specified |
| UI-EXPORT-GODOT | `VIEW-EXPORT` | button | Export Godot files | specified |
| UI-CLOSE-WINDOW | `VIEW-WORKSPACE` | button | Close window | specified |
| UI-UNSAVED-CHOICE | `VIEW-UNSAVED-DIALOG` | group | Save Discard or Cancel | specified |

## Objective Expected Behaviors

| ID | Flow | Steps | Oracle | Status |
|---|---|---|---|---|
| EB-WEB-LIBRARY-LOAD | `TF-WEB-PROJECT-LIBRARY` | `S1` | Projects view lists exactly the IndexedDB projects ordered by updated time and shows name, pack state, save state, and last update. | specified |
| EB-WEB-LIBRARY-CREATE | `TF-WEB-PROJECT-LIBRARY` | `S2` | New project commits one valid IndexedDB record and adds one selected library item without changing existing projects. | specified |
| EB-WEB-LIBRARY-OPEN | `TF-WEB-PROJECT-LIBRARY` | `S3` | Open project loads the selected stable ID and exact render while every other project remains unchanged. | specified |
| EB-WEB-LIBRARY-RENAME | `TF-WEB-PROJECT-LIBRARY` | `S4` | Rename changes only the project name, preserves stable ID and render hash, and updates the library after transaction success. | specified |
| EB-WEB-LIBRARY-DELETE | `TF-WEB-PROJECT-LIBRARY` | `S5` | Delete requires explicit project-name confirmation; Cancel changes nothing and Confirm removes only the selected project and declared snapshots. | specified |
| EB-WEB-AUTOSAVE-DIRTY | `TF-WEB-AUTOSAVE-REOPEN` | `S1` | A semantic edit changes status from Saved to Unsaved then Saving without blocking continued editing. | specified |
| EB-WEB-AUTOSAVE-COMMIT | `TF-WEB-AUTOSAVE-REOPEN` | `S2` | One atomic IndexedDB transaction advances revision, retains the prior known-good snapshot, and changes status to Saved only after read-back. | specified |
| EB-WEB-AUTOSAVE-REOPEN | `TF-WEB-AUTOSAVE-REOPEN` | `S3` | Browser reload restores exact project ID, recipe, theme, preview state, revision, and render hash. | specified |
| EB-WEB-STORAGE-STATUS | `TF-WEB-AUTOSAVE-REOPEN` | `S4` | Storage view reports IndexedDB location, persistence result, approximate usage and quota, latest revision, and snapshot time without promising cloud backup. | specified |
| EB-WEB-ARCHIVE-EXPORT | `TF-WEB-BACKUP-RESTORE` | `S1` | Export downloads one .spriteproject archive with versioned manifest, project, pack locks, provenance, owned imports, and verified checksums. | specified |
| EB-WEB-ARCHIVE-INSPECT | `TF-WEB-BACKUP-RESTORE` | `S2` | Import validates entries, expansion bounds, checksums, schema versions, project summary, and required packs before enabling commit. | specified |
| EB-WEB-ARCHIVE-CONFLICT | `TF-WEB-BACKUP-RESTORE` | `S3` | An existing project ID requires Replace, Import as copy, or Cancel; no option is precommitted before user activation. | specified |
| EB-WEB-ARCHIVE-RESTORE | `TF-WEB-BACKUP-RESTORE` | `S4` | After browser project storage is cleared, import restores exact semantic data, render hash, credits, and export metadata. | specified |
| EB-WEB-OFFLINE-START | `TF-WEB-OFFLINE` | `S1` | After one online load, an offline restart opens the cached app shell and visibly reports Offline. | specified |
| EB-WEB-OFFLINE-PROJECT | `TF-WEB-OFFLINE` | `S2` | An installed project and all installed pack content open and render with zero failed required network requests. | specified |
| EB-WEB-OFFLINE-EXPORT | `TF-WEB-OFFLINE` | `S3` | Generic and Godot downloads complete offline with the same hashes as the online project. | specified |
| EB-DESKTOP-LAUNCH | `TF-DESKTOP-PORTABLE-LAUNCH` | `S1` | The extracted Windows x64 executable launches without installation or administrator rights and identifies its version. | specified |
| EB-DESKTOP-CAPABILITIES | `TF-DESKTOP-PORTABLE-LAUNCH` | `S2` | Host status identifies Desktop and exposes folder actions while the renderer has no direct Node.js globals. | specified |
| EB-DESKTOP-RECENT | `TF-DESKTOP-PORTABLE-LAUNCH` | `S3` | Recent list shows valid user-opened project folders; selecting a missing entry reports it and offers removal without creating files. | specified |
| EB-DESKTOP-FOLDER-CREATE | `TF-DESKTOP-PROJECT-FOLDER` | `S1` | Create folder writes the canonical project structure only inside the user-selected empty or approved location. | specified |
| EB-DESKTOP-FOLDER-SAVE | `TF-DESKTOP-PROJECT-FOLDER` | `S2` | Save writes a temporary validated document then atomically replaces the target; failure preserves the prior file and dirty state. | specified |
| EB-DESKTOP-FOLDER-OPEN | `TF-DESKTOP-PROJECT-FOLDER` | `S3` | Open validates schema, pack locks, references, and external revision before exposing the project for editing. | specified |
| EB-DESKTOP-FOLDER-SAVE-AS | `TF-DESKTOP-PROJECT-FOLDER` | `S4` | Save As writes a complete new folder, preserves semantic project identity unless Copy is chosen, and leaves the source untouched. | specified |
| EB-DESKTOP-EXPORT-DESTINATION | `TF-DESKTOP-DIRECT-EXPORT` | `S1` | Choose export folder displays the resolved user-selected destination and overwrite policy before writing. | specified |
| EB-DESKTOP-EXPORT-GENERIC | `TF-DESKTOP-DIRECT-EXPORT` | `S2` | Generic export writes exactly spritesheet, animations, build manifest, machine credits, and human credits with expected hashes. | specified |
| EB-DESKTOP-EXPORT-GODOT | `TF-DESKTOP-DIRECT-EXPORT` | `S3` | Godot export adds valid SpriteFrames and instructions; a real pinned Godot fixture loads all declared animations without manual slicing. | specified |
| EB-DESKTOP-EXPORT-FAILURE | `TF-DESKTOP-DIRECT-EXPORT` | `S4` | Permission, conflict, or partial-write failure identifies the destination and leaves no result that appears complete. | specified |
| EB-DESKTOP-CLOSE-PROMPT | `TF-DESKTOP-UNSAVED-CLOSE` | `S1` | Closing a dirty project blocks window destruction and presents Save, Discard, and Cancel with project name. | specified |
| EB-DESKTOP-CLOSE-CANCEL | `TF-DESKTOP-UNSAVED-CLOSE` | `S2` | Cancel returns focus to the unchanged project and keeps the dirty state. | specified |
| EB-DESKTOP-CLOSE-SAVE | `TF-DESKTOP-UNSAVED-CLOSE` | `S3` | Save closes only after atomic persistence succeeds; save failure keeps the window open with recovery actions. | specified |
| EB-DESKTOP-CLOSE-DISCARD | `TF-DESKTOP-UNSAVED-CLOSE` | `S4` | Discard closes without writing and the next open loads the last saved revision. | specified |
| EB-CROSS-WEB-EXPORT | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S1` | Web exports a valid archive whose manifest names the baseline schema, packs, checksums, and no browser-specific state. | specified |
| EB-CROSS-DESKTOP-OPEN | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S2` | Electron opens the web archive after validation and reports exact project, pack, migration, and source summary. | specified |
| EB-CROSS-WEB-DESKTOP-PARITY | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S3` | Desktop render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the web source. | specified |
| EB-CROSS-DESKTOP-EXPORT | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S1` | Electron exports a portable archive without absolute paths, permission handles, recent entries, or host-only settings. | specified |
| EB-CROSS-WEB-IMPORT | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S2` | Web validates and imports the desktop archive transactionally with explicit conflict handling. | specified |
| EB-CROSS-DESKTOP-WEB-PARITY | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S3` | Web render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the desktop source. | specified |
| EB-DATA-LOCATION | `TF-DATA-CUSTODY` | `S1` | Storage view states IndexedDB for web or the exact approved project folder for desktop and explicitly says no cloud backup is active. | specified |
| EB-DATA-BACKUP | `TF-DATA-CUSTODY` | `S2` | Backup action produces a user-owned archive and reports completion only after its bytes and checksums are generated. | specified |
| EB-DATA-NETWORK | `TF-DATA-CUSTODY` | `S3` | Creating, editing, saving, backing up, and exporting project data causes zero undeclared project-data network requests. | specified |
