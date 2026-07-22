# UPD-003 Quality Scenarios

| ID | Quality | Stimulus | Environment | Required response | Evidence |
|---|---|---|---|---|---|
| QS-301 | Correctness | Generate every mask for every material | Shared pure renderer | 64 tiles render; masks use N=1 E=2 S=4 W=8; identical input hashes match | Pixel fixtures and mask manifest tests |
| QS-302 | Correctness | Paint or erase one map cell | 12×8 map | Only the cell and four cardinal neighbors may change masks; grid size never changes | Pure neighborhood test plus actual UI |
| QS-303 | Determinism | Export unchanged terrain twice | Web and Electron | Atlas pixels, manifest, credits, and canonical payload entries match exactly | Repeated export and cross-host hash evidence |
| QS-304 | Compatibility | Open existing character-only project/archive | Updated host | Terrain is null; project, render, character export, packs, and credits remain unchanged | Full baseline regression hashes |
| QS-305 | Compatibility | Old archive-v2 reader opens terrain archive | Reader-only baseline fixture | Literal archive version 3 returns unsupported-version before project/repository mutation | Old-reader fixture |
| QS-306 | Durability | Process closes during terrain save | IndexedDB/Electron project write | Last committed character+terrain graph reopens; no partial terrain state | Transaction interruption and packaged close flow |
| QS-307 | Conflict | Two tabs edit terrain from one revision | Browser IndexedDB | First commit wins; stale write writes nothing and exposes existing choices | Actual multi-tab flow |
| QS-308 | Accessibility | Keyboard user creates, paints, themes, removes, and exports | 320px, 200%, reduced motion | All controls named/reachable; grid keyboard works; dialogs restore focus; no page overflow | Playwright keyboard/reflow evidence |
| QS-309 | Performance | Paint ordinary map and regenerate atlas | Reference Chromium/Electron | Visible map/atlas update p95 <=50ms; no layout shift | 100-edit benchmark and canvas capture |
| QS-310 | Export | Generate generic/Godot terrain packages | Both hosts | Completes <=2s; all files present; Godot validates 16 tiles and representative masks | Package inspection and pinned Godot fixture |
| QS-311 | Offline | Restart installed web app with terrain | Repository subpath, network disconnected | Paint, theme, save, backup, generic/Godot export complete with zero required requests | Actual service-worker-controlled flow |
| QS-312 | Cross-host | Move archive-v3 web→Electron→web | Actual hosts | Terrain doc, atlas/map hashes, character hash, generic/Godot metadata, and credits match | Bidirectional actual-host flow |
| QS-313 | Security | Tamper terrain JSON, manifest, dimensions, colors, map length, archive path | Shared reader and Electron boundary | Stable failure before mutation; source bytes retained; no path/code authority | Adversarial fixtures |
| QS-314 | Recovery | Remove terrain then restore snapshot | Web and Electron project lifecycle | Terrain returns exactly; character state never changes | Snapshot/rollback actual UI |
| QS-315 | Rollback | Withdraw terrain UI | Reader-only rollback build | Archive-v3 and terrain-v1 remain readable/preserved; no local data deletion | Rollback rehearsal |

## Capacity Boundaries

- exactly one terrain document;
- exactly 12×8 occupancy;
- exactly 16 masks and 32px tiles;
- canonical terrain JSON <=64 KiB;
- one-over dimensions, occupancy length, schema version, or JSON boundary fails before mutation;
- existing project archive global limits remain binding.

## Completion Interpretation

Every scenario is categorical. Performance, compatibility, old-reader, Godot, offline, cross-host, accessibility, and rollback results do not average; one failure blocks promotion of the affected promise.
