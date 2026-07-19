# UPD-001 Task Flows

Every flow is accepted only through visible interaction on its declared host. The verified MVP flows remain regression obligations.

## TF-WEB-PROJECT-LIBRARY

- **Host:** web
- **Scenarios:** `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY`
- **Capabilities:** `UC-WEB-OPEN-ZERO-INSTALL`, `UC-WEB-CREATE-PROJECT`, `UC-WEB-LIST-PROJECTS`, `UC-WEB-OPEN-PROJECT`, `UC-WEB-RENAME-PROJECT`, `UC-WEB-DELETE-PROJECT`
- **Preconditions:** GitHub Pages application loaded
- **Completion:** Browser project library manages several projects without cross-project mutation
- **Status:** implemented

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
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Make a semantic edit | `VIEW-WORKSPACE` | `UI-WORKSPACE-EDIT` | `NAV-WORKSPACE` | `EB-WEB-AUTOSAVE-DIRTY`: A semantic edit changes status from Saved to Unsaved then Saving without blocking continued editing. |
| S2 | Observe autosave | `VIEW-WORKSPACE` | `UI-SAVE-STATUS` | No route change | `EB-WEB-AUTOSAVE-COMMIT`: One atomic IndexedDB transaction advances revision, retains the prior known-good snapshot, and changes status to Saved only after read-back. |
| S3 | Reload and reopen project | `VIEW-PROJECTS` | `UI-PROJECT-CARD` | `NAV-PROJECTS` | `EB-WEB-AUTOSAVE-REOPEN`: Browser reload restores exact project ID, recipe, theme, preview state, revision, and render hash. |
| S4 | Inspect storage state | `VIEW-STORAGE` | `UI-STORAGE-STATUS` | `NAV-STORAGE` | `EB-WEB-STORAGE-STATUS`: Storage view reports IndexedDB location, persistence result, approximate usage and quota, latest revision, and snapshot time without promising cloud backup. |

## TF-WEB-LEGACY-MIGRATION

- **Host:** web
- **Scenarios:** `SC-WEB-LEGACY-MIGRATION`
- **Capabilities:** `UC-WEB-MIGRATE-LEGACY`
- **Preconditions:** The exact verified-MVP localStorage key exists; No verified legacy migration marker exists
- **Completion:** A valid version-1 project exists once as a parity-checked version-2 graph or the untouched legacy bytes remain recoverable
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open the updated web product | `VIEW-MIGRATION-RECOVERY` | `UI-MIGRATION-STATUS` | No route change | `EB-WEB-MIGRATION-DETECT`: Startup with the exact legacy key and no verified marker announces Upgrading project storage before the library opens; startup without that state performs no migration. |
| S2 | Observe the transactional migration | `VIEW-MIGRATION-RECOVERY` | `UI-MIGRATION-STATUS` | No route change | `EB-WEB-MIGRATION-COMMIT`: One IndexedDB transaction writes the schema-version-2 project, sole recipe, exact pack lock, untouched legacy recovery bytes, and pending marker while preserving all version-1 identity and creative values. |
| S3 | Reopen the migrated project and restart | `VIEW-PROJECTS` | `UI-PROJECT-CARD` | `NAV-PROJECTS` | `EB-WEB-MIGRATION-VERIFY`: Read-back validation proves semantic, render, credits, animation, and Godot parity before marking migration verified and removing the legacy project key; a subsequent start performs no second migration. |
| S4 | Trigger each migration failure and use recovery | `VIEW-MIGRATION-RECOVERY` | `UI-MIGRATION-RECOVERY` | No route change | `EB-WEB-MIGRATION-FAILURE`: Parse, validation, pack, quota, transaction, interruption, or parity failure commits no new current project, retains the legacy key unchanged, announces the stable error, and makes Retry and Download recovery data operable. |

## TF-WEB-SNAPSHOT-RESTORE

- **Host:** web
- **Scenarios:** `SC-WEB-SNAPSHOT-RECOVERY`
- **Capabilities:** `UC-WEB-RESTORE-SNAPSHOT`
- **Preconditions:** An open project has at least one known-good snapshot
- **Completion:** The selected snapshot becomes a new current revision while the pre-restore graph remains recoverable
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open project recovery history | `VIEW-SNAPSHOT-RESTORE` | `UI-SNAPSHOT-LIST` | `NAV-STORAGE` | `EB-WEB-SNAPSHOT-LIST`: Recovery view lists only valid snapshots newest first with revision, UTC time, reason, and protected status and retains at most the binding 20-per-project and 30-day policy. |
| S2 | Cancel, then confirm restore of one snapshot | `VIEW-SNAPSHOT-RESTORE` | `UI-SNAPSHOT-RESTORE` | No route change | `EB-WEB-SNAPSHOT-RESTORE`: After explicit confirmation, restore snapshots the pre-restore graph, promotes exactly the selected valid graph to a new revision, reproduces its render, and announces completion; Cancel or revision mismatch changes nothing. |

## TF-WEB-STORAGE-PRESSURE

- **Host:** web
- **Scenarios:** `SC-WEB-STORAGE-PRESSURE`
- **Capabilities:** `UC-WEB-INSPECT-STORAGE`, `UC-WEB-RECOVER-STORAGE`, `UC-WEB-EXPORT-ARCHIVE`
- **Preconditions:** Estimated browser storage is at or above warning threshold or a write raises QuotaExceededError
- **Completion:** Safe cleanup or backup completes without silent loss of current, owned, referenced, migration-recovery, or last-known-good data
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Inspect the storage warning | `VIEW-STORAGE` | `UI-STORAGE-STATUS` | `NAV-STORAGE` | `EB-WEB-QUOTA-WARNING`: At 80 percent estimated use, a pending crossing, 90 percent critical use, or QuotaExceededError, Storage reports observed use/quota and keeps the current project dirty until a safe action completes. |
| S2 | Preview and clear disposable data | `VIEW-STORAGE` | `UI-STORAGE-RECOVERY` | No route change | `EB-WEB-QUOTA-CLEANUP`: Clear disposable data previews categories and estimated bytes, removes only caches, unreferenced official pack blobs, and snapshots allowed by policy in binding order, then reports exact categories removed without deleting current, owned, referenced, or last-known-good data. |
| S3 | Export a project when cleanup is insufficient | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | No route change | `EB-WEB-QUOTA-BACKUP`: When cleanup is insufficient, Export project backup produces a verified user-owned archive from the in-memory graph while the blocked save remains dirty; Cancel writes and deletes nothing. |

## TF-WEB-SAVE-CONFLICT

- **Host:** web
- **Scenarios:** `SC-WEB-CONCURRENT-EDIT`, `SC-WEB-PROJECT-LIBRARY`
- **Capabilities:** `UC-WEB-AUTOSAVE-IDB`, `UC-WEB-RESOLVE-SAVE-CONFLICT`
- **Preconditions:** Two same-origin tabs loaded the same project revision
- **Completion:** A stale tab cannot overwrite the newer revision without one explicit recovery choice
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Edit and save in the first tab | `VIEW-WORKSPACE` | `UI-WORKSPACE-EDIT` | `NAV-WORKSPACE` | `EB-WEB-CONFLICT-FIRST-SAVE`: The first tab commits revision N+1 and announces it through BroadcastChannel while the IndexedDB transaction remains the source of truth. |
| S2 | Edit and attempt save from the stale tab | `VIEW-WORKSPACE` | `UI-SAVE-STATUS` | No route change | `EB-WEB-CONFLICT-DETECT`: The stale tab compares expected N with actual N+1 inside its write transaction, writes nothing, remains dirty, and opens conflict resolution even when the BroadcastChannel message was missed. |
| S3 | Exercise every conflict choice | `VIEW-SAVE-CONFLICT` | `UI-SAVE-CONFLICT` | No route change | `EB-WEB-CONFLICT-RESOLVE`: Reload newer version, Overwrite with a named recovery snapshot, Save as copy with a new project ID, and Cancel each produce exactly the documented result; no choice is preselected, Escape cancels, and focus returns to the save trigger. |

## TF-WEB-BACKUP-RESTORE

- **Host:** web
- **Scenarios:** `SC-WEB-BACKUP-RESTORE`
- **Capabilities:** `UC-WEB-EXPORT-ARCHIVE`, `UC-WEB-IMPORT-ARCHIVE`
- **Preconditions:** Valid browser project
- **Completion:** Archive restores the project after browser project storage is cleared
- **Status:** implemented

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
- **Status:** implemented

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
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Launch portable executable | `VIEW-HOST-START` | `UI-HOST-IDENTITY` | No route change | `EB-DESKTOP-LAUNCH`: The extracted Windows x64 executable launches without installation or administrator rights and identifies its version. |
| S2 | Inspect host capabilities | `VIEW-HOST-START` | `UI-HOST-IDENTITY` | No route change | `EB-DESKTOP-CAPABILITIES`: Host status identifies Desktop and exposes folder actions while the renderer has no direct Node.js globals. |
| S3 | Inspect and open recent folder | `VIEW-HOST-START` | `UI-DESKTOP-RECENT` | No route change | `EB-DESKTOP-RECENT`: Recent list shows valid user-opened project folders; selecting a missing entry reports it and offers removal without creating files. |

## TF-DESKTOP-PROJECT-FOLDER

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-PROJECT-FOLDER`
- **Capabilities:** `UC-DESKTOP-CREATE-FOLDER`, `UC-DESKTOP-OPEN-FOLDER`, `UC-DESKTOP-SAVE-ATOMIC`, `UC-DESKTOP-SAVE-AS`, `UC-DESKTOP-OPEN-RECENT`, `UC-DESKTOP-RESOLVE-EXTERNAL-CHANGE`
- **Preconditions:** Desktop host active
- **Completion:** Project folder creates, saves, opens, and relocates without semantic drift
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Create project folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-CREATE-FOLDER` | `NAV-DESKTOP-FILE` | `EB-DESKTOP-FOLDER-CREATE`: Create folder writes the canonical project structure only inside the user-selected empty or approved location. |
| S2 | Edit and save project | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-SAVE` | No route change | `EB-DESKTOP-FOLDER-SAVE`: Save writes a temporary validated document then atomically replaces the target; failure preserves the prior file and dirty state. |
| S3 | Close then open folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-OPEN-FOLDER` | No route change | `EB-DESKTOP-FOLDER-OPEN`: Open validates schema, pack locks, references, and external revision before exposing the project for editing. |
| S4 | Save As to another folder | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-SAVE-AS` | No route change | `EB-DESKTOP-FOLDER-SAVE-AS`: Save As writes a complete new folder, preserves semantic project identity unless Copy is chosen, and leaves the source untouched. |
| S5 | Modify one canonical file externally then attempt Save | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-SAVE` | No route change | `EB-DESKTOP-EXTERNAL-DETECT`: Before Save, Electron compares SHA-256 fingerprints of all manifest-listed canonical entries to the open fingerprint; mismatch writes nothing, keeps dirty state, and opens conflict resolution. |
| S6 | Exercise every external-change choice | `VIEW-SAVE-CONFLICT` | `UI-SAVE-CONFLICT` | No route change | `EB-DESKTOP-EXTERNAL-RESOLVE`: Reload disk version, Overwrite after writing a host-only recovery copy, Save As, and Cancel each produce the documented result and preserve at least one complete disk or in-memory graph. |

## TF-DESKTOP-DIRECT-EXPORT

- **Host:** desktop
- **Scenarios:** `SC-DESKTOP-DIRECT-EXPORT`
- **Capabilities:** `UC-DESKTOP-DIRECT-EXPORT`
- **Preconditions:** Complete desktop project
- **Completion:** Generic and Godot outputs are written safely to selected directory
- **Status:** implemented

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
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Request window close | `VIEW-WORKSPACE` | `UI-CLOSE-WINDOW` | `NAV-WORKSPACE` | `EB-DESKTOP-CLOSE-PROMPT`: Closing a dirty project blocks window destruction and presents Save, Discard, and Cancel with project name. |
| S2 | Choose Cancel | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-CANCEL`: Cancel returns focus to the unchanged project and keeps the dirty state. |
| S3 | Request close and choose Save | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-SAVE`: Save closes only after atomic persistence succeeds; save failure keeps the window open with recovery actions. |
| S4 | Request close and choose Discard | `VIEW-UNSAVED-DIALOG` | `UI-UNSAVED-CHOICE` | No route change | `EB-DESKTOP-CLOSE-DISCARD`: Discard closes without writing and the next open loads the last saved revision. |

## TF-CROSS-HOST-WEB-TO-DESKTOP

- **Host:** cross-host
- **Scenarios:** `SC-CROSS-HOST-HANDOFF`
- **Capabilities:** `UC-WEB-EXPORT-ARCHIVE`, `UC-CROSS-HOST-WEB-TO-DESKTOP`, `UC-CROSS-HOST-SAME-FILE`, `UC-CROSS-HOST-IDENTICAL-OUTPUT`, `UC-DESKTOP-OPEN-FOLDER`
- **Preconditions:** Verified project in web
- **Completion:** Electron continues the web project with exact parity
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export web project archive | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-CROSS-WEB-EXPORT`: Web exports a valid archive whose manifest names the baseline schema, packs, checksums, and no browser-specific state. |
| S2 | Open archive in Electron | `VIEW-DESKTOP-FILE` | `UI-DESKTOP-OPEN-ARCHIVE` | `NAV-DESKTOP-FILE` | `EB-CROSS-DESKTOP-OPEN`: Electron opens the web archive after validation and reports exact project, pack, migration, and source summary. |
| S3 | Inspect imported summary and export | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-SUMMARY` | No route change | `EB-CROSS-WEB-DESKTOP-PARITY`: Desktop render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the web source. |
| S4 | Re-save in Electron and reopen in web | `VIEW-DESKTOP-FILE` | `UI-EXPORT-ARCHIVE` | `NAV-DESKTOP-FILE` | `EB-CROSS-WEB-DESKTOP-RESAVE`: Electron re-saves the web-authored .spriteproject using the same archive version and canonical entry contract; a second web import needs no host conversion and preserves canonical payload hashes. |

## TF-CROSS-HOST-DESKTOP-TO-WEB

- **Host:** cross-host
- **Scenarios:** `SC-CROSS-HOST-HANDOFF`
- **Capabilities:** `UC-CROSS-HOST-DESKTOP-TO-WEB`, `UC-CROSS-HOST-SAME-FILE`, `UC-CROSS-HOST-IDENTICAL-OUTPUT`, `UC-WEB-IMPORT-ARCHIVE`
- **Preconditions:** Verified project folder in Electron
- **Completion:** Web continues the desktop project with exact parity
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export desktop project backup | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-CROSS-DESKTOP-EXPORT`: Electron exports a portable archive without absolute paths, permission handles, recent entries, or host-only settings. |
| S2 | Import backup in web | `VIEW-STORAGE` | `UI-IMPORT-ARCHIVE` | No route change | `EB-CROSS-WEB-IMPORT`: Web validates and imports the desktop archive transactionally with explicit conflict handling. |
| S3 | Inspect imported summary and export | `VIEW-ARCHIVE-IMPORT` | `UI-IMPORT-SUMMARY` | No route change | `EB-CROSS-DESKTOP-WEB-PARITY`: Web render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the desktop source. |
| S4 | Re-save in web and reopen in Electron | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | `NAV-STORAGE` | `EB-CROSS-DESKTOP-WEB-RESAVE`: Web re-saves the Electron-authored .spriteproject using the same archive version and canonical entry contract; Electron reopens it without host conversion and preserves canonical payload hashes. |

## TF-DATA-CUSTODY

- **Host:** shared
- **Scenarios:** `SC-DATA-CUSTODY`
- **Capabilities:** `UC-SEE-DATA-LOCATION`, `UC-WEB-EXPORT-ARCHIVE`, `UC-DESKTOP-SEE-HOST`
- **Preconditions:** Project open on web or desktop
- **Completion:** User sees storage location and owns a portable backup with no undeclared transfer
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open Storage and inspect data location | `VIEW-STORAGE` | `UI-DATA-LOCATION` | `NAV-STORAGE` | `EB-DATA-LOCATION`: Storage view states IndexedDB for web or the exact approved project folder for desktop and explicitly says no cloud backup is active. |
| S2 | Export project backup | `VIEW-STORAGE` | `UI-EXPORT-ARCHIVE` | No route change | `EB-DATA-BACKUP`: Backup action produces a user-owned archive and reports completion only after its bytes and checksums are generated. |
| S3 | Complete local edit save and export | `VIEW-WORKSPACE` | `UI-SAVE-STATUS` | `NAV-WORKSPACE` | `EB-DATA-NETWORK`: Creating, editing, saving, backing up, and exporting project data causes zero undeclared project-data network requests. |
