import { createProject } from './project'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { parseProjectGraphV2 } from './schemas'
import type { PackLockRef, ProjectGraphV2, SpriteProject } from './types'

export function legacyProjection(graphValue: ProjectGraphV2): SpriteProject {
  const graph = parseProjectGraphV2(graphValue)
  const recipe = graph.recipes[graph.project.activeRecipeId]

  return {
    schemaVersion: 1,
    id: graph.project.id,
    name: graph.project.name,
    packId: recipe.packId,
    themePresetId: graph.project.themePresetId,
    theme: graph.project.theme,
    character: {
      id: recipe.id,
      name: recipe.name,
      packId: recipe.packId,
      selections: recipe.selections,
      overrides: recipe.overrides,
    },
    preview: graph.project.preview,
    createdAt: graph.project.createdAt,
    updatedAt: graph.project.updatedAt,
  }
}

export async function createProjectGraph(name: string, now = new Date().toISOString()): Promise<ProjectGraphV2> {
  const legacy = createProject(name, now)
  return migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
}

export function applyLegacyProjection(graphValue: ProjectGraphV2, legacy: SpriteProject, packLock?: PackLockRef): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  const recipeId = graph.project.activeRecipeId
  return parseProjectGraphV2({
    project: {
      ...graph.project,
      name: legacy.name,
      packLocks: packLock ? [packLock] : graph.project.packLocks,
      themePresetId: legacy.themePresetId,
      theme: legacy.theme,
      preview: legacy.preview,
      updatedAt: legacy.updatedAt,
    },
    recipes: {
      [recipeId]: { schemaVersion: 1, ...legacy.character, id: recipeId },
    },
  })
}

export function copyProjectGraph(graphValue: ProjectGraphV2, name: string, now = new Date().toISOString()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  return parseProjectGraphV2({
    ...graph,
    project: {
      ...graph.project,
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      revision: 0,
    },
  })
}