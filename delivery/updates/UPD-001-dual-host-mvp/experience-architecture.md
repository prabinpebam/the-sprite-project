# UPD-001 Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-HOST | Host context | host type, version, capabilities, distribution channel | implemented |
| IA-PROJECT-SUMMARY | Project summary | stable ID, name, updated time, pack state, revision, recovery state | implemented |
| IA-PROJECT-DOCUMENT | Canonical project document | schema version 2, stable project ID, active recipe ID, ordered recipe IDs, exact pack-lock references, theme, preview, timestamps, integer revision, provenance references | implemented |
| IA-PROJECT-REPOSITORY | Project repository | projects, revisions, snapshots, migration state | implemented |
| IA-PROJECT-ARCHIVE | Portable project archive | manifest, project, pack locks, owned imports, provenance, checksums | implemented |
| IA-PROJECT-FOLDER | Desktop project folder | project JSON, pack lock, recipes, imports, exports, cache | implemented |
| IA-FILE-COMPATIBILITY | Cross-host file compatibility profile | archive version, project schema version, canonical JSON, entry ordering, checksums, path rules, migration policy, host metadata exclusions | implemented |
| IA-STORAGE-STATUS | Storage status | location, persistence, usage, quota, last save, last snapshot | implemented |
| IA-EXPORT-DESTINATION | Export destination | target host, directory, overwrite policy, result files, hashes | implemented |

## Navigation

| ID | Label | Destination | Back behavior | Status |
|---|---|---|---|---|
| NAV-PROJECTS | Projects | `VIEW-PROJECTS` | Returns to the previously open project without discarding edits | implemented |
| NAV-WORKSPACE | Workspace | `VIEW-WORKSPACE` | Returns to the current creative view | implemented |
| NAV-STORAGE | Storage & Backup | `VIEW-STORAGE` | Returns without changing project data | implemented |
| NAV-EXPORT | Export | `VIEW-EXPORT` | No output is written until commanded | implemented |
| NAV-DESKTOP-FILE | File | `VIEW-DESKTOP-FILE` | Native dialog cancellation leaves the project unchanged | implemented |

## Views

| ID | Name | Purpose | Information | Status |
|---|---|---|---|---|
| VIEW-HOST-START | Host start | Identify host capabilities and offer appropriate entry actions | `IA-HOST`, `IA-PROJECT-SUMMARY` | implemented |
| VIEW-PROJECTS | Project library | List and manage local projects | `IA-PROJECT-SUMMARY`, `IA-PROJECT-REPOSITORY` | implemented |
| VIEW-WORKSPACE | Creative workspace | Retain the verified compose, theme, preview, and export workflow | `IA-PROJECT-DOCUMENT`, `IA-STORAGE-STATUS` | implemented |
| VIEW-STORAGE | Storage and backup | Explain data custody, manage archives, and expose recovery state | `IA-STORAGE-STATUS`, `IA-PROJECT-ARCHIVE` | implemented |
| VIEW-ARCHIVE-IMPORT | Archive import | Inspect, validate, migrate, and resolve archive conflicts before commit | `IA-PROJECT-ARCHIVE`, `IA-PROJECT-DOCUMENT`, `IA-FILE-COMPATIBILITY` | implemented |
| VIEW-EXPORT | Export | Generate downloads or direct desktop directory output | `IA-PROJECT-DOCUMENT`, `IA-EXPORT-DESTINATION` | implemented |
| VIEW-DESKTOP-FILE | Desktop file operations | Create, open, save, relocate, and archive local project folders | `IA-PROJECT-FOLDER`, `IA-PROJECT-SUMMARY` | implemented |
| VIEW-UNSAVED-DIALOG | Unsaved changes confirmation | Resolve Save, Discard, or Cancel before close | `IA-PROJECT-DOCUMENT`, `IA-STORAGE-STATUS` | implemented |
| VIEW-MIGRATION-RECOVERY | Legacy project migration | Show migration status and preserve/download legacy recovery data when migration cannot complete | `IA-PROJECT-DOCUMENT`, `IA-PROJECT-REPOSITORY`, `IA-STORAGE-STATUS` | implemented |
| VIEW-SNAPSHOT-RESTORE | Snapshot recovery | List known-good revisions and confirm restoration without losing the current graph | `IA-PROJECT-DOCUMENT`, `IA-PROJECT-REPOSITORY` | implemented |
| VIEW-SAVE-CONFLICT | Save conflict resolution | Resolve web revision or desktop fingerprint mismatch without silent overwrite | `IA-PROJECT-DOCUMENT`, `IA-STORAGE-STATUS` | implemented |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-HOST-IDENTITY | `VIEW-HOST-START` | status | Active host and capabilities | implemented |
| UI-PROJECT-LIBRARY | `VIEW-PROJECTS` | list | Local projects | implemented |
| UI-WEB-NEW-PROJECT | `VIEW-PROJECTS` | button | New project | implemented |
| UI-PROJECT-CARD | `VIEW-PROJECTS` | button | Open project | implemented |
| UI-PROJECT-RENAME | `VIEW-PROJECTS` | button | Rename project | implemented |
| UI-PROJECT-DELETE | `VIEW-PROJECTS` | button | Delete project | implemented |
| UI-WORKSPACE-EDIT | `VIEW-WORKSPACE` | control | Creative edit | implemented |
| UI-SAVE-STATUS | `VIEW-WORKSPACE` | status | Project save status | implemented |
| UI-STORAGE-STATUS | `VIEW-STORAGE` | status | Storage status | implemented |
| UI-DATA-LOCATION | `VIEW-STORAGE` | region | Data location | implemented |
| UI-EXPORT-ARCHIVE | `VIEW-STORAGE` | button | Export project backup | implemented |
| UI-IMPORT-ARCHIVE | `VIEW-STORAGE` | button | Import project backup | implemented |
| UI-IMPORT-SUMMARY | `VIEW-ARCHIVE-IMPORT` | region | Archive summary | implemented |
| UI-IMPORT-CONFLICT | `VIEW-ARCHIVE-IMPORT` | radiogroup | Import conflict action | implemented |
| UI-OFFLINE-STATUS | `VIEW-HOST-START` | status | Offline availability | implemented |
| UI-DESKTOP-RECENT | `VIEW-HOST-START` | list | Recent project folders | implemented |
| UI-DESKTOP-CREATE-FOLDER | `VIEW-DESKTOP-FILE` | button | Create project folder | implemented |
| UI-DESKTOP-OPEN-FOLDER | `VIEW-DESKTOP-FILE` | button | Open project folder | implemented |
| UI-DESKTOP-SAVE | `VIEW-DESKTOP-FILE` | button | Save | implemented |
| UI-DESKTOP-SAVE-AS | `VIEW-DESKTOP-FILE` | button | Save As | implemented |
| UI-DESKTOP-OPEN-ARCHIVE | `VIEW-DESKTOP-FILE` | button | Open project backup | implemented |
| UI-DESKTOP-EXPORT-DIR | `VIEW-EXPORT` | button | Choose export folder | implemented |
| UI-EXPORT-GENERIC | `VIEW-EXPORT` | button | Export generic files | implemented |
| UI-EXPORT-GODOT | `VIEW-EXPORT` | button | Export Godot files | implemented |
| UI-CLOSE-WINDOW | `VIEW-WORKSPACE` | button | Close window | implemented |
| UI-UNSAVED-CHOICE | `VIEW-UNSAVED-DIALOG` | group | Save Discard or Cancel | implemented |
| UI-MIGRATION-STATUS | `VIEW-MIGRATION-RECOVERY` | status | Project storage migration status | implemented |
| UI-MIGRATION-RECOVERY | `VIEW-MIGRATION-RECOVERY` | group | Migration recovery actions | implemented |
| UI-SNAPSHOT-LIST | `VIEW-SNAPSHOT-RESTORE` | list | Project recovery snapshots | implemented |
| UI-SNAPSHOT-RESTORE | `VIEW-SNAPSHOT-RESTORE` | button | Restore selected snapshot | implemented |
| UI-SAVE-CONFLICT | `VIEW-SAVE-CONFLICT` | group | Resolve save conflict | implemented |
| UI-STORAGE-RECOVERY | `VIEW-STORAGE` | group | Storage recovery actions | implemented |

## Objective Expected Behaviors

| ID | Flow | Steps | Oracle | Status |
|---|---|---|---|---|
| EB-WEB-LIBRARY-LOAD | `TF-WEB-PROJECT-LIBRARY` | `S1` | Projects view lists exactly the IndexedDB projects ordered by updated time and shows name, pack state, save state, and last update. | implemented |
| EB-WEB-LIBRARY-CREATE | `TF-WEB-PROJECT-LIBRARY` | `S2` | New project commits one valid IndexedDB record and adds one selected library item without changing existing projects. | implemented |
| EB-WEB-LIBRARY-OPEN | `TF-WEB-PROJECT-LIBRARY` | `S3` | Open project loads the selected stable ID and exact render while every other project remains unchanged. | implemented |
| EB-WEB-LIBRARY-RENAME | `TF-WEB-PROJECT-LIBRARY` | `S4` | Rename changes only the project name, preserves stable ID and render hash, and updates the library after transaction success. | implemented |
| EB-WEB-LIBRARY-DELETE | `TF-WEB-PROJECT-LIBRARY` | `S5` | Delete requires explicit project-name confirmation; Cancel changes nothing and Confirm removes only the selected project and declared snapshots. | implemented |
| EB-WEB-AUTOSAVE-DIRTY | `TF-WEB-AUTOSAVE-REOPEN` | `S1` | A semantic edit changes status from Saved to Unsaved then Saving without blocking continued editing. | implemented |
| EB-WEB-AUTOSAVE-COMMIT | `TF-WEB-AUTOSAVE-REOPEN` | `S2` | One atomic IndexedDB transaction advances revision, retains the prior known-good snapshot, and changes status to Saved only after read-back. | implemented |
| EB-WEB-AUTOSAVE-REOPEN | `TF-WEB-AUTOSAVE-REOPEN` | `S3` | Browser reload restores exact project ID, recipe, theme, preview state, revision, and render hash. | implemented |
| EB-WEB-STORAGE-STATUS | `TF-WEB-AUTOSAVE-REOPEN` | `S4` | Storage view reports IndexedDB location, persistence result, approximate usage and quota, latest revision, and snapshot time without promising cloud backup. | implemented |
| EB-WEB-MIGRATION-DETECT | `TF-WEB-LEGACY-MIGRATION` | `S1` | Startup with the exact legacy key and no verified marker announces Upgrading project storage before the library opens; startup without that state performs no migration. | implemented |
| EB-WEB-MIGRATION-COMMIT | `TF-WEB-LEGACY-MIGRATION` | `S2` | One IndexedDB transaction writes the schema-version-2 project, sole recipe, exact pack lock, untouched legacy recovery bytes, and pending marker while preserving all version-1 identity and creative values. | implemented |
| EB-WEB-MIGRATION-VERIFY | `TF-WEB-LEGACY-MIGRATION` | `S3` | Read-back validation proves semantic, render, credits, animation, and Godot parity before marking migration verified and removing the legacy project key; a subsequent start performs no second migration. | implemented |
| EB-WEB-MIGRATION-FAILURE | `TF-WEB-LEGACY-MIGRATION` | `S4` | Parse, validation, pack, quota, transaction, interruption, or parity failure commits no new current project, retains the legacy key unchanged, announces the stable error, and makes Retry and Download recovery data operable. | implemented |
| EB-WEB-SNAPSHOT-LIST | `TF-WEB-SNAPSHOT-RESTORE` | `S1` | Recovery view lists only valid snapshots newest first with revision, UTC time, reason, and protected status and retains at most the binding 20-per-project and 30-day policy. | implemented |
| EB-WEB-SNAPSHOT-RESTORE | `TF-WEB-SNAPSHOT-RESTORE` | `S2` | After explicit confirmation, restore snapshots the pre-restore graph, promotes exactly the selected valid graph to a new revision, reproduces its render, and announces completion; Cancel or revision mismatch changes nothing. | implemented |
| EB-WEB-QUOTA-WARNING | `TF-WEB-STORAGE-PRESSURE` | `S1` | At 80 percent estimated use, a pending crossing, 90 percent critical use, or QuotaExceededError, Storage reports observed use/quota and keeps the current project dirty until a safe action completes. | implemented |
| EB-WEB-QUOTA-CLEANUP | `TF-WEB-STORAGE-PRESSURE` | `S2` | Clear disposable data previews categories and estimated bytes, removes only caches, unreferenced official pack blobs, and snapshots allowed by policy in binding order, then reports exact categories removed without deleting current, owned, referenced, or last-known-good data. | implemented |
| EB-WEB-QUOTA-BACKUP | `TF-WEB-STORAGE-PRESSURE` | `S3` | When cleanup is insufficient, Export project backup produces a verified user-owned archive from the in-memory graph while the blocked save remains dirty; Cancel writes and deletes nothing. | implemented |
| EB-WEB-CONFLICT-FIRST-SAVE | `TF-WEB-SAVE-CONFLICT` | `S1` | The first tab commits revision N+1 and announces it through BroadcastChannel while the IndexedDB transaction remains the source of truth. | implemented |
| EB-WEB-CONFLICT-DETECT | `TF-WEB-SAVE-CONFLICT` | `S2` | The stale tab compares expected N with actual N+1 inside its write transaction, writes nothing, remains dirty, and opens conflict resolution even when the BroadcastChannel message was missed. | implemented |
| EB-WEB-CONFLICT-RESOLVE | `TF-WEB-SAVE-CONFLICT` | `S3` | Reload newer version, Overwrite with a named recovery snapshot, Save as copy with a new project ID, and Cancel each produce exactly the documented result; no choice is preselected, Escape cancels, and focus returns to the save trigger. | implemented |
| EB-WEB-ARCHIVE-EXPORT | `TF-WEB-BACKUP-RESTORE` | `S1` | Export downloads one .spriteproject archive with versioned manifest, project, pack locks, provenance, owned imports, and verified checksums. | implemented |
| EB-WEB-ARCHIVE-INSPECT | `TF-WEB-BACKUP-RESTORE` | `S2` | Import validates entries, expansion bounds, checksums, schema versions, project summary, and required packs before enabling commit. | implemented |
| EB-WEB-ARCHIVE-CONFLICT | `TF-WEB-BACKUP-RESTORE` | `S3` | An existing project ID requires Replace, Import as copy, or Cancel; no option is precommitted before user activation. | implemented |
| EB-WEB-ARCHIVE-RESTORE | `TF-WEB-BACKUP-RESTORE` | `S4` | After browser project storage is cleared, import restores exact semantic data, render hash, credits, and export metadata. | implemented |
| EB-WEB-OFFLINE-START | `TF-WEB-OFFLINE` | `S1` | After one online load, an offline restart opens the cached app shell and visibly reports Offline. | implemented |
| EB-WEB-OFFLINE-PROJECT | `TF-WEB-OFFLINE` | `S2` | An installed project and all installed pack content open and render with zero failed required network requests. | implemented |
| EB-WEB-OFFLINE-EXPORT | `TF-WEB-OFFLINE` | `S3` | Generic and Godot downloads complete offline with the same hashes as the online project. | implemented |
| EB-DESKTOP-LAUNCH | `TF-DESKTOP-PORTABLE-LAUNCH` | `S1` | The extracted Windows x64 executable launches without installation or administrator rights and identifies its version. | implemented |
| EB-DESKTOP-CAPABILITIES | `TF-DESKTOP-PORTABLE-LAUNCH` | `S2` | Host status identifies Desktop and exposes folder actions while the renderer has no direct Node.js globals. | implemented |
| EB-DESKTOP-RECENT | `TF-DESKTOP-PORTABLE-LAUNCH` | `S3` | Recent list shows valid user-opened project folders; selecting a missing entry reports it and offers removal without creating files. | implemented |
| EB-DESKTOP-FOLDER-CREATE | `TF-DESKTOP-PROJECT-FOLDER` | `S1` | Create folder writes the canonical project structure only inside the user-selected empty or approved location. | implemented |
| EB-DESKTOP-FOLDER-SAVE | `TF-DESKTOP-PROJECT-FOLDER` | `S2` | Save writes a temporary validated document then atomically replaces the target; failure preserves the prior file and dirty state. | implemented |
| EB-DESKTOP-FOLDER-OPEN | `TF-DESKTOP-PROJECT-FOLDER` | `S3` | Open validates schema, pack locks, references, and external revision before exposing the project for editing. | implemented |
| EB-DESKTOP-FOLDER-SAVE-AS | `TF-DESKTOP-PROJECT-FOLDER` | `S4` | Save As writes a complete new folder, preserves semantic project identity unless Copy is chosen, and leaves the source untouched. | implemented |
| EB-DESKTOP-EXTERNAL-DETECT | `TF-DESKTOP-PROJECT-FOLDER` | `S5` | Before Save, Electron compares SHA-256 fingerprints of all manifest-listed canonical entries to the open fingerprint; mismatch writes nothing, keeps dirty state, and opens conflict resolution. | implemented |
| EB-DESKTOP-EXTERNAL-RESOLVE | `TF-DESKTOP-PROJECT-FOLDER` | `S6` | Reload disk version, Overwrite after writing a host-only recovery copy, Save As, and Cancel each produce the documented result and preserve at least one complete disk or in-memory graph. | implemented |
| EB-DESKTOP-EXPORT-DESTINATION | `TF-DESKTOP-DIRECT-EXPORT` | `S1` | Choose export folder displays the resolved user-selected destination and overwrite policy before writing. | implemented |
| EB-DESKTOP-EXPORT-GENERIC | `TF-DESKTOP-DIRECT-EXPORT` | `S2` | Generic export writes exactly spritesheet, animations, build manifest, machine credits, and human credits with expected hashes. | implemented |
| EB-DESKTOP-EXPORT-GODOT | `TF-DESKTOP-DIRECT-EXPORT` | `S3` | Godot export adds valid SpriteFrames and instructions; a real pinned Godot fixture loads all declared animations without manual slicing. | implemented |
| EB-DESKTOP-EXPORT-FAILURE | `TF-DESKTOP-DIRECT-EXPORT` | `S4` | Permission, conflict, or partial-write failure identifies the destination and leaves no result that appears complete. | implemented |
| EB-DESKTOP-CLOSE-PROMPT | `TF-DESKTOP-UNSAVED-CLOSE` | `S1` | Closing a dirty project blocks window destruction and presents Save, Discard, and Cancel with project name. | implemented |
| EB-DESKTOP-CLOSE-CANCEL | `TF-DESKTOP-UNSAVED-CLOSE` | `S2` | Cancel returns focus to the unchanged project and keeps the dirty state. | implemented |
| EB-DESKTOP-CLOSE-SAVE | `TF-DESKTOP-UNSAVED-CLOSE` | `S3` | Save closes only after atomic persistence succeeds; save failure keeps the window open with recovery actions. | implemented |
| EB-DESKTOP-CLOSE-DISCARD | `TF-DESKTOP-UNSAVED-CLOSE` | `S4` | Discard closes without writing and the next open loads the last saved revision. | implemented |
| EB-CROSS-WEB-EXPORT | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S1` | Web exports a valid archive whose manifest names the baseline schema, packs, checksums, and no browser-specific state. | implemented |
| EB-CROSS-DESKTOP-OPEN | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S2` | Electron opens the web archive after validation and reports exact project, pack, migration, and source summary. | implemented |
| EB-CROSS-WEB-DESKTOP-PARITY | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S3` | Desktop render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the web source. | implemented |
| EB-CROSS-WEB-DESKTOP-RESAVE | `TF-CROSS-HOST-WEB-TO-DESKTOP` | `S4` | Electron re-saves the web-authored .spriteproject using the same archive version and canonical entry contract; a second web import needs no host conversion and preserves canonical payload hashes. | implemented |
| EB-CROSS-DESKTOP-EXPORT | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S1` | Electron exports a portable archive without absolute paths, permission handles, recent entries, or host-only settings. | implemented |
| EB-CROSS-WEB-IMPORT | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S2` | Web validates and imports the desktop archive transactionally with explicit conflict handling. | implemented |
| EB-CROSS-DESKTOP-WEB-PARITY | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S3` | Web render hash, selected assets, resolved tokens, credits, animation JSON, and Godot metadata equal the desktop source. | implemented |
| EB-CROSS-DESKTOP-WEB-RESAVE | `TF-CROSS-HOST-DESKTOP-TO-WEB` | `S4` | Web re-saves the Electron-authored .spriteproject using the same archive version and canonical entry contract; Electron reopens it without host conversion and preserves canonical payload hashes. | implemented |
| EB-DATA-LOCATION | `TF-DATA-CUSTODY` | `S1` | Storage view states IndexedDB for web or the exact approved project folder for desktop and explicitly says no cloud backup is active. | implemented |
| EB-DATA-BACKUP | `TF-DATA-CUSTODY` | `S2` | Backup action produces a user-owned archive and reports completion only after its bytes and checksums are generated. | implemented |
| EB-DATA-NETWORK | `TF-DATA-CUSTODY` | `S3` | Creating, editing, saving, backing up, and exporting project data causes zero undeclared project-data network requests. | implemented |

## Binding Interaction Contracts

- `implementation-contract.md` owns exact migration states, snapshot and quota behavior, conflict choices, stable error codes, Electron bridge/path authority, focus and keyboard behavior, status announcements, zoom/reflow, target size, and reduced motion.
- `quality-scenarios.md` owns measurable accessibility, durability, security, compatibility, capacity, performance, offline, release, and maintainability evidence.
- Tables in this file define the user-visible inventory. The binding contracts define behavior that cuts across more than one row and must not be reinterpreted per view.
