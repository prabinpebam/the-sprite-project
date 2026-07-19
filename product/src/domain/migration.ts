import { parseProjectGraphV2, parseProjectV1 } from './schemas'
import type { PackLockRef, ProjectGraphV2 } from './types'

export function migrateProjectV1ToV2(source: unknown, packLock: PackLockRef): ProjectGraphV2 {
  const legacy = parseProjectV1(source)
  if (legacy.packId !== legacy.character.packId || packLock.packId !== legacy.packId) {
    throw new Error(`Legacy project requires unresolved pack ${legacy.packId}.`)
  }

  return parseProjectGraphV2({
    project: {
      schemaVersion: 2,
      id: legacy.id,
      name: legacy.name,
      activeRecipeId: legacy.character.id,
      recipeIds: [legacy.character.id],
      packLocks: [packLock],
      themePresetId: legacy.themePresetId,
      theme: legacy.theme,
      preview: legacy.preview,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      revision: 0,
    },
    recipes: {
      [legacy.character.id]: { schemaVersion: 1, ...legacy.character },
    },
  })
}