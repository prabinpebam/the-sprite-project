# Traceability Model

## ID Types

| Prefix | Record | Required relationship |
|---|---|---|
| `CP` | Customer promise | Root; covered by scenarios and expected behaviors |
| `SC` | User scenario | References one or more promises |
| `UC` | User-can capability | References scenarios; covered by task flows |
| `TF` | Task flow | References scenarios and capabilities; contains steps |
| `IA` | Information object | Used by views or flows |
| `NAV` | Navigation route or transition | Used by flow steps |
| `VIEW` | Page, panel, dialog, or subview | Used by flow steps |
| `UI` | Interactive or feedback element | Used by flow steps |
| `EB` | Expected behavior | References a flow and one or more steps |
| `OUT` | Explicit exclusion | Names plausible expectation, reason, and future disposition |
| `WP` | Execution package | Implements trace IDs and declares dependencies |
| `RUN` | Actual-UI validation run | Tests task flows and expected behaviors |
| `ISSUE` | Observed anomaly | References run and affected trace IDs |
| `DEC` | Decision | Records evidence, reversibility, and consequences |

Use stable IDs such as `TF-EXPORT-GODOT`, not generated array positions. IDs may remain semantic across stages when meaning is unchanged.

## Canonical Status Values

- `specified`
- `designed`
- `implemented`
- `verified`
- `blocked`
- `excluded`

Only generated evidence may set a flow or expected behavior to `verified`.

## Coverage Rules

1. Every `CP` has at least one `SC` and one `EB` transitively through a flow.
2. Every `SC` references a `CP` and has at least one `UC`.
3. Every `UC` references a `SC` and appears in at least one `TF`.
4. Every `TF` references at least one `UC`, has at least one step, and has at least one `EB`.
5. Every flow step references a `VIEW`, a `UI`, a `NAV` when navigation occurs, and at least one `EB`.
6. Every `VIEW`, `UI`, and `NAV` is used by a flow. Unused interface is out of scope.
7. Every `EB` references concrete flow steps and declares an objective oracle.
8. Every passing `TF` has a latest `RUN` whose evidence covers every referenced `EB`.
9. Every plausible adjacent expectation is represented in scope or as an `OUT` record.
10. Every implementation package references the trace IDs it delivers.

## Expected Behavior Oracles

Prefer observable values:

- exact visible text or accessible name
- enabled/disabled, selected, focused, expanded, or busy state
- hit-test result at the control center
- visible pixel/color/geometry expectation
- no overlap or horizontal overflow
- exact project state after reload
- emitted filename, media dimensions, hash, or structured content
- downstream import/runtime behavior
- zero console/page/network errors

Avoid "intuitive," "polished," "fast," or "correct" unless decomposed into measurable expectations.

## Exclusion Quality

An exclusion must include:

- expectation being excluded
- why a target user could reasonably expect it
- reason it is not required for the active promise
- consequence or workaround
- target stage or permanent rejection
- evidence that active flows remain complete without it

"Not MVP" is not a sufficient reason.
