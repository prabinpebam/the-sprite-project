# Execution and Actual-UI Validation

## Work-Package Shape

Every package declares:

- dependency IDs
- delivered trace IDs
- source inputs
- autonomous defaults
- implementation actions
- narrow executable checks
- actual-UI flows unlocked
- generated artifacts
- failure recovery
- human-only gate, if any

Run independent packages in parallel. Stop downstream packages when a contract or deterministic-output gate fails.

## Actual-UI Run Contract

A run result should contain:

```json
{
  "id": "RUN-20260719-001",
  "startedAt": "ISO-8601",
  "build": { "commit": "hash", "mode": "production" },
  "environment": { "browser": "chromium", "viewport": [1440, 900] },
  "flows": [
    {
      "id": "TF-EXAMPLE",
      "status": "passed",
      "expectations": [
        { "id": "EB-EXAMPLE-01", "status": "passed", "evidence": ["capture.json", "step-01.png"] }
      ],
      "anomalies": []
    }
  ],
  "consoleErrors": [],
  "pageErrors": [],
  "failedRequests": [],
  "artifacts": []
}
```

## Interaction Rules

- Start from a clean, user-reachable state.
- Use role, label, and visible-text locators before test IDs.
- Click or type through visible controls; do not call app internals.
- Verify the target is visible, enabled, and receives the hit test.
- Capture after every material user action before evaluating.
- Reload or reopen where persistence is promised.
- Inspect downloaded/exported files as the user would consume them.
- Use a real downstream fixture for integration promises.
- Record retries. A passing retry does not erase the original anomaly.

## Agenda-Free Capture

Capture raw product state without filtering it around known detectors:

- current URL and title
- accessibility snapshot or key role/name/state inventory
- bounding boxes and viewport dimensions
- screenshots
- canvas pixel samples or image hashes
- visible status/toast/dialog content
- storage or saved-file state through public product behavior
- console, page, and network events
- downloaded artifact metadata

Apply expectation logic after capture so the evidence remains useful when criteria evolve.

## Severity

| Severity | Meaning | Release effect |
|---|---|---|
| 0 | Data loss, security breach, unsafe/legal violation | Stop all affected execution |
| 1 | Core promise or flow cannot complete | Blocks stage |
| 2 | Material expectation, recovery, accessibility, or output defect | Blocks stage |
| 3 | Minor friction with a complete workaround | May proceed only with recorded disposition |
| 4 | Cosmetic discrepancy outside an explicit oracle | Track if worthwhile |

## Completion Arithmetic

Calculate and publish:

- scope coverage = linked required records / all required records
- implementation coverage = implemented in-scope records / all in-scope records
- flow pass rate = latest passing flows / all in-scope flows
- expected-behavior pass rate = passing `EB` / all in-scope `EB`
- anomaly closure = resolved blocking issues / all blocking issues

The completion gate requires 100% for the first four measures and no unresolved Severity 0-2 issue. Do not average categories; one missing behavior remains visible.

## Human-Only Inputs

Acceptable human gates are limited to:

- entering secrets directly into a trusted terminal or provider
- legal or commercial risk acceptance
- independent user observation or research participation
- destructive remote action or irreversible publication approval

Prepare everything around the gate, block only the affected release claim, and continue independent work.
