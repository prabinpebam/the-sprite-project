# MVP Execution Plan

| ID | Depends on | Trace records | Gate | Status |
|---|---|---|---|---|
| WP-SPEC | None | `CP-QUICK-START`, `CP-CREATIVE-CONTROL`, `CP-REPRODUCIBLE-WORK`, `CP-GAME-READY-DELIVERY`, `CP-LEGAL-CONFIDENCE`, `SC-FIRST-USE`, `SC-COMPOSE`, `SC-THEME`, `SC-PREVIEW`, `SC-RETURN`, `SC-GENERIC-EXPORT`, `SC-GODOT-EXPORT`, `SC-CREDITS`, `SC-RECOVERY`, `SC-SECOND-PACK` | Traceability validator passes | verified |
| WP-CORE | `WP-SPEC` | `UC-SELECT-PACK`, `UC-SELECT-LAYER`, `UC-CLEAR-LAYER`, `UC-APPLY-THEME`, `UC-EDIT-TOKEN`, `UC-OVERRIDE-TOKEN`, `UC-RESET-OVERRIDE`, `UC-SEE-COVERAGE`, `UC-INSPECT-ASSET` | Deterministic pack, recipe, render, palette, and provenance checks pass | verified |
| WP-APP | `WP-CORE` | `TF-FIRST-PROJECT`, `TF-COMPOSE`, `TF-EDIT-COMPOSITION`, `TF-THEME`, `TF-PREVIEW`, `TF-SAVE-REOPEN`, `TF-RECOVER`, `TF-KEYBOARD-JOURNEY` | Actual UI flows pass | verified |
| WP-EXPORT | `WP-CORE` | `TF-EXPORT-GENERIC`, `TF-EXPORT-GODOT`, `TF-INSPECT-CREDITS` | Downloaded artifacts and Godot fixture pass | verified |
| WP-SECOND-PACK | `WP-CORE`, `WP-APP`, `WP-EXPORT` | `TF-SECOND-PACK`, `UC-USE-SECOND-PACK` | Second pack completes the same UI and export contract without core branches | verified |

## Autonomous Defaults

- Continue through every unblocked package.
- Prefer reversible local choices.
- Produce evidence before changing a record to verified.
- Block only the affected legal, credential, independent-user, or publishing gate.
- Do not publish, deploy, or infer legal approval while the owner is unavailable.
