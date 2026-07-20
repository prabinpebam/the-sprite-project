# UPD-002 Release Gate

UPD-002 is complete only when every category reaches its exact requirement. Categories are never averaged.

| Measure | Required value |
|---|---:|
| Traceability coverage | 100% |
| New implementation records | 100% implemented |
| 11 task flows | 100% passing latest actual-UI run |
| 40 expected behaviors | 100% passing direct evidence |
| Affected UPD-001 regressions | 100% passing on every affected host |
| Adversarial pack/image/license/bridge fixtures | 100% stable pre-mutation failure |
| Cross-host pack/project/runtime/output/credit parity | 100% exact |
| Severity 0–2 issues | 0 unresolved |
| Undeclared console/page/network/filesystem/IPC anomalies | 0 |
| Dependency vulnerabilities affecting runtime/package boundary | 0 unaccepted |

## Specification and Entry Gate

- Product owner approves `CP-PACK-*`, proposed decisions, exclusions, entry condition, rollout, and accepted risks.
- `spec-review.json` verdict is `ready`, all applicable dimensions >=8, no unresolved decisions, and unfamiliar-implementer review passes.
- UPD-001 actual Pages and clean-machine gates complete, or the owner explicitly reschedules them with no false inherited status.
- Canonical graph and generated docs validate with no orphans or stale projections.

## Contract Gate

- `.spritepack` v1, runtime pack v2, draft v1, project archive v2, license profiles, PNG profile, canonical serialization, limits, and stable errors are implemented once in shared packages.
- Bundled and installed assets satisfy one runtime contract; installed origin never creates a renderer/export/credits branch.
- Every named hostile fixture fails with the same stable code on web and Electron before repository/project mutation.
- Existing Wayfarer/Harbor project, frame/sheet, generic/Godot, archive, and credit hashes remain unchanged.

## Product and UX Gate

- Install summary is complete before commit and cancellation restores focus/mutates nothing.
- Library, enable/disable, side-by-side versions, activation preview/checkpoint, remove protection, and missing-lock recovery pass.
- Authoring identity, PNG import, asset configuration, full color disposition, provenance, runtime preview, autosave/reopen/failure, validation navigation, deterministic export, and self-install pass.
- Keyboard, screen-reader naming, focus, 200% reflow, 320px viewport, target size, contrast, and reduced motion pass every new flow.
- No user-facing content claims trust, safety, legal clearance, or legal advice for user-provided packs.

## Web Gate

- Actual GitHub Pages repository scope installs/uses authored packs after first load and completes dependent project and export flows offline.
- IndexedDB upgrade is idempotent; install/remove/draft transactions survive interruption and conflict.
- 80%/90% quota states preserve projects, packs in use, drafts, original source bytes, and recovery.
- Browser local content produces zero undeclared network requests.

## Electron Gate

- Packaged Windows x64 host exposes the versioned frozen bridge with 18 exact methods and no Node/raw-path authority.
- Native chooser, pack read/install/list/remove/write, userData repository, atomic writes, reparse checks, payload limits, and error mapping pass.
- Closing during draft/install/remove follows visible dirty/recovery semantics.
- Portable ZIP, SHA-256, release notes, and clean-machine launch accurately cover pack storage, upgrades, rollback, and unsigned behavior.

## Cross-Host and Portability Gate

- Web-authored pack installs in Electron and Electron-authored pack installs in web with identical canonical payloads, runtime pixels, and credits.
- Dependent project archive v2 embeds exact package bytes, opens offline on both hosts, and preserves package and project payload hashes on unedited re-save.
- Bundled-only projects continue emitting/round-tripping project archive v1.
- Older host rejects project archive v2 and future pack/draft versions before mutation.

## Performance and Capacity Gate

- Maximum supported package reports status within 100 ms, updates stages at least every 500 ms, and validates/fails within 10 s with no main-thread stall >100 ms.
- 100 ordinary draft saves meet 750 ms quiet period and <=2 s p95 transaction/read-back.
- Mapping preview update meets <=250 ms p95 for ordinary assets.
- Maximum package and one-over-each-limit fixtures stay within declared memory/storage boundaries.

## Rollout

Web and Electron support release together. Authoring may be feature-disabled only if install/read/runtime/project archive v2 readers remain enabled. No release may create data a rollback build cannot preserve.

## Rollback Rehearsal

1. Export authored pack, draft recovery, and dependent project backup.
2. Roll back web and Electron UI while retaining pack v1/runtime v2/draft v1/project archive v2 readers.
3. Reopen installed pack, draft, and project without data loss; authoring may be read-only.
4. Restore prior package/index and project checkpoint after injected failed update/remove.
5. Confirm withdrawal deletes no package, PNG, draft source, project, snapshot, provenance, or recovery data.
