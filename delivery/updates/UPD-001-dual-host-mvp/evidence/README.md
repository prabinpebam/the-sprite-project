# UPD-001 Evidence

`RUN-UPD001-001` is the release-owning verification run for the dual-host MVP.

## Inspect

- `runs/RUN-UPD001-001/run-summary.json` — authoritative counts, environment, flow IDs, expected-behavior IDs, and release hash.
- `runs/RUN-UPD001-001/report/index.html` — production web, baseline regression, accessibility, offline, storage, migration, archive, and cross-host Playwright report.
- `runs/RUN-UPD001-001/electron-report/index.html` — packaged Electron security, folder, export, conflict, and close-flow report.
- `runs/RUN-UPD001-001/artifacts/*/capture.json` and `final.png` — agenda-free web state and visible UI captures.
- `runs/RUN-UPD001-001/electron-artifacts/*/capture.json` and `final.png` — packaged desktop state, bridge exposure, and visible UI captures.

## Reproduce

From `product/`:

```powershell
npm run check
npm run package:electron
npm run test:e2e
npm run test:electron
npm audit
```

Then, from the workspace root:

```powershell
node delivery/updates/UPD-001-dual-host-mvp/promote-evidence.mjs
node delivery/updates/UPD-001-dual-host-mvp/generate-docs.mjs
node .github/skills/agentic-product-delivery/scripts/validate-product-update.mjs delivery/updates/UPD-001-dual-host-mvp
node .github/skills/product-engineering-spec-review/scripts/stabilize-spec.mjs check delivery/updates/UPD-001-dual-host-mvp/spec-lock.json
```

Promotion fails unless the final web run contains 24 expected tests, the packaged Electron run contains 4 expected tests, both have zero unexpected/flaky/skipped results, the trace model contains all 15 flows and 56 expected behaviors, and the `0.1.0` portable ZIP exists.
