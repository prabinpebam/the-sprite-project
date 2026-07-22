# UPD-003 Threat and Failure Model

## Trust Boundary

Terrain definitions are code-owned. User-controlled terrain state is strict JSON-like project data: IDs, enum, four hex colors, 96 booleans, timestamps. No terrain file import, remote fetch, executable content, arbitrary archive path, or renderer filesystem authority is added.

| ID | Threat/failure | Consequence | Response | Verification |
|---|---|---|---|---|
| TH-301 | Terrain JSON contains unknown keys or host path | Host-state leakage or ambiguous behavior | Strict schema; reject before graph return | Unknown-key/path fixtures |
| TH-302 | Future terrain schema reaches old reader | Silent data loss | Reject unsupported version before mutation | Reader fixture |
| TH-303 | Archive-v3 terrain entry missing/unlisted/tampered | Partial or substituted project | Complete manifest inventory and SHA-256 before graph parse | Archive fixtures |
| TH-304 | Invalid dimensions/map length | Out-of-bounds render or memory pressure | Literal 12×8 and 96 booleans | One-over/under fixtures |
| TH-305 | Invalid color input | Parser/render inconsistency | Strict #RRGGBB; UI retains invalid draft but does not commit | Schema and actual UI |
| TH-306 | Non-deterministic texture generation | Cross-host/output drift | Integer PRNG seeded only by code-owned material seed and mask | Repeated/cross-host hashes |
| TH-307 | Terrain edit overwrites character or pack locks | Existing promise regression | Terrain update function changes only graph.terrain; snapshot/hash negative assertions | Domain and actual UI tests |
| TH-308 | Interrupted IndexedDB save | Partial graph | One transaction owns revision, snapshot, project, recipes, terrain, packs, embedded packs | Fault and read-back tests |
| TH-309 | Desktop external modification | Silent overwrite | Existing fingerprints include terrain.json; conflict choices unchanged | Packaged Electron flow |
| TH-310 | Archive downgrade drops terrain | Data loss | Format 3 required whenever terrain exists; writer refuses terrain in v1/v2 | Writer/reader tests |
| TH-311 | Export path influenced by material/name | Filesystem escape | Fixed canonical export filenames and existing relative-path validator | Bridge/export tests |
| TH-312 | Canvas operation stalls UI | Poor responsiveness | Fixed 128×128 atlas and 12×8 map, bounded synchronous render | Long-task/performance capture |
| TH-313 | Credits omit or invent terrain source | Legal traceability failure | Code-owned finite material provenance; selected material only | Credit fixture |
| TH-314 | Remove terrain is accidental | Work loss | Explicit modal, snapshot on next save, backup/snapshot restore | Actual UI recovery |
| TH-315 | Rollback build erases unknown terrain | Data loss | Retain terrain-v1/archive-v3 readers and preservation path; no cleanup treats terrain as disposable | Rollback rehearsal |

## Privacy

Terrain introduces no network request, telemetry, account, upload, external source navigation, or hidden filesystem write. Diagnostics may contain material ID, palette colors, dimensions, masks, and hashes only.

## Accepted Risks

- Cardinal masks do not represent diagonal-only transitions; explicitly excluded.
- Fixed preview map is not a level and may not model a complete game layout; explicitly excluded.
- Procedural built-in materials prioritize contract proof over artist-authored richness; terrain packs are deferred.
