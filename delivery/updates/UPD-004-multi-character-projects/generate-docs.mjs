#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))
const model = JSON.parse(fs.readFileSync(path.join(root, 'traceability.json'), 'utf8'))
const checkOnly = process.argv.includes('--check')
const records = new Map()
for (const key of ['promises', 'scenarios', 'capabilities', 'flows', 'informationArchitecture', 'navigation', 'views', 'uiElements', 'expectedBehaviors']) {
  for (const item of model[key] ?? []) records.set(item.id, item)
}
const refs = ids => ids.map(id => `\`${id}\``).join(', ')
const table = (headers, rows) => `| ${headers.join(' | ')} |\n|${headers.map(() => '---').join('|')}|\n${rows.map(row => `| ${row.map(value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`).join('\n')}`
const write = (name, body) => {
  const output = `${body.trim()}\n`
  const destination = path.join(root, name)
  if (checkOnly) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error(`${name} is stale; run generate-docs.mjs.`)
    return
  }
  fs.writeFileSync(destination, output)
}

write('customer-promise.md', `# UPD-004 Customer Promise\n\n**Update:** ${model.update.title} (${model.update.id})\n\n**Status:** ${model.update.status}\n\n**Target user:** ${model.stage.targetUser}\n\n**Quality gate:** ${model.stage.qualityGate}\n\n${model.promises.map(item => `## ${item.id} - ${item.statement}\n\n- **Host:** ${item.host}\n- **User:** ${item.user}\n- **Context:** ${item.context}\n- **Trigger:** ${item.trigger}\n- **Outcome:** ${item.outcome}\n- **Quality:** ${item.quality}\n- **Recovery:** ${item.recovery}\n- **Evidence:** ${item.evidence}\n- **Status:** ${item.status}`).join('\n\n')}`)
write('scenarios.md', `# UPD-004 Scenarios\n\n${table(['ID', 'Host', 'Promises', 'Actor', 'Intent', 'Success', 'Status'], model.scenarios.map(item => [item.id, item.host, refs(item.promiseIds), item.actor, item.intent, item.success, item.status]))}\n\n${model.scenarios.map(item => `## ${item.id}\n\n- **Starting state:** ${item.startingState}\n- **Environment:** ${item.environment}\n- **Interruptions:** ${item.interruptions.join('; ')}`).join('\n\n')}`)
write('capabilities.md', `# UPD-004 User-Can Catalog\n\n${table(['ID', 'Host', 'User can statement', 'Scenarios', 'Status'], model.capabilities.map(item => [item.id, item.host, item.statement, refs(item.scenarioIds), item.status]))}`)
write('task-flows.md', `# UPD-004 Task Flows\n\nEvery flow is accepted only through public UI on its declared host.\n\n${model.flows.map(flow => `## ${flow.id}\n\n- **Host:** ${flow.host}\n- **Scenarios:** ${refs(flow.scenarioIds)}\n- **Capabilities:** ${refs(flow.capabilityIds)}\n- **Preconditions:** ${flow.preconditions.join('; ')}\n- **Completion:** ${flow.completion}\n- **Status:** ${flow.status}\n\n${table(['Step', 'Action', 'View', 'UI', 'Navigation', 'Expected behavior'], flow.steps.map(step => [step.id, step.action, `\`${step.viewId}\``, `\`${step.uiId}\``, step.navigationId ? `\`${step.navigationId}\`` : 'No route change', step.expectedBehaviorIds.map(id => `\`${id}\`: ${records.get(id).oracle}`).join('<br>')]))}`).join('\n\n')}`)
write('experience-architecture.md', `# UPD-004 Experience Architecture\n\n## Information Architecture\n\n${table(['ID', 'Object', 'Contains', 'Status'], model.informationArchitecture.map(item => [item.id, item.name, item.contains.join(', '), item.status]))}\n\n## Navigation\n\n${table(['ID', 'Label', 'Destination', 'Back behavior', 'Status'], model.navigation.map(item => [item.id, item.label, `\`${item.destination}\``, item.backBehavior, item.status]))}\n\n## Views\n\n${table(['ID', 'Name', 'Purpose', 'Information', 'Status'], model.views.map(item => [item.id, item.name, item.purpose, refs(item.informationIds), item.status]))}\n\n## UI Inventory\n\n${table(['ID', 'View', 'Role', 'Accessible name', 'Status'], model.uiElements.map(item => [item.id, `\`${item.viewId}\``, item.role, item.name, item.status]))}\n\n## Expected Behaviors\n\n${table(['ID', 'Flow', 'Steps', 'Oracle', 'Status'], model.expectedBehaviors.map(item => [item.id, `\`${item.flowId}\``, refs(item.stepIds), item.oracle, item.status]))}`)

console.log(`${checkOnly ? 'Checked' : 'Generated'} UPD-004 projections: ${records.size} records, ${model.flows.length} flows, ${model.expectedBehaviors.length} behaviors.`)