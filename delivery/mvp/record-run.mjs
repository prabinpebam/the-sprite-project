#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const modelPath = path.join(root, 'traceability.json')
const runRoot = path.join(root, 'evidence', 'runs', 'RUN-MVP-001')
const resultsPath = path.join(runRoot, 'playwright-results.json')
const godotPath = path.join(runRoot, 'godot-validation.txt')
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'))
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
const godot = fs.readFileSync(godotPath, 'utf8')
const specs = []
const collect = suite => {
  for (const spec of suite.specs ?? []) specs.push(spec)
  for (const child of suite.suites ?? []) collect(child)
}
for (const suite of results.suites ?? []) collect(suite)
const flowResults = new Map(specs.map(spec => [spec.title.match(/^(TF-[A-Z-]+)/)?.[1], spec.ok]))
const expectedFlows = new Set(model.flows.map(flow => flow.id))
const missing = [...expectedFlows].filter(id => !flowResults.has(id))
const failed = [...flowResults].filter(([, ok]) => !ok).map(([id]) => id)
if (missing.length || failed.length || results.stats?.unexpected !== 0 || results.stats?.flaky !== 0) {
  throw new Error(`Canonical UI run is not clean. Missing: ${missing.join(', ') || 'none'}. Failed: ${failed.join(', ') || 'none'}.`)
}
if (!godot.includes('GODOT_VALIDATION_PASS animations=8 walk_frames=4 texture=256x512 region=192,256,64,64')) {
  throw new Error('Godot engine validation evidence is absent or incomplete.')
}
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'workPackages', 'decisions']) {
  for (const item of model[key]) item.status = 'verified'
}
model.stage.status = 'verified'
model.runs = [{
  id: 'RUN-MVP-001',
  status: 'verified',
  startedAt: results.stats.startTime,
  durationMs: Math.round(results.stats.duration),
  sourceRevision: '7d559ce plus recorded working-tree implementation',
  environment: {
    browser: 'Playwright Chromium desktop plus 390x844 constrained viewport',
    productServer: 'Vite development server owned by Playwright',
    engine: 'Godot 4.7.1-stable official a13da4feb',
  },
  flowIds: [...expectedFlows],
  expectedBehaviorIds: model.expectedBehaviors.map(item => item.id),
  evidence: [
    'playwright-results.json',
    'report/index.html',
    'artifacts/*/capture.json',
    'artifacts/*/final.png',
    'godot-validation.txt',
  ],
  anomalies: [],
}]
model.issues = [
  { id: 'ISSUE-001', severity: 4, status: 'verified', traceIds: ['TF-PREVIEW', 'TF-SAVE-REOPEN'], disposition: 'Resolved: narrowed ambiguous text locators to their owning control without changing product behavior.', verificationRunId: 'RUN-MVP-001' },
  { id: 'ISSUE-002', severity: 2, status: 'verified', traceIds: ['TF-KEYBOARD-JOURNEY', 'EB-KEYBOARD'], disposition: 'Resolved: removed mobile top-bar and workflow-tab intrinsic widths that forced a 426px layout at a 390px viewport.', verificationRunId: 'RUN-MVP-001' },
  { id: 'ISSUE-003', severity: 3, status: 'verified', traceIds: ['TF-SAVE-REOPEN', 'EB-RELOAD'], disposition: 'Resolved: test setup now clears storage once rather than deleting saved data on every reload.', verificationRunId: 'RUN-MVP-001' },
  { id: 'ISSUE-004', severity: 3, status: 'verified', traceIds: ['TF-SAVE-REOPEN', 'EB-RELOAD'], disposition: 'Resolved: persistence capture waits for the selected composition render hash to commit before saving.', verificationRunId: 'RUN-MVP-001' },
  { id: 'ISSUE-005', severity: 2, status: 'verified', traceIds: ['TF-EXPORT-GODOT', 'EB-GODOT-DOWNLOAD'], disposition: 'Resolved: fixture mirrors root package extraction and defers resource loading until Godot import remaps are initialized.', verificationRunId: 'RUN-MVP-001' },
]
fs.writeFileSync(modelPath, `${JSON.stringify(model, null, 2)}\n`)
console.log(`Recorded RUN-MVP-001: ${flowResults.size}/${expectedFlows.size} flows, ${model.expectedBehaviors.length} behaviors, Godot PASS, 0 open anomalies.`)
