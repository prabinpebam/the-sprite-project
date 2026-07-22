# UPD-004 Threat And Failure Model

| ID | Threat/failure | Response | Verification |
|---|---|---|---|
| TH-401 | Duplicate/ambiguous character names | Trim, NFC, case-insensitive uniqueness before mutation | Name vectors and UI errors |
| TH-402 | Recipe ID/name becomes a path | Only validated stable ID owns fixed `recipes/<id>.json` path | Archive/path fixtures |
| TH-403 | Editing active recipe replaces siblings | Pure active-only replacement and sibling byte assertions | Domain/repository tests |
| TH-404 | Deleted recipe remains in storage/folder | Delete stale canonical recipe rows/files atomically | Reopen and folder inventory |
| TH-405 | Active recipe deleted without fallback | Deterministic next/previous selection in one graph mutation | Removal vectors |
| TH-406 | Pack change drops sibling locks | Merge locks and block conflicting in-use replacement | Multi-pack tests |
| TH-407 | Partial save mixes recipe revisions | One project revision transaction/write plan | Fault/stale tests |
| TH-408 | Old reader silently opens first recipe | Strict cardinality rejection before graph return | Baseline reader fixture |
| TH-409 | Export target ambiguity | Active character name and ID shown; active recipe only | UI/artifact inspection |
| TH-410 | Rollback drops unknown recipes | Preserve all strict entries even when UI disabled | Rollback rehearsal |

No network, telemetry, account, executable format, raw path authority, or new Electron bridge method is added.