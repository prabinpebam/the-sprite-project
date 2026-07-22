import { createProject } from './project'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { ProductError } from './errors'
import { parseProjectGraphV2 } from './schemas'
import type { CharacterRecipeV1, ContentPack, PackLockRef, ProjectGraphV2, SpriteProject } from './types'

const MAX_CHARACTERS = 16

export function normalizeCharacterName(name: string): string {
  return name.trim().normalize('NFC')
}

function characterError(code: 'invalid-character-name' | 'character-limit' | 'invalid-project' | 'pack-in-use', message: string, operation: string): ProductError {
  return new ProductError({ code, message, operation, recoverable: true })
}

function validatedCharacterName(graph: ProjectGraphV2, name: string, operation: string, excludedRecipeId?: string): string {
  const normalized = normalizeCharacterName(name)
  if (!normalized) throw characterError('invalid-character-name', 'Character name required', operation)
  if (normalized.length > 80) throw characterError('invalid-character-name', 'Name must be 80 characters or less', operation)
  const folded = normalized.toLocaleLowerCase('en-US')
  const duplicate = graph.project.recipeIds
    .filter(recipeId => recipeId !== excludedRecipeId)
    .map(recipeId => graph.recipes[recipeId])
    .find(recipe => recipe.name.toLocaleLowerCase('en-US') === folded)
  if (duplicate) throw characterError('invalid-character-name', `Character already named ${duplicate.name}`, operation)
  return normalized
}

export function activeRecipe(graphValue: ProjectGraphV2): CharacterRecipeV1 {
  const graph = parseProjectGraphV2(graphValue)
  return graph.recipes[graph.project.activeRecipeId]
}

export function legacyProjection(graphValue: ProjectGraphV2, recipeId?: string): SpriteProject {
  const graph = parseProjectGraphV2(graphValue)
  const targetRecipeId = recipeId ?? graph.project.activeRecipeId
  const recipe = graph.recipes[targetRecipeId]
  if (!recipe) throw characterError('invalid-project', `Character ${targetRecipeId} is unavailable.`, 'character:project')

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

export function createCharacter(graphValue: ProjectGraphV2, name: string, activePack: ContentPack, now = new Date().toISOString(), id: string = crypto.randomUUID()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  if (graph.project.recipeIds.length >= MAX_CHARACTERS) throw characterError('character-limit', 'Maximum 16 characters per project', 'character:create')
  if (graph.recipes[id]) throw characterError('invalid-project', `Character ID ${id} already exists.`, 'character:create')
  const source = activeRecipe(graph)
  const lock = graph.project.packLocks.find(item => item.packId === source.packId)
  if (!lock || activePack.id !== source.packId || activePack.version !== lock.version || activePack.packDocumentSha256 && activePack.packDocumentSha256 !== lock.sha256) {
    throw characterError('pack-in-use', 'The active character pack does not match the project exact lock.', 'character:create')
  }
  const recipe: CharacterRecipeV1 = {
    schemaVersion: 1,
    id,
    name: validatedCharacterName(graph, name, 'character:create'),
    packId: source.packId,
    selections: { ...activePack.defaults },
    overrides: {},
  }
  return parseProjectGraphV2({
    project: { ...graph.project, recipeIds: [...graph.project.recipeIds, id], activeRecipeId: id, updatedAt: now },
    recipes: { ...graph.recipes, [id]: recipe },
    terrain: graph.terrain,
  })
}

export function duplicateCharacter(graphValue: ProjectGraphV2, sourceId: string, name: string, now = new Date().toISOString(), id: string = crypto.randomUUID()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  if (graph.project.recipeIds.length >= MAX_CHARACTERS) throw characterError('character-limit', 'Maximum 16 characters per project', 'character:duplicate')
  const source = graph.recipes[sourceId]
  if (!source || !graph.project.packLocks.some(lock => lock.packId === source.packId)) throw characterError('invalid-project', `Character ${sourceId} or its pack lock is unavailable.`, 'character:duplicate')
  if (graph.recipes[id]) throw characterError('invalid-project', `Character ID ${id} already exists.`, 'character:duplicate')
  const recipe: CharacterRecipeV1 = { ...structuredClone(source), id, name: validatedCharacterName(graph, name, 'character:duplicate') }
  return parseProjectGraphV2({
    project: { ...graph.project, recipeIds: [...graph.project.recipeIds, id], activeRecipeId: id, updatedAt: now },
    recipes: { ...graph.recipes, [id]: recipe },
    terrain: graph.terrain,
  })
}

export function renameCharacter(graphValue: ProjectGraphV2, recipeId: string, name: string, now = new Date().toISOString()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  const recipe = graph.recipes[recipeId]
  if (!recipe) throw characterError('invalid-project', `Character ${recipeId} is unavailable.`, 'character:rename')
  return parseProjectGraphV2({
    project: { ...graph.project, updatedAt: now },
    recipes: { ...graph.recipes, [recipeId]: { ...recipe, name: validatedCharacterName(graph, name, 'character:rename', recipeId) } },
    terrain: graph.terrain,
  })
}

export function activateCharacter(graphValue: ProjectGraphV2, recipeId: string, now = new Date().toISOString()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  if (!graph.recipes[recipeId]) throw characterError('invalid-project', `Character ${recipeId} is unavailable.`, 'character:activate')
  return parseProjectGraphV2({ ...graph, project: { ...graph.project, activeRecipeId: recipeId, updatedAt: now } })
}

export function removeCharacter(graphValue: ProjectGraphV2, recipeId: string, now = new Date().toISOString()): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  const index = graph.project.recipeIds.indexOf(recipeId)
  if (index < 0) throw characterError('invalid-project', `Character ${recipeId} is unavailable.`, 'character:remove')
  if (graph.project.recipeIds.length === 1) throw characterError('character-limit', 'A project must keep at least one character.', 'character:remove')
  const recipeIds = graph.project.recipeIds.filter(id => id !== recipeId)
  const recipes = { ...graph.recipes }
  delete recipes[recipeId]
  const activeRecipeId = graph.project.activeRecipeId === recipeId
    ? graph.project.recipeIds[index + 1] ?? graph.project.recipeIds[index - 1]
    : graph.project.activeRecipeId
  return parseProjectGraphV2({ project: { ...graph.project, recipeIds, activeRecipeId, updatedAt: now }, recipes, terrain: graph.terrain })
}

export function duplicateCharacterName(graphValue: ProjectGraphV2, sourceId: string): string {
  const graph = parseProjectGraphV2(graphValue)
  const source = graph.recipes[sourceId]
  if (!source) throw characterError('invalid-project', `Character ${sourceId} is unavailable.`, 'character:duplicate')
  const names = new Set(graph.project.recipeIds.map(id => graph.recipes[id].name.toLocaleLowerCase('en-US')))
  const base = `${source.name} copy`
  if (!names.has(base.toLocaleLowerCase('en-US'))) return base
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base} ${suffix}`
    if (!names.has(candidate.toLocaleLowerCase('en-US'))) return candidate
  }
}

export function applyLegacyProjection(graphValue: ProjectGraphV2, legacy: SpriteProject, packLock?: PackLockRef): ProjectGraphV2 {
  const graph = parseProjectGraphV2(graphValue)
  const recipeId = graph.project.activeRecipeId
  const packLocks = [...graph.project.packLocks]
  if (packLock) {
    const existingIndex = packLocks.findIndex(lock => lock.packId === packLock.packId)
    if (existingIndex < 0) packLocks.push(packLock)
    else if (packLocks[existingIndex].version !== packLock.version || packLocks[existingIndex].sha256 !== packLock.sha256) {
      const siblingUsesPack = graph.project.recipeIds.some(id => id !== recipeId && graph.recipes[id].packId === packLock.packId)
      if (siblingUsesPack) throw characterError('pack-in-use', `Pack ${packLock.packId} is used by another character.`, 'character:pack')
      packLocks[existingIndex] = packLock
    }
  }
  return parseProjectGraphV2({
    project: {
      ...graph.project,
      name: legacy.name,
      packLocks,
      themePresetId: legacy.themePresetId,
      theme: legacy.theme,
      preview: legacy.preview,
      updatedAt: legacy.updatedAt,
    },
    recipes: {
      ...graph.recipes,
      [recipeId]: { schemaVersion: 1, ...legacy.character, id: recipeId },
    },
    terrain: graph.terrain,
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