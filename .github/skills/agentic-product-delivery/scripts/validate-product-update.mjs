#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const updateDir = process.argv[2]
if (!updateDir) {
  console.error('Usage: node validate-product-update.mjs <delivery/updates/UPD-NNN-name>')
  process.exit(2)
}

const root = path.resolve(updateDir)
const requiredFiles = [
  'baseline.json',
  'change-proposal.md',
  'impact-analysis.md',
  'traceability.json',
  'customer-promise.md',
  'scenarios.md',
  'capabilities.md',
  'task-flows.md',
  'experience-architecture.md',
  'scope-ledger.md',
  'decisions.md',
  'execution-plan.md',
  'release-gate.md',
  'issues.md',
]
const errors = []
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required update artifact: ${file}`)
}
if (errors.length) fail()

const baseline = JSON.parse(fs.readFileSync(path.join(root, 'baseline.json'), 'utf8'))
const model = JSON.parse(fs.readFileSync(path.join(root, 'traceability.json'), 'utf8'))
const folderId = path.basename(root).match(/^(UPD-\d+)/)?.[1]
if (!folderId) errors.push('Update folder must start with UPD-NNN')
if (model.update?.id !== folderId) errors.push(`traceability update ID ${model.update?.id ?? '<missing>'} does not match folder ${folderId}`)
if (baseline.updateId !== folderId) errors.push(`baseline update ID ${baseline.updateId ?? '<missing>'} does not match folder ${folderId}`)
if (baseline.policy?.immutable !== true) errors.push('baseline policy must set immutable=true')
if (baseline.policy?.inheritVerifiedStatus !== false) errors.push('baseline policy must set inheritVerifiedStatus=false')
if (!baseline.baseline?.gitRevision || !/^[0-9a-f]{40}$/i.test(baseline.baseline.gitRevision)) errors.push('baseline must name a full 40-character Git revision')
if (!baseline.baseline?.evidenceRunId) errors.push('baseline must name an evidence run')
if (model.update?.baselineRevision !== baseline.baseline?.gitRevision) errors.push('traceability baseline revision does not match baseline.json')
if (model.update?.baselineEvidenceRun !== baseline.baseline?.evidenceRunId) errors.push('traceability evidence run does not match baseline.json')

const updateStatuses = new Set(['proposed', 'specified', 'approved', 'implemented', 'verified', 'rejected', 'superseded'])
if (!updateStatuses.has(model.update?.status)) errors.push(`Unsupported update status: ${model.update?.status ?? '<missing>'}`)
const hostValues = new Set(['web', 'desktop', 'cross-host', 'shared'])
for (const key of ['promises', 'scenarios', 'capabilities', 'flows']) {
  for (const item of model[key] ?? []) {
    if (!hostValues.has(item.host)) errors.push(`${item.id}: missing or unsupported host classification`)
  }
}
const runs = model.runs ?? []
const evidenceOwned = [...(model.flows ?? []), ...(model.expectedBehaviors ?? [])]
if (runs.length === 0) {
  for (const item of evidenceOwned) if (item.status === 'verified') errors.push(`${item.id}: cannot be verified without an update evidence run`)
  if (model.update?.status === 'verified') errors.push('update cannot be verified without evidence runs')
}
if (model.update?.status === 'verified') {
  const incomplete = evidenceOwned.filter(item => item.status !== 'verified').map(item => item.id)
  if (incomplete.length) errors.push(`verified update has incomplete evidence records: ${incomplete.join(', ')}`)
}
if ((model.exclusions ?? []).length === 0) errors.push('update must include deliberate exclusions')
if ((model.workPackages ?? []).length === 0) errors.push('update must include execution work packages')

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const traceValidator = path.join(scriptDir, 'validate-traceability.mjs')
const traceResult = spawnSync(process.execPath, [traceValidator, path.join(root, 'traceability.json')], { encoding: 'utf8' })
if (traceResult.status !== 0) errors.push(traceResult.stderr.trim() || traceResult.stdout.trim() || 'Traceability validation failed')

if (errors.length) fail()
console.log(`Product update valid: ${folderId}, status=${model.update.status}, baseline=${baseline.baseline.gitRevision.slice(0, 7)}, records=${countRecords(model)}, hosts=${[...new Set((model.flows ?? []).map(item => item.host))].join(',')}.`)

function countRecords(value) {
  return ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'exclusions', 'workPackages', 'runs', 'issues', 'decisions']
    .reduce((total, key) => total + (value[key]?.length ?? 0), 0)
}

function fail() {
  console.error(`Product update validation failed for ${root}:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
