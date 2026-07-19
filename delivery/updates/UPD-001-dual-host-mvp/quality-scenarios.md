# UPD-001 Quality Scenarios

These scenarios make cross-cutting quality claims measurable. They complement, rather than replace, user task flows and expected behaviors.

| ID | Quality | Source and stimulus | Environment and artifact | Required response and measure | Evidence |
|---|---|---|---|---|---|
| QS-001 | Correctness | User opens the same fixture in web and Electron | Current hosts; canonical project graph | Semantic graph, selected assets, frame hashes, spritesheet hash, credits, animation metadata, and Godot metadata are identical | Shared fixture plus actual-host parity run |
| QS-002 | Durability | Browser closes or process terminates during save | IndexedDB project and desktop folder | Last committed revision reopens; partial result is not presented as complete; dirty/recovery state is visible | Kill/interruption fixtures on both hosts |
| QS-003 | Recoverability | Legacy migration, pack replacement, conflict overwrite, or archive Replace fails | Source v1 data or current project graph | Untouched source or named checkpoint remains available; Retry/Download recovery/Cancel or conflict choices operate exactly as specified | Migration and destructive-recovery fixtures |
| QS-004 | Security | Malicious archive or invalid IPC request reaches a host boundary | Archive reader, Electron main/preload | Request fails before project/filesystem mutation with a stable error code; renderer gains no raw Node or path authority | Adversarial archive catalog, bridge contract tests, packaged UI checks |
| QS-005 | Compatibility | A project is saved by one host and re-saved unedited by the other | `.spriteproject` format version 1, project schema version 2 | Canonical payload SHA-256 values remain identical except declared non-semantic metadata; both hosts reopen without conversion | FILE-001 through FILE-005 fixtures |
| QS-006 | Accessibility | Keyboard or screen-reader user completes each new flow | 200% zoom, reduced motion, desktop viewport and constrained supported viewport | All controls are reachable and named, focus remains visible/logical, status is announced, dialogs restore focus, and no essential content is lost | Playwright keyboard/focus assertions plus automated and manual accessibility checks |
| QS-007 | Storage capacity | A pending write crosses 80% or cannot fit after safe cleanup | Browser quota and project <= archive limits | Warning appears at 80%; only declared disposable data is previewed/removed; current work and protected recovery data are retained; blocked write remains dirty | Mocked quota estimates and `QuotaExceededError` actual-UI flow |
| QS-008 | Performance | User makes a semantic edit in an ordinary project graph <= 8 MiB | Reference test machine: Windows x64, 2 logical CPUs, 8 GiB RAM, current supported Chromium | Unsaved status appears within one animation frame; save starts after 750 ms quiet period; 95% of save transactions and read-back complete within 2 seconds | 100-save benchmark with p50/p95 and failure count |
| QS-009 | Performance | User opens the maximum supported 128 MiB compressed archive | Same reference test machine; archive reader | Progress/status appears within 100 ms; validation finishes within 10 seconds or returns a stable limit/validation error without UI freeze over 250 ms | Maximum-boundary archive benchmark and long-task capture |
| QS-010 | Offline | User completes the readiness preflight, restarts after one complete online load, and disconnects network | Published GitHub Pages subpath; every exact project pack lock resolves to a bundled, locally installed, or archive-embedded record | UI reports Ready offline before disconnect; app shell, local help, project, rendering, archive operations, and generic/Godot export complete with zero required failed network requests; a missing lock is named and blocks deterministic render/export without substitution | Real Pages/service-worker offline run plus one unavailable-pack fixture |
| QS-011 | Release safety | New web or portable desktop build is made available | Actual Pages deployment and GitHub Release artifact | Build is reproducible from lockfile; artifact/version/hash match release record; smoke flows pass; rollback restores known-good host without data loss | Build hash record, deployment smoke, clean-machine launch, rollback rehearsal |
| QS-012 | Maintainability | A future host adapter or project schema migration is added | Shared core and contract packages | Domain/render modules import no browser/Electron implementation; new adapter passes shared contract and compatibility fixtures without duplicating canonical serializers | Dependency rule, contract suite, and duplicate-implementation scan |

## Supported Data Boundaries

- Canonical JSON/text entry: up to 8 MiB.
- Individual imported binary: up to 64 MiB.
- Compressed archive: up to 128 MiB.
- Total archive expansion: up to 256 MiB.
- Entry count: up to 512.
- These are safety and support boundaries, not performance targets. Inputs above them fail closed with `archive-limit` and remain unchanged.

## Release Interpretation

UPD-001 has no hosted application service, so service uptime, traffic, paging, and server saturation SLOs are not applicable. Reliability is evaluated through correctness, durability, recoverability, offline continuity, storage capacity, packaged-host behavior, and independently withdrawable releases.