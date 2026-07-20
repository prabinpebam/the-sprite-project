# UPD-002 Quality Scenarios

| ID | Quality | Source and stimulus | Environment / artifact | Required response and measure | Evidence |
|---|---|---|---|---|---|
| QS-201 | Correctness | Same authored pack is installed and used in web and Electron | `.spritepack` v1, runtime pack v2 | Canonical entries, installed summary, selected assets, every frame/sheet hash, generic/Godot metadata, and credits are identical | Shared fixture and actual-host round trip |
| QS-202 | Durability | Browser/process closes during pack or draft transaction | IndexedDB or Electron pack index/package storage | Last committed repository/draft reopens; no partial version is selectable; source and dirty draft remain recoverable | Kill/interruption fixtures |
| QS-203 | Security | Malicious container, PNG, schema, provenance, or bridge request reaches boundary | Pack parser, PNG parser, Electron main/preload | Fails before repository/project/filesystem mutation with stable code; no path/Node/code authority is gained | Full adversarial catalog, fuzz corpus, bridge tests |
| QS-204 | Legal traceability | Authored/installed asset enters project and exports | Pack provenance and project credits | Exact source, author, offered/chosen license, required attribution, pack ID/version/checksum appear deterministically; unsupported terms block authoring | Provenance fixtures and exported credits |
| QS-205 | Compatibility | Existing bundled project opens after runtime unification | Wayfarer/Harbor baseline fixtures | Project bytes, frame/sheet hashes, generic/Godot files, and credits remain unchanged | RUN-UPD001 regression hashes |
| QS-206 | Compatibility | Non-bundled project transfers between hosts | Project archive v2 with embedded `.spritepack` | Exact lock resolves offline; unedited canonical project and embedded package hashes survive round trip | Bidirectional actual-host fixture |
| QS-207 | Recoverability | Installed version is removed, missing, corrupt, or update-incompatible | Projects with exact locks and snapshots | In-use removal writes nothing; missing project remains intact/blocked; exact reinstall resumes; replacement occurs only in copy; checkpoint restores old lock | Lifecycle actual-UI fixtures |
| QS-208 | Accessibility | Keyboard/screen-reader user installs, manages, authors, validates, and exports | 200% zoom, 320px viewport, reduced motion | All actions named/reachable; dialogs focus/restore correctly; validation focuses owner; no essential content loss; table scroll region labeled | Playwright keyboard/reflow plus automated and manual checks |
| QS-209 | Performance | User selects maximum 64 MiB compressed pack | Windows x64, 2 logical CPUs, 8 GiB RAM, current Chromium/Electron | Status within 100 ms; stage updates <=500 ms; validate or fail <=10 s; no main-thread stall >100 ms | Boundary benchmark and long-task capture |
| QS-210 | Performance | User edits ordinary draft with <=32 assets and 16 MiB source bytes | Same reference machine | Unsaved within one frame; save starts after 750 ms; 100 saves p95 <=2 s including read-back; preview update p95 <=250 ms after mapping change | Draft benchmark |
| QS-211 | Capacity | Install/draft crosses 80% or cannot fit after safe cleanup | Browser quota / desktop capacity | Warning at 80%, critical at 90% or write failure; only zero-ref disposable blobs preview/remove; source, installed in-use content, drafts, projects, and recovery retained; write remains uncommitted | Quota/disk fixtures |
| QS-212 | Offline | Installed pack and dependent project restart with network disconnected | Actual Pages scope and packaged Electron | Library, compose, recolor, preview, save, pack/project archive, generic/Godot export, and credits complete with zero required requests | Actual-host offline run |
| QS-213 | Maintainability | Future second pack profile or producer is proposed | Shared schemas/runtime/repositories | New profile adds a versioned decoder/renderer fixture without duplicating install, provenance, repository, or archive logic; current profile hashes remain | Dependency and duplicate-implementation scan |
| QS-214 | Distribution | UPD-002 web and portable desktop release | Actual Pages and versioned Windows ZIP | Lockfile reproducible; artifact/hash/version match; v2 projects and packs open; rollback readers remain; withdrawal loses no local content | Release and rollback rehearsal |

## Reference Package Classes

- Ordinary: <=16 assets, <=8 MiB compressed, <=32 MiB expanded.
- Large supported: <=128 assets and all hard format limits.
- Over-limit: exceeds exactly one declared boundary and must fail with `pack-limit` before mutation.

## Release Interpretation

No server SLO applies. Reliability is durability, deterministic local repositories, offline continuity, compatibility, bounded untrusted parsing, recovery, and independently withdrawable web/desktop releases.
