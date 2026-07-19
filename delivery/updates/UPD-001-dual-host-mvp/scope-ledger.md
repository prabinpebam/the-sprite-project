# UPD-001 Scope Ledger

## Positive Scope

| Type | Count |
|---|---|
| Customer promises | 4 |
| Scenarios | 14 |
| User-can capabilities | 31 |
| Task flows | 15 |
| Expected behaviors | 56 |

## Deliberate Exclusions

| ID | Expectation | Reason | Consequence | Disposition |
|---|---|---|---|---|
| OUT-UPD001-CLOUD-SYNC | Automatically synchronize projects between devices | UPD-001 provides manual archive portability without adding a funded backend | Users transfer .spriteproject files themselves | Future backend update after accepted customer promise and operating plan |
| OUT-UPD001-COLLABORATION | Share or co-edit projects in real time | Collaboration requires identity, coordination, retention, and conflict services outside the zero-server boundary | No shared live project state | North Star backend stage |
| OUT-UPD001-LIVE-LINK | Continuously watch and update a running Godot project | This update establishes safe direct export folders but does not yet specify watcher lifecycle or engine coordination | User runs direct export again after edits | Future desktop expansion through formal update |
| OUT-UPD001-PROCESS-LAUNCH | Launch or control Godot and other local tools | Process execution expands security and lifecycle scope beyond convenient file operations | User launches tools independently | Future desktop expansion |
| OUT-UPD001-AUTO-UPDATE | Electron updates itself automatically | Portable GitHub Release artifacts avoid an update service and signing dependency in this increment | User downloads a newer portable ZIP manually | Revisit with signing and distribution plan |
| OUT-UPD001-INSTALLER | Install Electron through MSI, Store, or system package | The accepted promise is a portable app requiring no installation | No file associations, Start menu registration, or automatic uninstall | Future distribution update |
| OUT-UPD001-MAC-LINUX | Provide portable macOS and Linux desktop builds | Windows x64 is the first evidence surface and avoids claiming untested packaging and signing | macOS and Linux users use the web version | Add only through host-specific verified update |
| OUT-UPD001-SIGNED-BINARY | Provide a trusted signed Windows binary | Code-signing cost is not currently funded | Portable launch may show an accurate SmartScreen warning | Revisit when funding exists |
| OUT-UPD001-CUSTOM-PACK-FOLDERS | Watch arbitrary local content-pack folders | UPD-001 changes host and persistence, not pack authoring or watcher behavior | Both hosts use bundled or formally installed pack data | Content ecosystem update |
| OUT-UPD001-HOST-DIVERGENCE | Allow web and desktop projects or rendering rules to diverge | Two products would destroy portability and duplicate validation | Host-specific state remains outside canonical project data | Permanently rejected unless a future ADR supersedes one-product-core principle |

Anything plausible for the dual-host promise but absent from both sections is a specification defect.
