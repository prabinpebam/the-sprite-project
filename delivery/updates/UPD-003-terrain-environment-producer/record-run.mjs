#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const runRoot = path.join(root, 'evidence', 'runs', 'RUN-UPD003-001')
const read = relativePath => JSON.parse(fs.readFileSync(path.join(runRoot, relativePath), 'utf8'))
const modelPath = path.join(root, 'traceability.json')
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'))
const summary = read('run-summary.json')
const unit = read('unit-results.json')
const web = read('playwright-results.json')
const electron = read('electron-results.json')
const crossHost = read('cross-host-results.json')
const regressionWeb = read('regression-web-results.json')
const regressionUpd002 = read('regression-upd002-results.json')
const regressionElectron = read('regression-electron-results.json')
const pages = read('pages-local-results.json')
const performance = read('performance-summary.json')
const rollback = read('rollback-results.json')
const audit = read('dependency-audit.json')

const requireValue = (condition, message) => { if (!condition) throw new Error(message) }
const playwrightPass = (report, expected, label) => {
  requireValue(report.stats?.expected === expected, `${label}: expected ${expected} passing tests`)
  requireValue(report.stats?.unexpected === 0 && report.stats?.flaky === 0 && report.stats?.skipped === 0, `${label}: run is not categorical`)
}

requireValue(summary.status === 'verified-local', 'Run summary is not verified-local.')
requireValue(unit.success && unit.numPassedTests === 80 && unit.numFailedTests === 0, 'Unit/contract/quality gate failed.')
playwrightPass(web, 5, 'UPD-003 web')
playwrightPass(electron, 1, 'UPD-003 Electron')
playwrightPass(crossHost, 1, 'UPD-003 cross-host')
playwrightPass(regressionWeb, 23, 'MVP/UPD-001 web regression')
playwrightPass(regressionUpd002, 9, 'UPD-002 regression')
playwrightPass(regressionElectron, 7, 'Electron regression')
playwrightPass(pages, 1, 'Pages subpath simulation')
requireValue(performance.chromium.result === 'passed' && performance.electron.result === 'passed' && performance.packageBuild.result === 'passed', 'Performance gate failed.')
requireValue(rollback.result === 'passed' && Object.values(rollback.checks).every((value, index) => index === Object.keys(rollback.checks).indexOf('localDataDeletionDuringWithdrawal') ? value === false : value === true), 'Rollback gate failed.')
requireValue(audit.metadata?.vulnerabilities?.total === 0, 'Runtime dependency audit is not clean.')
requireValue(summary.results.severityZeroToTwoIssues === 0 && summary.results.undeclaredAnomalies === 0 && summary.anomalies.length === 0, 'Issue/anomaly gate failed.')

model.update.status = 'implemented'
model.stage.status = 'implemented'
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'workPackages']) {
  for (const record of model[key]) record.status = 'implemented'
}
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
