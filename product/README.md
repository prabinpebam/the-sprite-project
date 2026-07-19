# The Sprite Project MVP

A local-first, pack-driven character workspace. The MVP composes one humanoid character from declarative packs,
applies semantic project and character colors, previews idle and walk in four directions, saves the deterministic
recipe locally, and exports generic or Godot 4 packages with exact credits.

## Run

```powershell
npm install
npm run dev
```

The current local inspection server uses `http://127.0.0.1:4174/`.

## Validate

```powershell
npm run check
npm run test:e2e
```

`npm run check` runs Oxlint, five focused core tests, TypeScript compilation, and the production build.
`npm run test:e2e` starts its own application server and drives all 12 scoped task flows through visible UI
controls. It checks canvas paint and hashes, hit testing, keyboard operation, constrained viewport overflow,
persistence after reload, ZIP contents, readiness failures, recovery, provenance, and both content packs.

The Godot fixture requires the pinned portable runtime described by the delivery evidence. Its validation command is:

```powershell
& ".\.tools\godot\runtime\Godot_v4.7.1-stable_win64.exe" `
  --headless --path tests\godot-fixture --script res://validate.gd
```

## Architecture

- `src/domain/types.ts` - stable project, pack, asset, animation, theme, and provenance contracts
- `src/domain/packs.ts` - two original CC0 demonstration packs expressed as declarative pixel primitives
- `src/domain/render.ts` - pack-independent Canvas 2D composition and spritesheet generation
- `src/domain/project.ts` - project lifecycle, readiness, resolved themes, and exact credits
- `src/domain/export.ts` - generic ZIP and Godot `SpriteFrames` adapter
- `src/domain/storage.ts` - versioned local persistence
- `src/App.tsx` - five-view public workflow
- `tests/mvp-flows.spec.ts` - one actual-UI acceptance test per `TF-*` task-flow ID

The UI does not own layer geometry, palette bindings, animation coverage, or provenance. Both packs traverse the
same renderer and export adapters.

## Inspect Evidence

The canonical scope and status are in `../delivery/mvp/traceability.json`. Human-readable promise, scenario,
capability, flow, experience architecture, exclusion, decision, issue, and execution documents are generated beside
it. `../delivery/mvp/evidence/runs/RUN-MVP-001/` contains the Playwright report, raw captures, final screenshots,
download assertions, and passing Godot output.
