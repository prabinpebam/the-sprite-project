#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate-traceability.mjs <traceability.json>");
  process.exit(2);
}

const model = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const collections = {
  CP: model.promises ?? [], SC: model.scenarios ?? [], UC: model.capabilities ?? [],
  TF: model.flows ?? [], IA: model.informationArchitecture ?? [], NAV: model.navigation ?? [],
  VIEW: model.views ?? [], UI: model.uiElements ?? [], EB: model.expectedBehaviors ?? [],
  OUT: model.exclusions ?? [], WP: model.workPackages ?? [], RUN: model.runs ?? [],
  ISSUE: model.issues ?? [], DEC: model.decisions ?? []
};
const records = new Map();
for (const [prefix, items] of Object.entries(collections)) {
  for (const item of items) {
    if (!item.id?.startsWith(`${prefix}-`)) errors.push(`${item.id ?? "<missing>"}: expected ${prefix}- prefix`);
    if (records.has(item.id)) errors.push(`${item.id}: duplicate ID`);
    records.set(item.id, { ...item, type: prefix });
  }
}
const requireRef = (owner, id, type) => {
  const target = records.get(id);
  if (!target) errors.push(`${owner}: missing reference ${id}`);
  else if (target.type !== type) errors.push(`${owner}: ${id} is ${target.type}, expected ${type}`);
};
const requireList = (item, field) => {
  if (!Array.isArray(item[field]) || item[field].length === 0) errors.push(`${item.id}: ${field} must not be empty`);
  return item[field] ?? [];
};
for (const item of collections.SC) for (const id of requireList(item, "promiseIds")) requireRef(item.id, id, "CP");
for (const item of collections.UC) for (const id of requireList(item, "scenarioIds")) requireRef(item.id, id, "SC");
for (const item of collections.TF) {
  for (const id of requireList(item, "scenarioIds")) requireRef(item.id, id, "SC");
  for (const id of requireList(item, "capabilityIds")) requireRef(item.id, id, "UC");
  for (const step of requireList(item, "steps")) {
    if (!step.id) errors.push(`${item.id}: flow step missing id`);
    requireRef(`${item.id}/${step.id}`, step.viewId, "VIEW");
    requireRef(`${item.id}/${step.id}`, step.uiId, "UI");
    for (const id of requireList(step, "expectedBehaviorIds")) requireRef(`${item.id}/${step.id}`, id, "EB");
    if (step.navigationId) requireRef(`${item.id}/${step.id}`, step.navigationId, "NAV");
  }
}
for (const item of collections.EB) {
  requireRef(item.id, item.flowId, "TF");
  requireList(item, "stepIds");
  if (!item.oracle) errors.push(`${item.id}: missing objective oracle`);
}
for (const item of collections.VIEW) for (const id of item.informationIds ?? []) requireRef(item.id, id, "IA");
for (const item of collections.WP) for (const id of requireList(item, "traceIds")) {
  if (!records.has(id)) errors.push(`${item.id}: missing trace record ${id}`);
}
const isCovered = (type, predicate, message) => {
  for (const item of collections[type]) if (!predicate(item)) errors.push(`${item.id}: ${message}`);
};
isCovered("CP", cp => collections.SC.some(sc => sc.promiseIds?.includes(cp.id)), "not covered by a scenario");
isCovered("SC", sc => collections.UC.some(uc => uc.scenarioIds?.includes(sc.id)), "not covered by a capability");
isCovered("UC", uc => collections.TF.some(tf => tf.capabilityIds?.includes(uc.id)), "not covered by a flow");
isCovered("TF", tf => collections.EB.some(eb => eb.flowId === tf.id), "has no expected behavior");
const used = type => new Set(collections.TF.flatMap(tf => (tf.steps ?? []).map(step => step[`${type.toLowerCase()}Id`]).filter(Boolean)));
for (const [type, field] of [["VIEW", "viewId"], ["UI", "uiId"], ["NAV", "navigationId"]]) {
  const ids = new Set(collections.TF.flatMap(tf => (tf.steps ?? []).map(step => step[field]).filter(Boolean)));
  isCovered(type, item => ids.has(item.id), "not used by a flow step");
}
for (const out of collections.OUT) {
  for (const field of ["expectation", "reason", "consequence", "disposition"]) if (!out[field]) errors.push(`${out.id}: missing ${field}`);
}
if (errors.length) {
  console.error(`Traceability validation failed for ${path.resolve(file)}:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
const count = Object.values(collections).reduce((sum, items) => sum + items.length, 0);
console.log(`Traceability valid: ${count} records across ${Object.keys(collections).length} types.`);
