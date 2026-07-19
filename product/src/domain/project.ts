import { packById, selectedAssets } from './packs'
import { presetById, resolveTheme } from './themes'
import { REQUIRED_SLOTS, type CreditRecord, type SlotId, type SpriteProject } from './types'

export const STORAGE_KEY = 'the-sprite-project:mvp:project:v1'

export function createProject(name: string, now = new Date().toISOString()): SpriteProject {
  const pack = packById('wayfarer')
  const preset = presetById('hearth')
  return {
    schemaVersion: 1,
    id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
    name: name.trim(),
    packId: pack.id,
    themePresetId: preset.id,
    theme: { ...preset.tokens },
    character: {
      id: globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`,
      name: 'Hero',
      packId: pack.id,
      selections: { ...pack.defaults },
      overrides: {},
    },
    preview: { animation: 'walk', direction: 'south', speed: 1, zoom: 5, playing: true },
    createdAt: now,
    updatedAt: now,
  }
}

export function switchPack(project: SpriteProject, packId: string): SpriteProject {
  const pack = packById(packId)
  return touch({
    ...project,
    packId: pack.id,
    character: { ...project.character, packId: pack.id, selections: { ...pack.defaults } },
  })
}

export function touch(project: SpriteProject): SpriteProject {
  return { ...project, updatedAt: new Date().toISOString() }
}

export function missingRequiredSlots(project: SpriteProject): SlotId[] {
  return REQUIRED_SLOTS.filter(slot => !project.character.selections[slot])
}

export function exportBlockers(project: SpriteProject): string[] {
  const pack = packById(project.packId)
  const missing = missingRequiredSlots(project).map(slot => `Select a ${slot} layer.`)
  const assets = selectedAssets(pack, project.character.selections)
  const invalid = Object.values(project.character.selections)
    .filter((id): id is string => Boolean(id))
    .filter(id => !assets.some(asset => asset.id === id))
    .map(id => `Selected asset ${id} is not available in ${pack.name}.`)
  const provenance = assets
    .filter(asset => !asset.provenance.author || !asset.provenance.source || !asset.provenance.chosenLicense)
    .map(asset => `${asset.name} has incomplete provenance.`)
  return [...missing, ...invalid, ...provenance]
}

export function isExportReady(project: SpriteProject): boolean {
  return exportBlockers(project).length === 0
}

export function resolvedTheme(project: SpriteProject) {
  return resolveTheme(project.theme, project.character.overrides)
}

export function creditsFor(project: SpriteProject): CreditRecord[] {
  const pack = packById(project.packId)
  const groups = new Map<string, CreditRecord>()
  for (const item of selectedAssets(pack, project.character.selections)) {
    const key = [item.provenance.author, item.provenance.source, item.provenance.chosenLicense].join('|')
    const current = groups.get(key)
    if (current) {
      current.assetIds.push(item.id)
      current.assetNames.push(item.name)
    } else {
      groups.set(key, {
        ...item.provenance,
        assetIds: [item.id], assetNames: [item.name], packId: pack.id, packVersion: pack.version,
      })
    }
  }
  return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source))
}
