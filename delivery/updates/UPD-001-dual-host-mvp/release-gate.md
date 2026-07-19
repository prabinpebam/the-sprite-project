# UPD-001 Release Gate

UPD-001 is complete only when all measures below are exactly satisfied. Categories are not averaged.

| Measure | Required value |
|---|---|
| Traceability coverage | 100% |
| New and changed implementation records | 100% implemented |
| New and changed task flows | 100% passing latest actual-UI run |
| New and changed expected behaviors | 100% passing |
| Affected baseline regression flows | 100% passing on each affected host |
| Cross-host archive fixtures | 100% round-trip semantic and render parity |
| Generic and Godot output parity | Identical structured metadata and render hashes |
| Migration fixtures | All supported baseline fixtures migrated or failed closed without mutation |
| Severity 0-2 issues | 0 unresolved |
| Undeclared console, page, network, filesystem, or IPC anomalies | 0 |

## Web Gate

- Published-subpath build works from static files.
- Multiple projects persist in IndexedDB across reload and browser restart.
- localStorage contains only declared preferences and migration markers.
- Archive export, complete storage clearing, and import reproduce project and output hashes.
- Offline-capable flows pass after initial PWA installation.
- Storage denial, quota pressure, and failed migration expose actionable recovery without silent loss.

## Electron Gate

- Portable Windows x64 ZIP launches without installation or administrator rights on a clean supported machine.
- Renderer has no direct Node.js access and all preload methods reject invalid paths and payloads.
- Create/Open/Save/Save As operate on the documented folder contract with atomic writes and recovery.
- Direct generic and Godot exports write exact expected files to the user-selected directory.
- Closing with unsaved state follows the specified Save/Discard/Cancel behavior.
- External modification and missing-folder states fail visibly and preserve last known-good work.

## Cross-Host Gate

- Web archive opens in Electron and produces the same semantic project, render hash, credits, and engine export.
- Electron project exports an archive that imports in web with the same results.
- A web-authored `.spriteproject` re-saved by Electron reopens in web without conversion and preserves canonical payload hashes when unedited.
- An Electron-authored `.spriteproject` re-saved by web reopens in Electron without conversion and preserves canonical payload hashes when unedited.
- Independent web and Electron writers emit identical canonical JSON and manifest entry checksums for the same fixture.
- Folder → archive → folder round trip preserves canonical entries and excludes outputs, caches, recent paths, permission handles, and other host metadata.
- Pack locks and unavailable pack handling are identical.
- Host-specific state does not leak into canonical data.

## Rollback

The verified `f29c9f9` web MVP remains the rollback baseline. The IndexedDB migration must preserve a recoverable legacy copy until the new repository has loaded and re-saved successfully. Electron artifacts can be withdrawn independently without changing the web application or project format.
