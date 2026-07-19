# Product Updates

Every change to an approved or verified product requirement is recorded under a stable update directory:

```text
delivery/updates/UPD-NNN-short-name/
```

Follow the repository's `agentic-product-delivery` skill and the documentation page
`docs/governance/product-update-pipeline.html`.

## Rules

- Preserve verified baselines; never rewrite them to absorb a new requirement.
- Start from customer outcomes, not requested UI or implementation.
- Derive promises, scenarios, user-can statements, task flows, IA/navigation/views/UI, and objective behaviors in order.
- Include explicit exclusions, impact analysis, ADR reconciliation, work packages, release arithmetic, migration, and rollback.
- Validate the complete update before implementation:

```powershell
node .github/skills/agentic-product-delivery/scripts/validate-product-update.mjs `
  delivery/updates/UPD-NNN-short-name
```

- Promote status only from generated actual-UI and integration evidence.
- Keep human-readable pages generated from the canonical `traceability.json` whenever practical.

## Registry

| Update | Baseline | Status | Summary |
|---|---|---|---|
| `UPD-001-dual-host-mvp` | `f29c9f9` / `RUN-MVP-001` | Specified | GitHub Pages/IndexedDB web host plus portable Electron/project-folder host over one shared core |
