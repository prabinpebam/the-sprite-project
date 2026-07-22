#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const runRoot = path.join(root, 'evidence', 'runs', 'RUN-UPD004-001')
const read = relativePath => JSON.parse(fs.readFileSync(path.join(runRoot, relativePath), 'utf8'))
const modelPath = path.join(root, 'traceability.json')
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'))
const summary = read('run-summary.json')
const unit = read('unit-results.json')
const reports = [
  ['UPD-004 web', read('playwright-results.json'), 4],
  ['UPD-004 Electron', read('electron-results.json'), 1],
  ['UPD-004 cross-host', read('cross-host-results.json'), 1],
  ['retained web', read('regression-web-results.json'), 37],
  ['retained Electron', read('regression-electron-results.json'), 8],
  ['retained cross-host', read('regression-cross-host-results.json'), 1],
  ['Pages subpath', read('pages-results.json'), 1],
]
const performance = read('performance-summary.json')
const rollback = read('rollback-results.json')
const audit = read('dependency-audit.json')
const requireValue = (condition, message) => { if (!condition) throw new Error(message) }
const playwrightPass = ([label, report, expected]) => {
  requireValue(report.stats?.expected === expected, `${label}: expected ${expected} passing tests`)
  requireValue(report.stats?.unexpected === 0 && report.stats?.flaky === 0 && report.stats?.skipped === 0, `${label}: run is not categorical`)
}

requireValue(summary.status === 'verified-local', 'Run summary is not verified-local.')
requireValue(unit.success && unit.numPassedTests === 87 && unit.numFailedTests === 0, 'Unit/contract quality gate failed.')
for (const report of reports) playwrightPass(report)
requireValue(performance.chromium.result === 'passed' && performance.electron.result === 'passed', 'Performance gate failed.')
requireValue(rollback.result === 'passed' && rollback.checks.localDataDeletionDuringWithdrawal === false && Object.entries(rollback.checks).filter(([key]) => key !== 'localDataDeletionDuringWithdrawal').every(([, value]) => value === true), 'Rollback gate failed.')
requireValue(audit.metadata?.vulnerabilities?.total === 0, 'Runtime dependency audit is not clean.')
requireValue(summary.results.severityZeroToTwoIssues === 0 && summary.results.undeclaredAnomalies === 0 && summary.anomalies.length === 0, 'Issue/anomaly gate failed.')

model.update.status = 'implemented'
model.stage.status = 'implemented'
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'workPackages']) for (const record of model[key]) record.status = 'implemented'
for (const decision of model.decisions) decision.status = 'specified'
model.runs = [{
  id: summary.runId,
  status: 'verified',
  completedAt: summary.completedAt,
  sourceRevision: summary.sourceRevision,
  environment: summary.environment,
  flowIds: model.flows.map(flow => flow.id),
  expectedBehaviorIds: model.expectedBehaviors.map(behavior => behavior.id),
  evidence: summary.evidence,
  release: summary.release,
  results: summary.results,
  anomalies: summary.anomalies,
  unverifiedReleaseGates: summary.unverifiedReleaseGates,
}]
fs.writeFileSync(modelPath, `${JSON.stringify(model, null, 2)}\n`)
console.log(`Recorded ${summary.runId}: ${model.flows.length} flows, ${model.expectedBehaviors.length} behaviors, status=${model.update.status}.`)