import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteDB } from 'idb'
import { createProject } from '../domain/project'
import { migrateProjectV1ToV2 } from '../domain/migration'
import { packLockFor } from '../domain/pack-locks'
import { readSpritePack } from '../domain/spritepack'
import { spritePackFixture, spritePackFixtureBytes } from '../domain/spritepack-test-fixture'
import { createTerrainDocument } from '../domain/terrain'
import { createCharacter, removeCharacter } from '../domain/project-v2'
import { packById } from '../domain/packs'
import type { PackDraftAssetV1 } from '../domain/pack-types'
import { assertPackDraftCapacity, classifyStoragePressure, LEGACY_PROJECT_KEY, PACK_DRAFT_LIMITS, WorkspaceRepository } from './repository'

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

  it('persists terrain atomically and snapshots the prior terrain', async () => {
    const value = await repository()
    const candidate = await graph('Terrain Repository')
    candidate.terrain = createTerrainDocument(candidate.project.theme, 'grass', candidate.project.createdAt, 'terrain-1')
    const created = await value.createGraph(candidate)
    expect((await value.loadGraph(created.project.id))?.terrain).toEqual(candidate.terrain)

    const editedTerrain = structuredClone(candidate.terrain)
    editedTerrain.map.occupied[0] = false
    editedTerrain.updatedAt = '2026-07-20T00:00:00.000Z'
    const saved = await value.saveGraph({ ...created, terrain: editedTerrain }, 0, 'autosave', editedTerrain.updatedAt)
    expect((await value.loadGraph(saved.project.id))?.terrain?.map.occupied[0]).toBe(false)
    expect((await value.snapshots(saved.project.id))[0].graph.terrain?.map.occupied[0]).toBe(true)

    await value.deleteProject(saved.project.id)
    expect(await value.loadGraph(saved.project.id)).toBeNull()
    expect(await (await value.database()).get('terrainDocuments', saved.project.id)).toBeUndefined()
  })

  it('persists separate character records and deletes a removed recipe in the same revision', async () => {
    const value = await repository()
    const candidate = await graph('Cast Repository')
    candidate.terrain = createTerrainDocument(candidate.project.theme, 'stone', candidate.project.createdAt, 'terrain-1')
    const withScout = createCharacter(candidate, 'Scout', packById('wayfarer'), '2026-07-20T00:00:00.000Z', 'scout')
    const created = await value.createGraph(withScout)
    expect((await value.loadGraph(created.project.id))?.project.recipeIds).toHaveLength(2)

    const withoutScout = removeCharacter(created, 'scout', '2026-07-21T00:00:00.000Z')
    const saved = await value.saveGraph(withoutScout, 0, 'character removal', '2026-07-21T00:00:00.000Z')
    const reopened = await value.loadGraph(saved.project.id)
    expect(reopened).toEqual(saved)
    expect(Object.keys(reopened!.recipes)).toEqual(saved.project.recipeIds)
    expect(await (await value.database()).get('recipes', [saved.project.id, 'scout'])).toBeUndefined()
    expect((await value.snapshots(saved.project.id))[0].graph.recipes.scout.name).toBe('Scout')
    expect(reopened?.terrain).toEqual(candidate.terrain)
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

  it('installs exact pack bytes idempotently and rejects an identity collision', async () => {
    const value = await repository()
    const bytes = await spritePackFixtureBytes()
    const first = await value.installPack(bytes, 'installed-local', '2026-07-20T00:00:00.000Z')
    const second = await value.installPack(bytes, 'installed-local', '2026-07-21T00:00:00.000Z')
    expect(second).toEqual(first)
    expect(await value.listInstalledPacks()).toEqual([first])
    await expect(value.installPack(await spritePackFixtureBytes('1.0.0', 'Different immutable content.'))).rejects.toMatchObject({ code: 'pack-conflict' })
    expect(await value.listInstalledPacks()).toEqual([first])
  })

  it('keeps side-by-side versions, local enablement, and shared blob references coherent', async () => {
    const value = await repository()
    const first = await value.installPack(await spritePackFixtureBytes('1.0.0'), 'installed-local', '2026-07-20T00:00:00.000Z')
    const second = await value.installPack(await spritePackFixtureBytes('1.1.0'), 'installed-local', '2026-07-21T00:00:00.000Z')
    expect((await value.listInstalledPacks()).map(item => item.version)).toEqual(['1.1.0', '1.0.0'])
    expect((await value.setPackEnabled(second, false)).enabled).toBe(false)
    const source = (await spritePackFixture()).pack.assets[0].source
    const hash = source.kind === 'sheet-v1' ? source.pngSha256 : ''
    await value.removePack(first)
    expect(await value.readPackBlob(hash)).not.toBeNull()
    await value.removePack(second)
    expect(await value.readPackBlob(hash)).toBeNull()
  })

  it('protects a pack version referenced by an exact project lock', async () => {
    const value = await repository()
    const installed = await value.installPack(await spritePackFixtureBytes())
    const projectGraph = await graph('Locked Hero')
    projectGraph.project.packLocks = [{ packId: installed.packId, version: installed.version, sha256: installed.packDocumentSha256 }]
    projectGraph.recipes = Object.fromEntries(Object.entries(projectGraph.recipes).map(([id, recipe]) => [id, { ...recipe, packId: installed.packId }]))
    await value.createGraph(projectGraph)
    await expect(value.removePack(installed)).rejects.toMatchObject({ code: 'pack-in-use', details: { dependentProjects: 1 } })
    expect(await value.listInstalledPacks()).toHaveLength(1)
  })

  it('autosaves complete drafts with optimistic revisions and reopens their assets', async () => {
    const value = await repository()
    const draft = await value.createPackDraft('Test Pack', '2026-07-20T00:00:00.000Z')
    const bytes = (await readSpritePack(await spritePackFixtureBytes())).pngs
    const sourceBlobSha256 = Object.keys(bytes)[0]
    await value.storePackDraftSource(bytes[sourceBlobSha256])
    const asset: PackDraftAssetV1 = {
      draftId: draft.id,
      assetId: 'local.test.asset',
      sourceBlobSha256,
      name: 'Test asset',
      slot: 'torso',
      description: '',
      sourceColorBindings: { '#123456': { kind: 'fixed' } },
      provenance: null,
    }
    const saved = await value.savePackDraft({ ...draft, assetIds: [asset.assetId], activeAssetId: asset.assetId }, [asset], 0, '2026-07-21T00:00:00.000Z')
    expect(saved.revision).toBe(1)
    expect(await value.loadPackDraft(draft.id)).toEqual({ draft: saved, assets: [asset] })
    await expect(value.savePackDraft(saved, [asset], 0)).rejects.toMatchObject({ code: 'draft-conflict', details: { expectedRevision: 0, actualRevision: 1 } })
  })

  it('persists exact embedded package bytes with project scope and removes them with the project', async () => {
    const value = await repository()
    const packageBytes = await spritePackFixtureBytes()
    const pack = await readSpritePack(packageBytes)
    const projectGraph = await graph('Embedded Hero')
    projectGraph.project.packLocks = [{ packId: pack.pack.id, version: pack.pack.version, sha256: pack.packDocumentSha256 }]
    projectGraph.recipes = Object.fromEntries(Object.entries(projectGraph.recipes).map(([id, recipe]) => [id, { ...recipe, packId: pack.pack.id }]))
    await value.createGraph(projectGraph, [packageBytes])
    expect(await value.projectEmbeddedPackages(projectGraph.project.id)).toEqual([{
      projectId: projectGraph.project.id,
      packageSha256: pack.packageSha256,
      packageBytes,
      packId: pack.pack.id,
      version: pack.pack.version,
      packDocumentSha256: pack.packDocumentSha256,
    }])
    await value.deleteProject(projectGraph.project.id)
    expect(await value.projectEmbeddedPackages(projectGraph.project.id)).toEqual([])
  })

  it('accepts 32 drafts and rejects the thirty-third without mutation', async () => {
    const value = await repository()
    for (let index = 0; index < PACK_DRAFT_LIMITS.drafts; index += 1) await value.createPackDraft(`Draft ${index}`)
    await expect(value.createPackDraft('Draft 33')).rejects.toMatchObject({ code: 'draft-limit' })
    expect(await value.listPackDrafts()).toHaveLength(PACK_DRAFT_LIMITS.drafts)
  })

  it('accepts 128 assets and rejects the one-over save without changing the committed draft', async () => {
    const value = await repository()
    const draft = await value.createPackDraft('Capacity draft')
    const packageBytes = await readSpritePack(await spritePackFixtureBytes())
    const sourceBlobSha256 = Object.keys(packageBytes.pngs)[0]
    await value.storePackDraftSource(packageBytes.pngs[sourceBlobSha256])
    const assets: PackDraftAssetV1[] = Array.from({ length: PACK_DRAFT_LIMITS.assets }, (_, index) => ({ draftId: draft.id, assetId: `local.capacity.asset.${index}`, sourceBlobSha256, name: `Capacity ${index}`, slot: 'torso', description: '', sourceColorBindings: { '#123456': { kind: 'fixed' } }, provenance: null }))
    const saved = await value.savePackDraft({ ...draft, assetIds: assets.map(asset => asset.assetId), activeAssetId: assets[0].assetId }, assets, 0)
    expect((await value.loadPackDraft(draft.id))?.assets).toHaveLength(PACK_DRAFT_LIMITS.assets)
    const oneOver = [...assets, { ...assets[0], assetId: 'local.capacity.asset.128' }]
    await expect(value.savePackDraft(saved, oneOver, saved.revision)).rejects.toMatchObject({ code: 'draft-limit' })
    expect((await value.loadPackDraft(draft.id))?.draft.revision).toBe(saved.revision)
  })

  it('maps every one-over byte capacity to draft-limit', () => {
    for (const kind of ['sourceBytes', 'referencedBytes', 'userOwnedBytes'] as const) {
      expect(() => assertPackDraftCapacity(kind, PACK_DRAFT_LIMITS[kind])).not.toThrow()
      expect(() => assertPackDraftCapacity(kind, PACK_DRAFT_LIMITS[kind] + 1)).toThrowError(expect.objectContaining({ code: 'draft-limit' }))
    }
  })
})