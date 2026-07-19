#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const model = JSON.parse(fs.readFileSync(path.join(root, 'traceability.json'), 'utf8'))
const lockPath = path.join(root, 'spec-lock.json')
const specLock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : null
const checkMode = process.argv.includes('--check')
const generationErrors = []
const write = (name, content) => {
  const filePath = path.join(root, name)
  const lifecycleContent = updateVerified || updateImplemented
    ? content
      .replace('These promises layer above the immutable verified MVP baseline. They are specified, not implemented or verified. Any change begins as a new update or an explicit revision to UPD-001 before implementation evidence exists.', governanceText)
      .replace('Implementation may begin only after UPD-001 is approved as a complete specified boundary. Packages advance by evidence, not completion estimates.', implementationFooter)
    : content
  const expected = `${lifecycleContent.trim()}\n`
  if (checkMode) {
    if (!fs.existsSync(filePath)) generationErrors.push(`${name}: missing generated file`)
    else if (fs.readFileSync(filePath, 'utf8') !== expected) generationErrors.push(`${name}: stale generated content`)
    return
  }
  fs.writeFileSync(filePath, expected)
}
const index = new Map()
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'exclusions', 'workPackages', 'runs', 'issues', 'decisions']) {
  for (const item of model[key] ?? []) index.set(item.id, item)
}
const refs = ids => ids.map(id => `\`${id}\``).join(', ')
const table = (headers, rows) => `| ${headers.join(' | ')} |\n|${headers.map(() => '---').join('|')}|\n${rows.map(row => `| ${row.map(value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`).join('\n')}`
const h = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const updateVerified = model.update.status === 'verified'
const updateImplemented = model.update.status === 'implemented'
const governanceText = updateVerified
  ? 'These promises are implemented and verified by the update evidence run while the original MVP remains the immutable rollback baseline. Future material changes require a new update or justified lock reopening.'
  : updateImplemented
    ? 'These promises are implemented and locally evidenced while the original MVP remains the immutable rollback baseline. Actual GitHub Pages and clean-machine Windows release gates remain before verification.'
    : 'These promises layer above the immutable verified MVP baseline. They are specified, not implemented or verified. Any change begins as a new update or an explicit revision to UPD-001 before implementation evidence exists.'
const implementationFooter = updateVerified
  ? 'UPD-001 packages advanced from the approved boundary through generated implementation and actual-UI evidence. Future work must preserve the verified contracts or enter the formal update pipeline.'
  : updateImplemented
    ? 'UPD-001 packages are implemented with local actual-UI evidence. External release verification remains blocked on authorized GitHub Pages publication and a clean-machine Windows launch observation.'
    : 'Implementation may begin only after UPD-001 is approved as a complete specified boundary. Packages advance by evidence, not completion estimates.'
const lifecycleCallout = updateVerified
  ? '<div class="slate-callout slate-callout--tip" role="note"><p class="slate-callout__title">Implemented and verified</p><p>RUN-UPD001-001 verifies every declared web, Electron, cross-host, migration, recovery, accessibility, regression, and data-custody flow. The release remains bound to the locked specification.</p></div>'
  : updateImplemented
    ? '<div class="slate-callout slate-callout--warning" role="note"><p class="slate-callout__title">Implemented · release verification pending</p><p>RUN-UPD001-001 passes local production web, packaged Electron, cross-host, migration, recovery, accessibility, regression, and data-custody checks. Actual GitHub Pages and clean-machine Windows evidence remain required.</p></div>'
    : '<div class="slate-callout slate-callout--warning" role="note"><p class="slate-callout__title">Specified, not implemented</p><p>This page records the approved shape to review before implementation. No new flow inherits verification from the baseline. Status changes only from generated web, Electron, cross-host, migration, and regression evidence.</p></div>'

write('customer-promise.md', `# UPD-001 Customer Promise\n\n**Update:** ${model.update.title} (${model.update.id})\n\n**Baseline:** ${model.update.baselineRevision} / ${model.update.baselineEvidenceRun}\n\n**Status:** ${model.update.status}\n\n**Target user:** ${model.stage.targetUser}\n\n**Objective quality gate:** ${model.stage.qualityGate}\n\n${model.promises.map(item => `## ${item.id} - ${item.statement}\n\n- **Host:** ${item.host}\n- **User:** ${item.user}\n- **Context:** ${item.context}\n- **Trigger:** ${item.trigger}\n- **Observable outcome:** ${item.outcome}\n- **Quality expectation:** ${item.quality}\n- **Recovery expectation:** ${item.recovery}\n- **Acceptance evidence:** ${item.evidence}\n- **Status:** ${item.status}`).join('\n\n')}\n\n## Governance\n\nThese promises layer above the immutable verified MVP baseline. They are specified, not implemented or verified. Any change begins as a new update or an explicit revision to UPD-001 before implementation evidence exists.`)

write('scenarios.md', `# UPD-001 User Scenarios\n\n${table(['ID', 'Host', 'Promises', 'Actor', 'Intent', 'Success'], model.scenarios.map(item => [item.id, item.host, refs(item.promiseIds), item.actor, item.intent, item.success]))}\n\n${model.scenarios.map(item => `## ${item.id}\n\n- **Host:** ${item.host}\n- **Promises:** ${refs(item.promiseIds)}\n- **Actor:** ${item.actor}\n- **Starting state:** ${item.startingState}\n- **Intent:** ${item.intent}\n- **Environment:** ${item.environment}\n- **Success:** ${item.success}\n- **Interruptions:** ${item.interruptions.join('; ')}\n- **Status:** ${item.status}`).join('\n\n')}`)

write('capabilities.md', `# UPD-001 User-Can Catalog\n\n${table(['ID', 'Host', 'User can statement', 'Scenarios', 'Status'], model.capabilities.map(item => [item.id, item.host, item.statement, refs(item.scenarioIds), item.status]))}`)

write('task-flows.md', `# UPD-001 Task Flows\n\nEvery flow is accepted only through visible interaction on its declared host. The verified MVP flows remain regression obligations.\n\n${model.flows.map(flow => `## ${flow.id}\n\n- **Host:** ${flow.host}\n- **Scenarios:** ${refs(flow.scenarioIds)}\n- **Capabilities:** ${refs(flow.capabilityIds)}\n- **Preconditions:** ${flow.preconditions.join('; ')}\n- **Completion:** ${flow.completion}\n- **Status:** ${flow.status}\n\n${table(['Step', 'User action', 'View', 'UI', 'Navigation', 'Objective behavior'], flow.steps.map(step => [step.id, step.action, `\`${step.viewId}\``, `\`${step.uiId}\``, step.navigationId ? `\`${step.navigationId}\`` : 'No route change', step.expectedBehaviorIds.map(id => `\`${id}\`: ${index.get(id).oracle}`).join('<br>')]))}`).join('\n\n')}`)

write('experience-architecture.md', `# UPD-001 Experience Architecture\n\n## Information Architecture\n\n${table(['ID', 'Object', 'Contains', 'Status'], model.informationArchitecture.map(item => [item.id, item.name, item.contains.join(', '), item.status]))}\n\n## Navigation\n\n${table(['ID', 'Label', 'Destination', 'Back behavior', 'Status'], model.navigation.map(item => [item.id, item.label, `\`${item.destination}\``, item.backBehavior, item.status]))}\n\n## Views\n\n${table(['ID', 'Name', 'Purpose', 'Information', 'Status'], model.views.map(item => [item.id, item.name, item.purpose, refs(item.informationIds), item.status]))}\n\n## UI Inventory\n\n${table(['ID', 'View', 'Role', 'Accessible name', 'Status'], model.uiElements.map(item => [item.id, `\`${item.viewId}\``, item.role, item.name, item.status]))}\n\n## Objective Expected Behaviors\n\n${table(['ID', 'Flow', 'Steps', 'Oracle', 'Status'], model.expectedBehaviors.map(item => [item.id, `\`${item.flowId}\``, refs(item.stepIds), item.oracle, item.status]))}\n\n## Binding Interaction Contracts\n\n- \`implementation-contract.md\` owns exact migration states, snapshot and quota behavior, conflict choices, stable error codes, Electron bridge/path authority, focus and keyboard behavior, status announcements, zoom/reflow, target size, and reduced motion.\n- \`quality-scenarios.md\` owns measurable accessibility, durability, security, compatibility, capacity, performance, offline, release, and maintainability evidence.\n- Tables in this file define the user-visible inventory. The binding contracts define behavior that cuts across more than one row and must not be reinterpreted per view.`)

write('scope-ledger.md', `# UPD-001 Scope Ledger\n\n## Positive Scope\n\n${table(['Type', 'Count'], [['Customer promises', model.promises.length], ['Scenarios', model.scenarios.length], ['User-can capabilities', model.capabilities.length], ['Task flows', model.flows.length], ['Expected behaviors', model.expectedBehaviors.length]])}\n\n## Deliberate Exclusions\n\n${table(['ID', 'Expectation', 'Reason', 'Consequence', 'Disposition'], model.exclusions.map(item => [item.id, item.expectation, item.reason, item.consequence, item.disposition]))}\n\nAnything plausible for the dual-host promise but absent from both sections is a specification defect.`)

write('decisions.md', `# UPD-001 Decisions\n\n${model.decisions.map(item => `## ${item.id}\n\n- **Decision:** ${item.decision}\n- **Decision state:** ${item.decisionState ?? 'open'}\n- **Locked at:** ${item.lockedAt ?? 'Not locked'}\n- **Locked by:** ${item.lockedBy ?? 'Not locked'}\n- **Change criteria:** ${item.changeCriteria ?? 'Normal review process'}\n- **Reversible:** ${item.reversible ? 'Yes' : 'No'}\n- **Evidence:** ${item.evidence}\n- **Status:** ${item.status}`).join('\n\n')}`)
write('execution-plan.md', `# UPD-001 Execution Plan\n\n${table(['ID', 'Depends on', 'Trace records', 'Gate', 'Status'], model.workPackages.map(item => [item.id, item.dependsOn.length ? refs(item.dependsOn) : 'None', refs(item.traceIds), item.gate, item.status]))}\n\nImplementation may begin only after UPD-001 is approved as a complete specified boundary. Packages advance by evidence, not completion estimates.`)

const docsPath = path.resolve(root, '..', '..', '..', 'docs', 'execution', 'updates', 'upd-001-dual-host-mvp.html')

if (checkMode) {
  if (!fs.existsSync(docsPath)) {
    generationErrors.push('docs execution page: missing generated file')
  } else {
    const html = fs.readFileSync(docsPath, 'utf8')
    const expectedSummary = `${model.promises.length} promises, ${model.scenarios.length} scenarios, ${model.capabilities.length} user-can statements, ${model.flows.length} task flows, and ${model.expectedBehaviors.length} objective behaviors`
    if (!html.includes(expectedSummary)) generationErrors.push('docs execution page: stale summary counts')
    for (const item of [...model.promises, ...model.flows, ...model.workPackages, ...model.exclusions]) {
      if (!html.includes(item.id)) generationErrors.push(`docs execution page: missing ${item.id}`)
    }
    const expectedLockText = specLock?.state === 'locked' ? `Specification locked · ${specLock.lockId}` : null
    if (expectedLockText && !html.includes(expectedLockText)) generationErrors.push('docs execution page: missing active lock notice')
    if (!expectedLockText && html.includes('Specification locked ·')) generationErrors.push('docs execution page: stale lock notice')
    if (updateVerified && !html.includes('Implemented and verified')) generationErrors.push('docs execution page: missing verified lifecycle notice')
    if (updateImplemented && !html.includes('Implemented · release verification pending')) generationErrors.push('docs execution page: missing implemented lifecycle notice')
    if ((updateVerified || updateImplemented) && html.includes('Specified, not implemented')) generationErrors.push('docs execution page: contradictory pre-implementation notice')
  }
  if (generationErrors.length) {
    console.error(`Generated update validation failed:\n- ${generationErrors.join('\n- ')}`)
    process.exit(1)
  }
  console.log('Generated update artifacts are current.')
  process.exit(0)
}

fs.mkdirSync(path.dirname(docsPath), { recursive: true })
const hostCounts = Object.fromEntries(['web', 'desktop', 'cross-host', 'shared'].map(host => [host, model.flows.filter(flow => flow.host === host).length]))
const flowRows = model.flows.map(flow => `<tr><td><code>${h(flow.id)}</code></td><td>${h(flow.host)}</td><td>${h(flow.completion)}</td><td><span class="slate-badge slate-badge--status">${h(flow.status)}</span></td></tr>`).join('\n')
const promiseCards = model.promises.map(item => `<article class="slate-card"><h3 class="slate-card__title"><code>${h(item.id)}</code></h3><p class="slate-card__body">${h(item.statement)}</p><p><span class="slate-badge">${h(item.host)}</span> <span class="slate-badge slate-badge--status">${h(item.status)}</span></p></article>`).join('\n')
const packageRows = model.workPackages.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.gate)}</td><td><span class="slate-badge slate-badge--status">${h(item.status)}</span></td></tr>`).join('\n')
const exclusionRows = model.exclusions.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.expectation)}</td><td>${h(item.disposition)}</td></tr>`).join('\n')
fs.writeFileSync(docsPath, `<!-- Generated from delivery/updates/UPD-001-dual-host-mvp/traceability.json. Do not edit manually. -->\n<header class="slate-hero"><p class="slate-hero__eyebrow">Product update · UPD-001</p><h1 class="slate-hero__title">Dual-Host Local-First MVP</h1><p class="slate-hero__summary">The formal promise-to-evidence specification for a GitHub Pages web workspace and portable Electron local-file workspace over one shared product core.</p></header>\n<aside class="slate-tldr"><p class="slate-tldr__label">TL;DR</p><p><strong>${model.promises.length} promises, ${model.scenarios.length} scenarios, ${model.capabilities.length} user-can statements, ${model.flows.length} task flows, and ${model.expectedBehaviors.length} objective behaviors</strong> define this update. Status: <strong>${h(model.update.status)}</strong>. The verified <code>f29c9f9</code> MVP remains the immutable baseline.</p></aside>\n<div class="slate-callout slate-callout--warning" role="note"><p class="slate-callout__title">Specified, not implemented</p><p>This page records the approved shape to review before implementation. No new flow inherits verification from the baseline. Status changes only from generated web, Electron, cross-host, migration, and regression evidence.</p></div>\n<h2>Customer promises</h2><div class="slate-card-grid" data-cols="2">${promiseCards}</div>\n<h2>Host coverage</h2><div class="slate-metrics"><div class="slate-metric"><p class="slate-metric__value">${hostCounts.web}</p><p class="slate-metric__label">Web flows</p></div><div class="slate-metric"><p class="slate-metric__value">${hostCounts.desktop}</p><p class="slate-metric__label">Desktop flows</p></div><div class="slate-metric"><p class="slate-metric__value">${hostCounts['cross-host']}</p><p class="slate-metric__label">Cross-host flows</p></div><div class="slate-metric"><p class="slate-metric__value">${model.exclusions.length}</p><p class="slate-metric__label">Deliberate exclusions</p></div></div>\n<h2>Task flows</h2><table><thead><tr><th>ID</th><th>Host</th><th>User completion</th><th>Status</th></tr></thead><tbody>${flowRows}</tbody></table>\n<h2>Execution packages</h2><table><thead><tr><th>ID</th><th>Evidence gate</th><th>Status</th></tr></thead><tbody>${packageRows}</tbody></table>\n<h2>Deliberate exclusions</h2><table><thead><tr><th>ID</th><th>Expectation</th><th>Disposition</th></tr></thead><tbody>${exclusionRows}</tbody></table>\n<h2>Review record</h2><p>The canonical update folder contains the request, immutable baseline, impact analysis, exhaustive generated specification, architecture decisions, release arithmetic, and future evidence. Follow the <a href="../../governance/product-update-pipeline.html">Product Update Pipeline</a> for every subsequent change.</p>\n`, 'utf8')

if (updateVerified || updateImplemented) {
  const generated = fs.readFileSync(docsPath, 'utf8')
  const staleCallout = '<div class="slate-callout slate-callout--warning" role="note"><p class="slate-callout__title">Specified, not implemented</p><p>This page records the approved shape to review before implementation. No new flow inherits verification from the baseline. Status changes only from generated web, Electron, cross-host, migration, and regression evidence.</p></div>'
  if (!generated.includes(staleCallout)) throw new Error('Generated UPD-001 page is missing its lifecycle callout')
  fs.writeFileSync(docsPath, generated.replace(staleCallout, lifecycleCallout))
}

if (specLock?.state === 'locked') {
  const heading = '<h2>Customer promises</h2>'
  const callout = `<div class="slate-callout slate-callout--info" role="note"><p class="slate-callout__title">Specification locked · ${h(specLock.lockId)}</p><p>Scope, decisions, behavior, architecture, compatibility, quality scenarios, and release gates are stable. Later reviews are delta-only. Reopen only for evidence-backed or constraint-driven change whose product-aligned benefit exceeds full change and revalidation cost.</p></div>`
  const generated = fs.readFileSync(docsPath, 'utf8')
  if (!generated.includes(heading)) throw new Error('Generated UPD-001 page is missing the customer-promises heading')
  fs.writeFileSync(docsPath, generated.replace(heading, `${callout}\n${heading}`))
}

console.log(`Generated ${model.update.id}: ${index.size} records, ${model.flows.length} flows, ${model.exclusions.length} exclusions, lock=${specLock?.state ?? 'none'}.`)
