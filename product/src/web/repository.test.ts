import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteDB } from 'idb'
import { createProject } from '../domain/project'
import { migrateProjectV1ToV2 } from '../domain/migration'
import { packLockFor } from '../domain/pack-locks'
import { classifyStoragePressure, LEGACY_PROJECT_KEY, WorkspaceRepository } from './repository'

const repositories: WorkspaceRepository[] = []

async function repository() {
  const value = new WorkspaceRepository(`test-${crypto.randomUUID()}`)
  repositories.push(value)
  return value
}

async function graph(name = 'Repository Hero') {
  const legacy = createProject(name, '2026-07-19T00:00:00.000Z')
  return migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
}

afterEach(async () => {
  for (const value of repositories.splice(0)) {
    const name = value.databaseName
    await value.close()
    await deleteDB(name)
  }
})

describe('web workspace repository', () => {
  it('classifies the binding 80% warning and 90% critical thresholds', () => {
    expect(classifyStoragePressure(79, 100)).toBe('healthy')
    expect(classifyStoragePressure(80, 100)).toBe('warning')
    expect(classifyStoragePressure(79, 100, 11)).toBe('critical')
    expect(classifyStoragePressure(90, 100)).toBe('critical')
  })
  it('creates, lists, and loads complete project graphs', async () => {
    const value = await repository()
    const created = await value.createGraph(await graph())
    expect(await value.listProjects()).toEqual([created.project])
    expect(await value.loadGraph(created.project.id)).toEqual(created)
  })

  it('increments revisions atomically and preserves the prior graph as a snapshot', async () => {
    const value = await repository()
    const created = await value.createGraph(await graph())
    const edited = { ...created, project: { ...created.project, name: 'Edited Hero' } }
    const saved = await value.saveGraph(edited, 0, 'autosave', '2026-07-20T00:00:00.000Z')
    expect(saved.project.revision).toBe(1)
    expect((await value.snapshots(saved.project.id))[0].graph.project.name).toBe('Repository Hero')
  })

  it('writes nothing when the expected revision is stale', async () => {
    const value = await repository()
    const created = await value.createGraph(await graph())
    const first = await value.saveGraph({ ...created, project: { ...created.project, name: 'First' } }, 0)
    await expect(value.saveGraph({ ...created, project: { ...created.project, name: 'Stale' } }, 0)).rejects.toMatchObject({ code: 'revision-conflict' })
    expect(await value.loadGraph(created.project.id)).toEqual(first)
    expect(await value.snapshots(created.project.id)).toHaveLength(1)
  })

  it('migrates valid legacy bytes and retains a verified recovery record', async () => {
    const value = await repository()
    const legacy = createProject('Migrated Hero', '2026-07-19T00:00:00.000Z')
    const storage = new Map([[LEGACY_PROJECT_KEY, JSON.stringify(legacy)]])
    const adapter = { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => { storage.delete(key) } }
    const outcome = await value.migrateLegacy(adapter, '2026-07-20T00:00:00.000Z')
    expect(outcome).toMatchObject({ status: 'migrated', projectId: legacy.id })
    expect(storage.has(LEGACY_PROJECT_KEY)).toBe(false)
    expect(await value.loadGraph(legacy.id)).not.toBeNull()
  })

  it('leaves invalid legacy bytes untouched and stores no candidate graph', async () => {
    const value = await repository()
    const storage = new Map([[LEGACY_PROJECT_KEY, '{not json']])
    const adapter = { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => { storage.delete(key) } }
    const outcome = await value.migrateLegacy(adapter)
    expect(outcome.status).toBe('blocked')
    expect(outcome.recoveryBytes).toBe('{not json')
    expect(storage.get(LEGACY_PROJECT_KEY)).toBe('{not json')
    expect(await value.listProjects()).toEqual([])
  })
})