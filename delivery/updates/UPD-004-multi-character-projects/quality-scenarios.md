# UPD-004 Quality Scenarios

| ID | Quality | Stimulus | Required response | Evidence |
|---|---|---|---|---|
| QS-401 | Correctness | Create, switch, edit two characters | Active render changes; sibling recipe bytes do not | Domain plus actual UI |
| QS-402 | Isolation | Run every create/switch/edit/duplicate/rename/delete operation | Every non-target recipe and terrain canonical hash stays identical unless a declared operation adds/removes that exact recipe | Negative hash assertions for every operation |
| QS-403 | Persistence | Save/reopen 16 recipes | Names, order, active ID, state, and terrain restore exactly | Repository and host flows |
| QS-404 | Deletion | Delete active, middle, last, or sole recipe | Deterministic fallback; sole delete blocked; snapshot restores | Unit and actual UI recovery |
| QS-405 | Compatibility | Open one-character baseline | No migration prompt or output drift | Full baseline regressions |
| QS-406 | Old reader | Open multi-character archive in single-character reader | Reject before graph return/mutation | Reader fixture |
| QS-407 | Archive | Tamper one recipe path/body/checksum | Reject complete archive before mutation | Adversarial fixtures |
| QS-408 | Cross-host | Web→Electron→web with 3 characters and terrain | All recipe and terrain hashes match | Actual-host round trip |
| QS-409 | Accessibility | Keyboard create/switch/rename/delete | Active row has `aria-current` plus visible `Active`; named controls, persistent modal errors/drafts, focus restoration, no overflow | Playwright 320px/reflow |
| QS-410 | Performance | Switch 100 times; save 16 recipes | p95 <=50ms; save/reopen <=2s; no >100ms task | Browser/Electron capture |
| QS-411 | Conflict | Two tabs edit different characters from one revision | First save wins; stale write writes nothing and offers existing choices | Multi-tab flow |
| QS-412 | Rollback | Disable collection UI after multi-character save | All recipe entries preserved and re-exportable | Reader-only rehearsal |

All scenarios are categorical. One failed isolation, persistence, compatibility, or recovery oracle blocks promotion.