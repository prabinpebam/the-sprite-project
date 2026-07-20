import fs from 'node:fs'
import path from 'node:path'

const runRoot = path.resolve('..', 'delivery', 'updates', 'UPD-002-local-content-pack-ecosystem', 'evidence', 'runs', 'RUN-UPD002-001')

function performanceAttachments(file) {
  const root = JSON.parse(fs.readFileSync(path.join(runRoot, file), 'utf8'))
  const reports = []
  const visit = value => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (Array.isArray(value.attachments)) {
      for (const attachment of value.attachments) {
        if (attachment.name === 'performance.json' && attachment.body) reports.push(JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8')))
      }
    }
    for (const item of Object.values(value)) visit(item)
  }
  visit(root)
  return reports
}

const core = JSON.parse(fs.readFileSync(path.join(runRoot, 'performance-results.json'), 'utf8'))
const web = performanceAttachments('playwright-results.json').find(report => report.host === 'web')
const electron = performanceAttachments('electron-results.json').find(report => report.host === 'electron')
if (!web || !electron) throw new Error('Both web and Electron performance attachments are required.')

const checks = {
  webFirstStatus: web.observed.firstStatusMs <= web.thresholds.firstStatusMs,
  webStatusCadence: web.observed.maxStatusGapMs <= web.thresholds.maxStatusGapMs,
  webTotal: web.observed.totalMs <= web.thresholds.totalMs,
  webNoLongTask: web.observed.maxLongTaskMs <= web.thresholds.maxLongTaskMs,
  electronFirstStatus: electron.observed.firstStatusMs <= electron.thresholds.firstStatusMs,
  electronStatusCadence: electron.observed.maxStatusGapMs <= electron.thresholds.maxStatusGapMs,
  electronTotal: electron.observed.totalMs <= electron.thresholds.totalMs,
  electronNoLongTask: electron.observed.maxLongTaskMs <= electron.thresholds.maxLongTaskMs,
  draftSaveP95: core.checks.draftSaveP95WithinTwoSeconds,
  previewP95: core.checks.previewP95Within250Ms,
  oneOverLimit: core.checks.oneOverCompressedLimitFailsStable,
}
const summary = {
  id: 'PERF-UPD002-001',
  completedAt: new Date().toISOString(),
  fixture: core.fixture,
  compressedBytes: web.compressedBytes,
  web,
  electron,
  draftAndPreview: core,
  checks,
  status: Object.values(checks).every(Boolean) ? 'passed' : 'failed',
}
fs.writeFileSync(path.join(runRoot, 'performance-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify({ status: summary.status, compressedBytes: summary.compressedBytes, web: web.observed, electron: electron.observed, draft: core.observed }, null, 2))
if (summary.status !== 'passed') process.exitCode = 1
