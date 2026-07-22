import { describe, expect, it } from 'vitest'
import { canonicalJsonBytes } from './canonical'
import { ProductError } from './errors'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { createProject, touch } from './project'
import { activateCharacter, applyLegacyProjection, createCharacter, duplicateCharacter, duplicateCharacterName, legacyProjection, removeCharacter, renameCharacter } from './project-v2'
import { createTerrainDocument } from './terrain'
import { packById } from './packs'

async function fixture() {
  const legacy = createProject('Cast', '2026-07-22T00:00:00.000Z')
  const graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
  graph.terrain = createTerrainDocument(graph.project.theme, 'grass', graph.project.createdAt, 'terrain-1')
  return graph
}

describe('multi-character project graph', () => {
  it('creates and projects an independent active recipe without sibling or terrain drift', async () => {
    const graph = await fixture()
    const sourceId = graph.project.activeRecipeId
    const sourceBytes = canonicalJsonBytes(graph.recipes[sourceId])
    const terrainBytes = canonicalJsonBytes(graph.terrain)
    const next = createCharacter(graph, 'Scout', packById('wayfarer'), '2026-07-22T01:00:00.000Z', 'scout')
    expect(next.project.recipeIds).toEqual([sourceId, 'scout'])
    expect(next.project.activeRecipeId).toBe('scout')
    expect(next.recipes.scout.selections).toEqual(packById('wayfarer').defaults)
    expect(next.recipes.scout.overrides).toEqual({})
    expect(canonicalJsonBytes(next.recipes[sourceId])).toEqual(sourceBytes)
    expect(canonicalJsonBytes(next.terrain)).toEqual(terrainBytes)
    expect(legacyProjection(next).character.name).toBe('Scout')
    expect(legacyProjection(next, sourceId).character.name).toBe('Hero')
  })

  it('duplicates, renames, activates, and removes with deterministic identity and fallback', async () => {
    let graph = await fixture()
    const heroId = graph.project.activeRecipeId
    graph = createCharacter(graph, 'Scout', packById('wayfarer'), '2026-07-22T01:00:00.000Z', 'scout')
    graph = duplicateCharacter(graph, 'scout', duplicateCharacterName(graph, 'scout'), '2026-07-22T02:00:00.000Z', 'scout-copy')
    expect(graph.recipes['scout-copy']).toMatchObject({ name: 'Scout copy', packId: 'wayfarer', selections: graph.recipes.scout.selections })
    expect(duplicateCharacterName(graph, 'scout')).toBe('Scout copy 2')
    graph = renameCharacter(graph, 'scout-copy', 'Guard', '2026-07-22T03:00:00.000Z')
    graph = activateCharacter(graph, 'scout', '2026-07-22T04:00:00.000Z')
    graph = removeCharacter(graph, 'scout', '2026-07-22T05:00:00.000Z')
    expect(graph.project.recipeIds).toEqual([heroId, 'scout-copy'])
    expect(graph.project.activeRecipeId).toBe('scout-copy')
    graph = removeCharacter(graph, 'scout-copy', '2026-07-22T06:00:00.000Z')
    expect(graph.project.activeRecipeId).toBe(heroId)
    expect(() => removeCharacter(graph, heroId)).toThrowError(expect.objectContaining({ code: 'character-limit' }))
  })

  it('rejects invalid, duplicate, over-capacity, and conflicting pack changes before mutation', async () => {
    let graph = await fixture()
    const before = canonicalJsonBytes(graph)
    expect(() => createCharacter(graph, ' ', packById('wayfarer'))).toThrowError(expect.objectContaining({ code: 'invalid-character-name', message: 'Character name required' }))
    expect(() => createCharacter(graph, 'hero', packById('wayfarer'))).toThrowError(expect.objectContaining({ code: 'invalid-character-name', message: 'Character already named Hero' }))
    expect(canonicalJsonBytes(graph)).toEqual(before)
    for (let index = 2; index <= 16; index += 1) graph = createCharacter(graph, `Hero ${index}`, packById('wayfarer'), `2026-07-22T${String(index).padStart(2, '0')}:00:00.000Z`, `hero-${index}`)
    expect(() => createCharacter(graph, 'Hero 17', packById('wayfarer'))).toThrowError(expect.objectContaining({ code: 'character-limit' }))
  })

  it('applies active legacy edits while preserving sibling recipes and terrain', async () => {
    let graph = await fixture()
    graph = createCharacter(graph, 'Scout', packById('wayfarer'), '2026-07-22T01:00:00.000Z', 'scout')
    const heroBytes = canonicalJsonBytes(graph.recipes[graph.project.recipeIds[0]])
    const terrainBytes = canonicalJsonBytes(graph.terrain)
    const edited = touch({ ...legacyProjection(graph), character: { ...legacyProjection(graph).character, name: 'Ranger' } })
    graph = applyLegacyProjection(graph, edited)
    expect(graph.recipes.scout.name).toBe('Ranger')
    expect(canonicalJsonBytes(graph.recipes[graph.project.recipeIds[0]])).toEqual(heroBytes)
    expect(canonicalJsonBytes(graph.terrain)).toEqual(terrainBytes)
  })

  it('uses stable ProductError codes', () => {
    expect(new ProductError({ code: 'invalid-character-name', message: 'x', operation: 'test', recoverable: true }).code).toBe('invalid-character-name')
  })
})