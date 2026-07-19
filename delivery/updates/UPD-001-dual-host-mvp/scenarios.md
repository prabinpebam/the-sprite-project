# UPD-001 User Scenarios

| ID | Host | Promises | Actor | Intent | Success |
|---|---|---|---|---|---|
| SC-WEB-FIRST-PROJECT | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | First-time browser user | Create and retain a first project | Project appears in the library and survives reload |
| SC-WEB-LEGACY-MIGRATION | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Returning verified-MVP browser user | Open the updated product without losing prior work | A valid project migrates once to schema version 2 with parity, while failure leaves legacy bytes unchanged and downloadable |
| SC-WEB-SNAPSHOT-RECOVERY | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Browser user recovering an unwanted or damaged edit | Inspect and restore an earlier project revision | The selected snapshot becomes the current project only after confirmation and the pre-restore graph remains recoverable |
| SC-WEB-STORAGE-PRESSURE | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Browser user whose local storage is approaching quota | Preserve current work and recover enough safe capacity | Only previewed disposable data is removed or the blocked project is backed up; current and last-known-good work remain intact |
| SC-WEB-CONCURRENT-EDIT | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Browser user with the same project open in two tabs | Keep one tab from silently overwriting a newer save | The stale save writes nothing and offers explicit reload, overwrite with checkpoint, save-as-copy, or cancel choices |
| SC-WEB-PROJECT-LIBRARY | web | `CP-WEB-LOCAL-WORKSPACE` | Returning browser user | Find, open, rename, or remove a project | The selected operation affects only the intended project |
| SC-WEB-BACKUP-RESTORE | web | `CP-WEB-LOCAL-WORKSPACE`, `CP-CROSS-HOST-PORTABILITY`, `CP-LOCAL-DATA-CUSTODY` | Browser user protecting work | Create a portable backup and restore it after storage loss | Imported project reproduces the original semantic and render state |
| SC-WEB-OFFLINE | web | `CP-WEB-LOCAL-WORKSPACE` | Installed PWA user | Continue ordinary work without network access | Installed projects and packs remain usable and exports download locally |
| SC-DESKTOP-PORTABLE-LAUNCH | desktop | `CP-DESKTOP-PORTABLE-WORKSPACE` | Windows developer | Launch without installation or administrator rights | The app opens and identifies the desktop host and available file capabilities |
| SC-DESKTOP-PROJECT-FOLDER | desktop | `CP-DESKTOP-PORTABLE-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Desktop developer | Create, open, save, and relocate a project folder | Canonical files are written atomically and reopen with the same render |
| SC-DESKTOP-DIRECT-EXPORT | desktop | `CP-DESKTOP-PORTABLE-WORKSPACE` | Godot developer | Write engine files directly to a selected directory | Expected generic or Godot files appear with matching hashes |
| SC-DESKTOP-UNSAVED-CLOSE | desktop | `CP-DESKTOP-PORTABLE-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY` | Desktop developer with edits | Choose whether to save, discard, or continue editing | The exact selected action occurs without accidental loss |
| SC-CROSS-HOST-HANDOFF | cross-host | `CP-CROSS-HOST-PORTABILITY`, `CP-LOCAL-DATA-CUSTODY` | Developer using both hosts | Continue in the other host | Project, packs, preview, credits, and exports are semantically identical |
| SC-DATA-CUSTODY | shared | `CP-LOCAL-DATA-CUSTODY` | Privacy- and backup-conscious developer | Understand where data lives and create a user-owned copy | Data location, persistence, destination, and backup action are explicit |

## SC-WEB-FIRST-PROJECT

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** First-time browser user
- **Starting state:** GitHub Pages app loaded with no IndexedDB projects
- **Intent:** Create and retain a first project
- **Environment:** Supported desktop browser
- **Success:** Project appears in the library and survives reload
- **Interruptions:** Storage persistence denied; Tab closed during autosave; Duplicate project name
- **Status:** implemented

## SC-WEB-LEGACY-MIGRATION

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Returning verified-MVP browser user
- **Starting state:** The exact legacy localStorage key contains one valid or damaged schema-version-1 project and no verified migration marker exists
- **Intent:** Open the updated product without losing prior work
- **Environment:** Same GitHub Pages origin with IndexedDB available
- **Success:** A valid project migrates once to schema version 2 with parity, while failure leaves legacy bytes unchanged and downloadable
- **Interruptions:** Malformed legacy JSON; Missing exact pack; IndexedDB transaction failure; Quota exceeded; Browser closes during migration
- **Status:** implemented

## SC-WEB-SNAPSHOT-RECOVERY

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Browser user recovering an unwanted or damaged edit
- **Starting state:** A project has retained known-good snapshots
- **Intent:** Inspect and restore an earlier project revision
- **Environment:** Supported browser with the project repository available
- **Success:** The selected snapshot becomes the current project only after confirmation and the pre-restore graph remains recoverable
- **Interruptions:** Restore cancelled; Snapshot fails validation; Current project changed in another tab
- **Status:** implemented

## SC-WEB-STORAGE-PRESSURE

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Browser user whose local storage is approaching quota
- **Starting state:** Estimated use is at least 80 percent or a write raises QuotaExceededError
- **Intent:** Preserve current work and recover enough safe capacity
- **Environment:** Supported browser with projects, packs, snapshots, and disposable caches
- **Success:** Only previewed disposable data is removed or the blocked project is backed up; current and last-known-good work remain intact
- **Interruptions:** Estimate unavailable; Cleanup is insufficient; Backup cancelled; Quota changes during cleanup
- **Status:** implemented

## SC-WEB-CONCURRENT-EDIT

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Browser user with the same project open in two tabs
- **Starting state:** Both tabs loaded the same project revision
- **Intent:** Keep one tab from silently overwriting a newer save
- **Environment:** Two same-origin supported browser tabs
- **Success:** The stale save writes nothing and offers explicit reload, overwrite with checkpoint, save-as-copy, or cancel choices
- **Interruptions:** Broadcast message missed; Conflict dialog cancelled; Stored revision changes again before resolution
- **Status:** implemented

## SC-WEB-PROJECT-LIBRARY

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`
- **Actor:** Returning browser user
- **Starting state:** Several IndexedDB projects
- **Intent:** Find, open, rename, or remove a project
- **Environment:** Same browser origin
- **Success:** The selected operation affects only the intended project
- **Interruptions:** Delete cancelled; Older tab revision; Missing installed pack
- **Status:** implemented

## SC-WEB-BACKUP-RESTORE

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`, `CP-CROSS-HOST-PORTABILITY`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Browser user protecting work
- **Starting state:** Valid local project
- **Intent:** Create a portable backup and restore it after storage loss
- **Environment:** Browser with download and file input support
- **Success:** Imported project reproduces the original semantic and render state
- **Interruptions:** Conflicting project ID; Corrupt archive; Unsupported future version
- **Status:** implemented

## SC-WEB-OFFLINE

- **Host:** web
- **Promises:** `CP-WEB-LOCAL-WORKSPACE`
- **Actor:** Installed PWA user
- **Starting state:** App and required packs loaded once online
- **Intent:** Continue ordinary work without network access
- **Environment:** Offline supported browser
- **Success:** Installed projects and packs remain usable and exports download locally
- **Interruptions:** Optional pack was never installed; Update waiting; External source link unavailable
- **Status:** implemented

## SC-DESKTOP-PORTABLE-LAUNCH

- **Host:** desktop
- **Promises:** `CP-DESKTOP-PORTABLE-WORKSPACE`
- **Actor:** Windows developer
- **Starting state:** Downloaded portable Electron ZIP
- **Intent:** Launch without installation or administrator rights
- **Environment:** Supported Windows x64 machine
- **Success:** The app opens and identifies the desktop host and available file capabilities
- **Interruptions:** SmartScreen warning; Read-only extraction location; Missing recent folder
- **Status:** implemented

## SC-DESKTOP-PROJECT-FOLDER

- **Host:** desktop
- **Promises:** `CP-DESKTOP-PORTABLE-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Desktop developer
- **Starting state:** Portable app open
- **Intent:** Create, open, save, and relocate a project folder
- **Environment:** Local filesystem
- **Success:** Canonical files are written atomically and reopen with the same render
- **Interruptions:** Permission denied; Folder moved; External modification; Disk full
- **Status:** implemented

## SC-DESKTOP-DIRECT-EXPORT

- **Host:** desktop
- **Promises:** `CP-DESKTOP-PORTABLE-WORKSPACE`
- **Actor:** Godot developer
- **Starting state:** Complete project open in Electron
- **Intent:** Write engine files directly to a selected directory
- **Environment:** Local project and export folders
- **Success:** Expected generic or Godot files appear with matching hashes
- **Interruptions:** Destination unavailable; Overwrite conflict; Partial write
- **Status:** implemented

## SC-DESKTOP-UNSAVED-CLOSE

- **Host:** desktop
- **Promises:** `CP-DESKTOP-PORTABLE-WORKSPACE`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Desktop developer with edits
- **Starting state:** Dirty project and close request
- **Intent:** Choose whether to save, discard, or continue editing
- **Environment:** Electron window
- **Success:** The exact selected action occurs without accidental loss
- **Interruptions:** Save fails; Cancel close; Folder permission revoked
- **Status:** implemented

## SC-CROSS-HOST-HANDOFF

- **Host:** cross-host
- **Promises:** `CP-CROSS-HOST-PORTABILITY`, `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Developer using both hosts
- **Starting state:** Project authored in one host
- **Intent:** Continue in the other host
- **Environment:** Web archive and desktop project-folder adapters
- **Success:** Project, packs, preview, credits, and exports are semantically identical
- **Interruptions:** Missing pack; Version mismatch; Project ID conflict
- **Status:** implemented

## SC-DATA-CUSTODY

- **Host:** shared
- **Promises:** `CP-LOCAL-DATA-CUSTODY`
- **Actor:** Privacy- and backup-conscious developer
- **Starting state:** Project open on either host
- **Intent:** Understand where data lives and create a user-owned copy
- **Environment:** Web or desktop storage view
- **Success:** Data location, persistence, destination, and backup action are explicit
- **Interruptions:** Persistence denied; Backup cancelled; Destination unavailable
- **Status:** implemented
