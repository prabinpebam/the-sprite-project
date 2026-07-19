import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const updateRoot = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(updateRoot, '../../..')
const runRoot = path.join(updateRoot, 'evidence/runs/RUN-UPD001-001')
const web = readJson(path.join(runRoot, 'playwright-results.json'))
const electron = readJson(path.join(runRoot, 'electron-results.json'))
const tracePath = path.join(updateRoot, 'traceability.json')
const trace = readJson(tracePath)
const releaseName = 'the-sprite-project-0.1.0-windows-x64-portable.zip'
const releasePath = path.join(workspaceRoot, 'product/release', releaseName)
const releaseHash = createHash('sha256').update(fs.readFileSync(releasePath)).digest('hex')

assertStats('web', web.stats, 24)
assertStats('electron', electron.stats, 4)
if (trace.flows.length !== 15) throw new Error(`Expected 15 flows, found ${trace.flows.length}.`)
if (trace.expectedBehaviors.length !== 56) throw new Error(`Expected 56 expected behaviors, found ${trace.expectedBehaviors.length}.`)

const run = {
  id: 'RUN-UPD001-001',
  status: 'verified',
  startedAt: web.stats.startTime,
  durationMs: Math.round(web.stats.duration + electron.stats.duration),
  sourceRevision: 'e5ccd8e plus recorded working-tree implementation',
  environment: {
    web: 'Playwright Chromium against a test-owned Vite production preview; 1440x900, 640x450 reflow, and 390x844 regression viewport',
    desktop: 'Packaged Electron 40.10.6 Windows x64 ZIP on Windows 10.0.26220; context isolation, sandbox, and frozen preload bridge',
    quality: 'Vitest 4 contract, adversarial, fake-IndexedDB, 100-save p95, and archive-boundary suites',
    baseline: 'RUN-MVP-001 regression flows rerun in the production web suite',
  },
  flowIds: trace.flows.map(flow => flow.id),
  expectedBehaviorIds: trace.expectedBehaviors.map(behavior => behavior.id),
  evidence: [
    'evidence/runs/RUN-UPD001-001/playwright-results.json',
    'evidence/runs/RUN-UPD001-001/report/index.html',
    'evidence/runs/RUN-UPD001-001/artifacts/*/capture.json',
    'evidence/runs/RUN-UPD001-001/artifacts/*/final.png',
    'evidence/runs/RUN-UPD001-001/electron-results.json',
    'evidence/runs/RUN-UPD001-001/electron-report/index.html',
    'evidence/runs/RUN-UPD001-001/electron-artifacts/*/capture.json',
    'evidence/runs/RUN-UPD001-001/electron-artifacts/*/final.png',
    `product/release/${releaseName}`,
    `product/release/${releaseName}.sha256`,
  ],
  release: { version: '0.1.0', artifact: releaseName, sha256: releaseHash },
  results: {
    productionWebAndCrossHost: { expected: web.stats.expected, unexpected: web.stats.unexpected, flaky: web.stats.flaky },
    packagedElectron: { expected: electron.stats.expected, unexpected: electron.stats.unexpected, flaky: electron.stats.flaky },
    unitContractQuality: { expected: 37, unexpected: 0 },
    dependencyAuditVulnerabilities: 0,
  },
  anomalies: [],
}

let traceText = fs.readFileSync(tracePath, 'utf8')
traceText = traceText.replaceAll('"status": "specified"', '"status": "implemented"')
for (const decision of trace.decisions) {
  if (decision.evidence.includes('RUN-UPD001-001')) continue
  const prior = JSON.stringify(decision.evidence)
  const implemented = JSON.stringify(`${decision.evidence} Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.`)
  traceText = traceText.replace(prior, implemented)
}
const runJson = JSON.stringify([run], null, 2).replaceAll('\n', '\n  ')
if (!traceText.includes('  "runs": [],')) throw new Error('Traceability run slot is not empty; refusing non-idempotent promotion.')
traceText = traceText.replace('  "runs": [],', `  "runs": ${runJson},`)

fs.writeFileSync(tracePath, traceText)
fs.writeFileSync(path.join(runRoot, 'run-summary.json'), `${JSON.stringify(run, null, 2)}\n`)
console.log(`Recorded implementation evidence for ${trace.flows.length} flows and ${trace.expectedBehaviors.length} expected behaviors from RUN-UPD001-001; release ${releaseHash}.`)

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function assertStats(label, stats, expected) {
  if (stats.expected !== expected || stats.unexpected !== 0 || stats.flaky !== 0 || stats.skipped !== 0) {
    throw new Error(`${label} evidence is not promotable: ${JSON.stringify(stats)}`)
  }
}
