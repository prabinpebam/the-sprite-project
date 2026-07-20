#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(root, '../../..')
const model = JSON.parse(fs.readFileSync(path.join(root, 'traceability.json'), 'utf8'))
const check = process.argv.includes('--check')
const errors = []
const index = new Map()
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors', 'exclusions', 'workPackages', 'decisions']) {
  for (const item of model[key] ?? []) index.set(item.id, item)
}
const refs = ids => ids.map(id => `\`${id}\``).join(', ')
const table = (headers, rows) => `| ${headers.join(' | ')} |\n|${headers.map(() => '---').join('|')}|\n${rows.map(row => `| ${row.map(value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`).join('\n')}`
const h = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function write(relativePath, content) {
  const target = path.resolve(root, relativePath)
  const expected = `${content.trim()}\n`
  if (check) {
    if (!fs.existsSync(target)) errors.push(`${relativePath}: missing`)
    else if (fs.readFileSync(target, 'utf8') !== expected) errors.push(`${relativePath}: stale`)
    return
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, expected)
}

write('customer-promise.md', `# UPD-002 Customer Promises\n\n**Update:** ${model.update.title} (${model.update.id})\n\n**Baseline:** ${model.update.baselineRevision} / ${model.update.baselineEvidenceRun}\n\n**Status:** ${model.update.status}\n\n**Target user:** ${model.stage.targetUser}\n\n**Quality gate:** ${model.stage.qualityGate}\n\n${model.promises.map(item => `## ${item.id} - ${item.statement}\n\n- **Host:** ${item.host}\n- **User:** ${item.user}\n- **Context:** ${item.context}\n- **Trigger:** ${item.trigger}\n- **Observable outcome:** ${item.outcome}\n- **Quality expectation:** ${item.quality}\n- **Recovery expectation:** ${item.recovery}\n- **Acceptance evidence:** ${item.evidence}\n- **Status:** ${item.status}`).join('\n\n')}\n\n## Review Boundary\n\nThese promises are specified, not approved or implemented. UPD-001 remains the immutable implementation baseline. Product-owner approval is required before implementation dispatch.`)

write('scenarios.md', `# UPD-002 User Scenarios\n\n${table(['ID', 'Host', 'Promises', 'Actor', 'Intent', 'Success'], model.scenarios.map(item => [item.id, item.host, refs(item.promiseIds), item.actor, item.intent, item.success]))}\n\n${model.scenarios.map(item => `## ${item.id}\n\n- **Host:** ${item.host}\n- **Promises:** ${refs(item.promiseIds)}\n- **Actor:** ${item.actor}\n- **Starting state:** ${item.startingState}\n- **Intent:** ${item.intent}\n- **Environment:** ${item.environment}\n- **Success:** ${item.success}\n- **Interruptions:** ${item.interruptions.join('; ')}\n- **Status:** ${item.status}`).join('\n\n')}`)

write('capabilities.md', `# UPD-002 User-Can Catalog\n\n${table(['ID', 'Host', 'User can statement', 'Scenarios', 'Status'], model.capabilities.map(item => [item.id, item.host, item.statement, refs(item.scenarioIds), item.status]))}`)

write('task-flows.md', `# UPD-002 Task Flows\n\nEvery flow is accepted only through visible interaction on its declared host. Affected UPD-001 flows remain regression obligations.\n\n${model.flows.map(flow => `## ${flow.id}\n\n- **Host:** ${flow.host}\n- **Scenarios:** ${refs(flow.scenarioIds)}\n- **Capabilities:** ${refs(flow.capabilityIds)}\n- **Preconditions:** ${flow.preconditions.join('; ')}\n- **Completion:** ${flow.completion}\n- **Status:** ${flow.status}\n\n${table(['Step', 'User action', 'View', 'UI', 'Navigation', 'Objective behavior'], flow.steps.map(step => [step.id, step.action, `\`${step.viewId}\``, `\`${step.uiId}\``, step.navigationId ? `\`${step.navigationId}\`` : 'No route change', step.expectedBehaviorIds.map(id => `\`${id}\`: ${index.get(id).oracle}`).join('<br>')]))}`).join('\n\n')}`)

write('experience-architecture.md', `# UPD-002 Experience Architecture\n\n## Information Architecture\n\n${table(['ID', 'Object', 'Contains', 'Status'], model.informationArchitecture.map(item => [item.id, item.name, item.contains.join(', '), item.status]))}\n\n## Navigation\n\n${table(['ID', 'Label', 'Destination', 'Back behavior', 'Status'], model.navigation.map(item => [item.id, item.label, `\`${item.destination}\``, item.backBehavior, item.status]))}\n\n## Views\n\n${table(['ID', 'Name', 'Purpose', 'Information', 'Status'], model.views.map(item => [item.id, item.name, item.purpose, refs(item.informationIds), item.status]))}\n\n## UI Inventory\n\n${table(['ID', 'View', 'Role', 'Accessible name', 'Status'], model.uiElements.map(item => [item.id, `\`${item.viewId}\``, item.role, item.name, item.status]))}\n\n## Objective Expected Behaviors\n\n${table(['ID', 'Flow', 'Steps', 'Oracle', 'Status'], model.expectedBehaviors.map(item => [item.id, `\`${item.flowId}\``, refs(item.stepIds), item.oracle, item.status]))}\n\n## Binding References\n\n- \`product-design-spec.md\` owns layout, hierarchy, interaction, responsive, content, and accessibility contracts.\n- \`engineering-spec.md\` owns formats, schemas, repositories, renderer, bridge, limits, state transitions, failures, and migration.\n- \`quality-scenarios.md\` and \`release-gate.md\` own measurable evidence and promotion arithmetic.`)

write('scope-ledger.md', `# UPD-002 Scope Ledger\n\n## Positive Scope\n\n${table(['Type', 'Count'], [['Customer promises', model.promises.length], ['Scenarios', model.scenarios.length], ['User-can capabilities', model.capabilities.length], ['Task flows', model.flows.length], ['Expected behaviors', model.expectedBehaviors.length]])}\n\n## Deliberate Exclusions\n\n${table(['ID', 'Expectation', 'Reason', 'Consequence', 'Disposition'], model.exclusions.map(item => [item.id, item.expectation, item.reason, item.consequence, item.disposition]))}\n\nAnything plausible for the local content ecosystem but absent from both sections is a specification defect.`)

write('decisions.md', `# UPD-002 Proposed Decisions\n\n${model.decisions.map(item => `## ${item.id}\n\n- **Decision:** ${item.decision}\n- **Decision state:** ${item.decisionState}\n- **Reversible:** ${item.reversible ? 'Yes' : 'No'}\n- **Evidence:** ${item.evidence}\n- **Status:** ${item.status}`).join('\n\n')}\n\nThese decisions are review candidates. They are not locked until explicit product-owner approval.`)

write('execution-plan.md', `# UPD-002 Execution Plan\n\n${table(['ID', 'Depends on', 'Trace records', 'Gate', 'Status'], model.workPackages.map(item => [item.id, item.dependsOn.length ? refs(item.dependsOn) : 'None', refs(item.traceIds), item.gate, item.status]))}\n\nImplementation may begin only after product-owner approval and the baseline entry condition in \`baseline.json\` is satisfied or explicitly rescheduled. Packages advance from executable evidence, not completion estimates.`)

const docsPath = path.join(workspaceRoot, 'docs/execution/updates/upd-002-local-content-pack-ecosystem.html')
const summary = `${model.promises.length} promises, ${model.scenarios.length} scenarios, ${model.capabilities.length} user-can statements, ${model.flows.length} task flows, and ${model.expectedBehaviors.length} objective behaviors`
const cards = model.promises.map(item => `<article class="slate-card"><h3 class="slate-card__title"><code>${h(item.id)}</code></h3><p class="slate-card__body">${h(item.statement)}</p><p><span class="slate-badge">${h(item.host)}</span> <span class="slate-badge slate-badge--status">${h(item.status)}</span></p></article>`).join('\n')
const flowRows = model.flows.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.host)}</td><td>${h(item.completion)}</td><td><span class="slate-badge slate-badge--status">${h(item.status)}</span></td></tr>`).join('\n')
const packageRows = model.workPackages.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.gate)}</td><td><span class="slate-badge slate-badge--status">${h(item.status)}</span></td></tr>`).join('\n')
const exclusionRows = model.exclusions.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.expectation)}</td><td>${h(item.disposition)}</td></tr>`).join('\n')
const decisionRows = model.decisions.map(item => `<tr><td><code>${h(item.id)}</code></td><td>${h(item.decision)}</td><td><span class="slate-badge slate-badge--status">${h(item.decisionState)}</span></td></tr>`).join('\n')
const html = `<!-- Generated from delivery/updates/UPD-002-local-content-pack-ecosystem/traceability.json. Do not edit manually. -->
<header class="slate-hero"><p class="slate-hero__eyebrow">Product update · UPD-002</p><h1 class="slate-hero__title">Local Content Pack Ecosystem</h1><p class="slate-hero__summary">Install, validate, manage, author, export, and transfer current-profile humanoid packs without application releases or JSON authoring.</p></header>
<aside class="slate-tldr"><p class="slate-tldr__label">TL;DR</p><p><strong>${summary}</strong> define this proposed update. Status: <strong>${h(model.update.status)}</strong>. Product-owner approval and the UPD-001 release entry condition remain.</p></aside>
<div class="slate-callout slate-callout--warning" role="note"><p class="slate-callout__title">Specified · ready for product-owner review</p><p>The specification has been derived and independently reviewed. It is not approved, implemented, or verified.</p></div>
<h2>Customer promises</h2><div class="slate-card-grid" data-cols="2">${cards}</div>
<h2>Why this increment</h2><p>Phase 4 proves that legally traceable content can grow independently of application releases before Phase 5 adds terrain and other producers. The format remains deliberately limited to current humanoid geometry so the first ecosystem contract is extracted from working behavior rather than speculative rigs.</p>
<h2>Task flows</h2><table><thead><tr><th>ID</th><th>Host</th><th>Completion</th><th>Status</th></tr></thead><tbody>${flowRows}</tbody></table>
<h2>Execution packages</h2><table><thead><tr><th>ID</th><th>Evidence gate</th><th>Status</th></tr></thead><tbody>${packageRows}</tbody></table>
<h2>Product-owner decisions</h2><table><thead><tr><th>ID</th><th>Proposed decision</th><th>State</th></tr></thead><tbody>${decisionRows}</tbody></table>
<h2>Deliberate exclusions</h2><table><thead><tr><th>ID</th><th>Expectation</th><th>Disposition</th></tr></thead><tbody>${exclusionRows}</tbody></table>
<h2>Review readiness</h2><div class="slate-callout slate-callout--tip" role="note"><p class="slate-callout__title">Deep review verdict · Ready</p><p>All 14 applicable lenses score 9/10, no critical/high finding remains, and the unfamiliar-implementer gate passed after three independent rounds. Product-owner approval remains required before stabilization or implementation.</p></div><p>Binding detail lives in <code>product-design-spec.md</code>, <code>engineering-spec.md</code>, <code>quality-scenarios.md</code>, <code>threat-model.md</code>, <code>release-gate.md</code>, <code>owner-review.md</code>, and <code>spec-review.json</code> beside the canonical traceability model.</p>
`
if (check) {
  if (!fs.existsSync(docsPath)) errors.push('docs execution page: missing')
  else {
    const current = fs.readFileSync(docsPath, 'utf8')
    if (current !== html) errors.push('docs execution page: stale')
    if (!current.includes(summary)) errors.push('docs execution page: stale counts')
    for (const item of [...model.promises, ...model.flows, ...model.workPackages, ...model.exclusions]) if (!current.includes(item.id)) errors.push(`docs execution page: missing ${item.id}`)
  }
} else {
  fs.mkdirSync(path.dirname(docsPath), { recursive: true })
  fs.writeFileSync(docsPath, html)
}

if (errors.length) {
  console.error(`UPD-002 generated docs invalid:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(check ? 'UPD-002 generated artifacts are current.' : `Generated UPD-002: ${index.size} records, ${model.flows.length} flows, ${model.exclusions.length} exclusions.`)
