import { describe, expect, it } from 'vitest'
import { createProject } from './project'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { parseProjectGraphV2, parseProjectV1, parseProjectV2 } from './schemas'

describe('shared project contracts', () => {
  it('strictly parses the verified legacy shape', () => {
    const legacy = createProject('Legacy', '2026-07-19T00:00:00.000Z')
    expect(parseProjectV1(legacy)).toEqual(legacy)
    expect(() => parseProjectV1({ ...legacy, hostPath: 'C:\\secret' })).toThrow()
  })

  it('migrates v1 to one recipe without changing semantic fields', async () => {
    const legacy = createProject('Legacy', '2026-07-19T00:00:00.000Z')
    legacy.preview = { animation: 'idle', direction: 'north', speed: 1.5, zoom: 6, playing: false }
    const graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))

    expect(graph.project).toMatchObject({
      schemaVersion: 2,
      id: legacy.id,
      name: legacy.name,
      activeRecipeId: legacy.character.id,
      recipeIds: [legacy.character.id],
      theme: legacy.theme,
      preview: legacy.preview,
      revision: 0,
    })
    expect(graph.recipes[legacy.character.id]).toEqual({ schemaVersion: 1, ...legacy.character })
  })

  it('rejects unresolved locks, duplicate lock IDs, invalid revisions, and leaked host state', async () => {
    const legacy = createProject('Invalid graph', '2026-07-19T00:00:00.000Z')
    const lock = await packLockFor(legacy.packId)
    expect(() => migrateProjectV1ToV2(legacy, { ...lock, packId: 'missing' })).toThrow('unresolved pack')

    const graph = migrateProjectV1ToV2(legacy, lock)
    expect(() => parseProjectV2({ ...graph.project, revision: -1 })).toThrow()
    expect(() => parseProjectV2({ ...graph.project, packLocks: [lock, lock] })).toThrow('Pack lock IDs must be unique')
    expect(() => parseProjectV2({ ...graph.project, displayPath: 'C:\\project' })).toThrow()
    expect(() => parseProjectGraphV2({ ...graph, recipes: {} })).toThrow('missing recipes')
  })

  it('produces a stable SHA-256 pack lock', async () => {
    const first = await packLockFor('wayfarer')
    const second = await packLockFor('wayfarer')
    expect(first).toEqual(second)
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})