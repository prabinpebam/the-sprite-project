# UPD-003 Release Gate

UPD-003 is complete only when every category reaches its exact requirement.

| Measure | Required value |
|---|---:|
| Traceability coverage | 100% |
| New implementation records | 100% implemented |
| 8 task flows | 100% passing latest actual-UI run |
| 28 expected behaviors | 100% passing direct evidence |
| Affected MVP/UPD-001/UPD-002 regressions | 100% passing |
| Terrain masks/material pixel fixtures | 64/64 exact |
| Character-only compatibility | No semantic or promised byte/hash drift |
| Archive-v3 and old-reader behavior | 100% pass |
| Generic/Godot terrain artifacts | 100% inspected and downstream-valid |
| Severity 0–2 issues | 0 unresolved |
| Undeclared console/page/network/filesystem/IPC anomalies | 0 |

## Entry Gate

- Direct product-owner request is captured.
- Baseline commit `24bcd44` and `RUN-UPD002-001` are immutable.
- Product/UX, engineering, quality, threat, rollout, rollback, and exclusions are complete.
- Deep review verdict is ready, all applicable dimensions >=8, no unresolved decisions, unfamiliar implementer passes.
- Specification lock validates.

## Contract Gate

- `TerrainDocumentV1`, strict parser, material registry, cardinal masks, atlas/map renderer, and manifest are host-neutral.
- Project schema v2, character recipe v1, humanoid pack schema/runtime, and existing theme tokens are unchanged.
- Character-only repositories and archives remain compatible.
- Terrain archive format 3 rejects in old readers before mutation.
- Invalid/tampered terrain fails before project/repository writes.

## UX Gate

- Empty, creation, material, paint/erase, fill/clear, palette edit/reset, readiness, removal, export, error, conflict, and recovery states pass.
- Keyboard, accessible grid, focus restore, 320px, 200%, target size, contrast, and reduced motion pass.
- Terrain and character are visibly in one project but no scene promise is implied.

## Web Gate

- IndexedDB v4 upgrade is idempotent and does not rewrite existing project records.
- Terrain commits atomically with project revision/snapshot behavior.
- Controlled service-worker offline restart supports paint, save, backup, and both exports.
- Zero undeclared requests.

## Electron Gate

- Existing frozen bridge method count remains unchanged.
- Folder project includes `terrain.json` only when terrain exists.
- Save/read-back, fingerprint/external conflict, direct terrain export, and unsaved close pass in packaged Windows host.
- No raw path or Node authority reaches renderer.

## Cross-Host Gate

- Web→Electron→web archive-v3 round trip preserves terrain document, atlas/map hashes, character hash, and both terrain export metadata.
- Character-only archive-v1/v2 round trips remain unchanged.
- Older reader rejects archive v3.

## Performance Gate

- Single paint update p95 <=50ms over 100 interactions.
- Atlas generation p95 <=50ms over 100 documents.
- Generic and Godot package build each <=2s.
- No main-thread task >100ms in actual Chromium/Electron ordinary flow.

## Rollout

Web and Electron readers/writers release together. Terrain navigation may be feature-disabled only while archive-v3 and terrain-v1 preservation readers remain active.

## Rollback Rehearsal

1. Export character-only baseline backup and hashes.
2. Add terrain, export terrain packages and archive-v3 backup.
3. Open with reader-only rollback build.
4. Preserve terrain through project save/copy/backup while UI is disabled.
5. Restore normal build and prove terrain plus character hashes unchanged.
6. Confirm withdrawal deletes no project, terrain, packs, snapshots, provenance, or recovery data.

Actual GitHub Pages and independent clean-machine Windows gates remain shared release obligations inherited from prior updates; they do not permit false promotion if absent.
