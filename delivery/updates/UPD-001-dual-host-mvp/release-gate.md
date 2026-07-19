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

## Specification Readiness Gate

- `implementation-contract.md` and `quality-scenarios.md` are binding inputs to every owning work package.
- The traceability model validates with every migration, recovery, conflict, and host flow covered.
- Shared project schema version 2, recipe schema version 1, parsers, canonical serializer, migration, error taxonomy, archive limits, and adversarial fixture catalog are implemented once in host-neutral packages.
- No implementation package may invent a different project dialect, bridge method, error code, safety limit, conflict choice, or retention rule.

## Web Gate

- Published-subpath build works from static files.
- Multiple projects persist in IndexedDB across reload and browser restart.
- localStorage contains only declared preferences and migration markers.
- Archive export, complete storage clearing, and import reproduce project and output hashes.
- Offline-capable flows pass after initial PWA installation.
- Storage denial, quota pressure, and failed migration expose actionable recovery without silent loss.
- The exact legacy localStorage fixture migrates once to schema version 2 with semantic, render, provenance, animation, and Godot parity; every failure stage leaves legacy bytes unchanged and downloadable.
- Snapshot history follows the 20-per-project and 30-day policy, lists valid recovery points, and restores one selected snapshot while preserving the pre-restore graph.
- Same-origin tabs prove integer optimistic concurrency: stale saves write nothing and every reload/overwrite-with-checkpoint/save-copy/cancel choice passes.
- Quota evidence covers the 80% warning, 90% critical mode, ordered disposable cleanup, insufficient-cleanup backup, and zero deletion of protected data.
- Every new web flow passes keyboard, focus, status-announcement, 200% zoom/reflow, contrast, target-size, and reduced-motion checks applicable to that flow.

## Electron Gate

- Portable Windows x64 ZIP launches without installation or administrator rights on a clean supported machine.
- Renderer has no direct Node.js access and all preload methods reject invalid paths and payloads.
- The renderer exposes only the frozen `window.spriteHost` contract; every internal channel, request, response, opaque grant, operation scope, and payload limit has a passing contract test.
- Create/Open/Save/Save As operate on the documented folder contract with atomic writes and recovery.
- Direct generic and Godot exports write exact expected files to the user-selected directory.
- Closing with unsaved state follows the specified Save/Discard/Cancel behavior.
- External modification and missing-folder states fail visibly and preserve last known-good work.
- External modification compares every canonical entry fingerprint and every reload/overwrite-with-recovery/Save-As/cancel choice passes in packaged Electron.
- Navigation/window creation is blocked except controlled user-activated `https:` links, and renderer display paths never authorize filesystem operations.
- The artifact is named `the-sprite-project-<version>-windows-x64-portable.zip`, has a matching lowercase `.sha256` file, and release notes accurately explain Windows support, unsigned SmartScreen behavior, manual upgrade, and rollback.

## Cross-Host Gate

- Web archive opens in Electron and produces the same semantic project, render hash, credits, and engine export.
- Electron project exports an archive that imports in web with the same results.
- A web-authored `.spriteproject` re-saved by Electron reopens in web without conversion and preserves canonical payload hashes when unedited.
- An Electron-authored `.spriteproject` re-saved by web reopens in Electron without conversion and preserves canonical payload hashes when unedited.
- Independent web and Electron writers emit identical canonical JSON and manifest entry checksums for the same fixture.
- Folder → archive → folder round trip preserves canonical entries and excludes outputs, caches, recent paths, permission handles, and other host metadata.
- Pack locks and unavailable pack handling are identical.
- Host-specific state does not leak into canonical data.
- Format-version-1 limits are enforced identically: 128 MiB compressed, 512 entries, 8 MiB text/JSON, 64 MiB binary, 256 MiB expanded, 100:1 ratio, 240-byte relative paths, and 8 path segments.
- Every named adversarial archive fixture fails before mutation with the same stable error code on both hosts.

## Quality Scenario Gate

- `QS-001` through `QS-012` each have a passing evidence reference or an explicit not-applicable explanation approved before release.
- The 100-save benchmark meets the 750 ms quiet-period contract and 2-second p95 transaction/read-back target on the reference machine.
- The maximum supported archive reports progress within 100 ms and validates or fails stably within 10 seconds without a UI main-thread stall over 250 ms.
- Actual GitHub Pages and packaged Electron evidence, not browser-only substitutes, own host readiness.

## Rollback

The verified `f29c9f9` web MVP remains the rollback baseline. The IndexedDB migration must preserve a recoverable legacy copy until the new repository has loaded and re-saved successfully. Electron artifacts can be withdrawn independently without changing the web application or project format.

Before release, rehearse: withdraw the Electron artifact; deploy the known-good web build; reopen migrated version-2 projects through retained compatible readers; recover one failed legacy migration from untouched source bytes; and confirm no rollback step deletes user project folders, IndexedDB projects, archives, or migration recovery data.
