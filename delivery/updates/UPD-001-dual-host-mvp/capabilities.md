# UPD-001 User-Can Catalog

| ID | Host | User can statement | Scenarios | Status |
|---|---|---|---|---|
| UC-WEB-OPEN-ZERO-INSTALL | web | User can open the production app from GitHub Pages without an account or installation. | `SC-WEB-FIRST-PROJECT` | specified |
| UC-WEB-CREATE-PROJECT | web | User can create a project in the IndexedDB-backed library. | `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-LIST-PROJECTS | web | User can list local projects with name, update time, pack state, and recovery status. | `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-OPEN-PROJECT | web | User can open one project from the browser library without affecting others. | `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-RENAME-PROJECT | web | User can rename a browser project while preserving its stable ID and content. | `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-DELETE-PROJECT | web | User can delete one browser project only after explicit confirmation. | `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-AUTOSAVE-IDB | web | User can rely on transactional IndexedDB autosave with visible status and snapshots. | `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-RESTORE-SESSION | web | User can reload or restart the browser and continue the exact saved project state. | `SC-WEB-FIRST-PROJECT`, `SC-WEB-PROJECT-LIBRARY` | specified |
| UC-WEB-EXPORT-ARCHIVE | web | User can download a versioned .spriteproject backup. | `SC-WEB-BACKUP-RESTORE`, `SC-DATA-CUSTODY`, `SC-CROSS-HOST-HANDOFF` | specified |
| UC-WEB-IMPORT-ARCHIVE | web | User can inspect and import a valid .spriteproject archive with explicit conflict handling. | `SC-WEB-BACKUP-RESTORE`, `SC-CROSS-HOST-HANDOFF` | specified |
| UC-WEB-INSPECT-STORAGE | web | User can inspect approximate usage, quota, persistence state, and disposable cache choices. | `SC-WEB-FIRST-PROJECT`, `SC-DATA-CUSTODY` | specified |
| UC-WEB-WORK-OFFLINE | web | User can complete installed project workflows offline after the first successful load. | `SC-WEB-OFFLINE` | specified |
| UC-DESKTOP-LAUNCH-PORTABLE | desktop | User can launch the portable Windows x64 Electron app without installation or administrator rights. | `SC-DESKTOP-PORTABLE-LAUNCH` | specified |
| UC-DESKTOP-SEE-HOST | desktop | User can see that the desktop host and local file capabilities are active. | `SC-DESKTOP-PORTABLE-LAUNCH`, `SC-DATA-CUSTODY` | specified |
| UC-DESKTOP-CREATE-FOLDER | desktop | User can create a canonical project folder in a chosen location. | `SC-DESKTOP-PROJECT-FOLDER` | specified |
| UC-DESKTOP-OPEN-FOLDER | desktop | User can open a compatible project folder and see validation before editing. | `SC-DESKTOP-PROJECT-FOLDER`, `SC-CROSS-HOST-HANDOFF` | specified |
| UC-DESKTOP-SAVE-ATOMIC | desktop | User can save canonical files atomically with visible dirty, saving, saved, and failed states. | `SC-DESKTOP-PROJECT-FOLDER`, `SC-DESKTOP-UNSAVED-CLOSE` | specified |
| UC-DESKTOP-SAVE-AS | desktop | User can relocate a project through Save As without silently changing its semantic identity. | `SC-DESKTOP-PROJECT-FOLDER` | specified |
| UC-DESKTOP-OPEN-RECENT | desktop | User can open a recent valid project folder and remove stale entries. | `SC-DESKTOP-PORTABLE-LAUNCH`, `SC-DESKTOP-PROJECT-FOLDER` | specified |
| UC-DESKTOP-DIRECT-EXPORT | desktop | User can write generic or Godot output directly into a selected directory. | `SC-DESKTOP-DIRECT-EXPORT` | specified |
| UC-DESKTOP-CLOSE-SAFELY | desktop | User can choose Save, Discard, or Cancel when closing a dirty project. | `SC-DESKTOP-UNSAVED-CLOSE` | specified |
| UC-CROSS-HOST-WEB-TO-DESKTOP | cross-host | User can export a web project archive and continue it in Electron. | `SC-CROSS-HOST-HANDOFF` | specified |
| UC-CROSS-HOST-DESKTOP-TO-WEB | cross-host | User can export a desktop project archive and continue it in the web app. | `SC-CROSS-HOST-HANDOFF` | specified |
| UC-CROSS-HOST-IDENTICAL-OUTPUT | cross-host | User receives identical semantic project data, render hashes, credits, and export metadata from either host. | `SC-CROSS-HOST-HANDOFF` | specified |
| UC-SEE-DATA-LOCATION | shared | User can see whether project data lives in IndexedDB, a project folder, or a selected export destination. | `SC-DATA-CUSTODY` | specified |
