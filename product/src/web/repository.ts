import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { canonicalJson } from '../domain/canonical'
import { ProductError } from '../domain/errors'
import { migrateProjectV1ToV2 } from '../domain/migration'
import { packLockFor } from '../domain/pack-locks'
import { parseProjectGraphV2 } from '../domain/schemas'
import { sha256Hex } from '../domain/sha256'
import type { CharacterRecipeV1, ProjectGraphV2, SpriteProjectV2 } from '../domain/types'

export const WORKSPACE_DB_NAME = 'the-sprite-project-workspace-v1'
export const REVISION_CHANNEL_NAME = 'the-sprite-project-project-revisions-v1'
export const LEGACY_PROJECT_KEY = 'the-sprite-project:mvp:project:v1'

export interface SnapshotRecord {
  projectId: string
  revision: number
  reason: string
  createdAt: string
  protectedUntil: string | null
  graph: ProjectGraphV2
}

export interface MigrationRecord {
  id: string
  kind: 'legacy-localstorage-v1-to-project-v2'
  sourceKey: typeof LEGACY_PROJECT_KEY
  sourceSha256: string
  status: 'pending' | 'verified' | 'failed'
  candidateProjectId: string
  createdAt: string
  completedAt: string | null
  failureCode: string | null
  failureStage: 'parse' | 'validate-v1' | 'transform' | 'write' | 'read-back' | 'parity' | null
  recoveryBytes: string
  recoveryExpiresAt: string | null
}

interface RecipeRecord {
  projectId: string
  recipeId: string
  recipe: CharacterRecipeV1
}

interface WorkspaceSchema extends DBSchema {
  projects: {
    key: string
    value: SpriteProjectV2
    indexes: { 'by-updated': string }
  }
  recipes: {
    key: [string, string]
    value: RecipeRecord
    indexes: { 'by-project': string }
  }
  snapshots: {
    key: [string, number]
    value: SnapshotRecord
    indexes: { 'by-project': string }
  }
  packs: {
    key: [string, string]
    value: { packId: string; version: string; sha256: string; bundled: boolean }
  }
  packBlobs: {
    key: string
    value: { sha256: string; bytes: Uint8Array; referenceCount: number; userOwned: boolean }
  }
  migrations: {
    key: string
    value: MigrationRecord
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
}

export interface MigrationOutcome {
  status: 'none' | 'migrated' | 'blocked'
  projectId?: string
  error?: ProductError
  recoveryBytes?: string
}

export interface DisposableDataPreview {
  unreferencedPackBlobs: number
  removableSnapshots: number
}

export type StoragePressure = 'healthy' | 'warning' | 'critical'

export function classifyStoragePressure(usage: number, quota: number, pendingBytes = 0): StoragePressure {
  if (quota <= 0) return 'healthy'
  const ratio = Math.max(usage, usage + pendingBytes) / quota
  if (ratio >= 0.9) return 'critical'
  if (ratio >= 0.8) return 'warning'
  return 'healthy'
}

function addDays(timestamp: string, days: number): string {
  return new Date(new Date(timestamp).getTime() + days * 86_400_000).toISOString()
}

export class WorkspaceRepository {
  readonly databaseName: string
  #database: Promise<IDBPDatabase<WorkspaceSchema>> | null = null
  #revisionChannel: BroadcastChannel | null = null

  constructor(databaseName = WORKSPACE_DB_NAME) {
    this.databaseName = databaseName
    if (typeof BroadcastChannel !== 'undefined') this.#revisionChannel = new BroadcastChannel(REVISION_CHANNEL_NAME)
  }

  async database(): Promise<IDBPDatabase<WorkspaceSchema>> {
    if (!this.#database) {
      this.#database = openDB<WorkspaceSchema>(this.databaseName, 1, {
        upgrade(database) {
          const projects = database.createObjectStore('projects', { keyPath: 'id' })
          projects.createIndex('by-updated', 'updatedAt')
          const recipes = database.createObjectStore('recipes', { keyPath: ['projectId', 'recipeId'] })
          recipes.createIndex('by-project', 'projectId')
          const snapshots = database.createObjectStore('snapshots', { keyPath: ['projectId', 'revision'] })
          snapshots.createIndex('by-project', 'projectId')
          database.createObjectStore('packs', { keyPath: ['packId', 'version'] })
          database.createObjectStore('packBlobs', { keyPath: 'sha256' })
          database.createObjectStore('migrations', { keyPath: 'id' })
          database.createObjectStore('settings', { keyPath: 'key' })
        },
      })
    }
    return this.#database
  }

  async close(): Promise<void> {
    if (this.#database) (await this.#database).close()
    this.#revisionChannel?.close()
    this.#database = null
  }

  async listProjects(): Promise<SpriteProjectV2[]> {
    const database = await this.database()
    return (await database.getAllFromIndex('projects', 'by-updated')).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async loadGraph(projectId: string): Promise<ProjectGraphV2 | null> {
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes'], 'readonly')
    const project = await transaction.objectStore('projects').get(projectId)
    if (!project) return null
    const recipeRecords = await transaction.objectStore('recipes').index('by-project').getAll(projectId)
    await transaction.done
    return parseProjectGraphV2({ project, recipes: Object.fromEntries(recipeRecords.map(record => [record.recipeId, record.recipe])) })
  }

  async createGraph(graphValue: ProjectGraphV2): Promise<ProjectGraphV2> {
    const graph = parseProjectGraphV2(graphValue)
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'packs'], 'readwrite')
    if (await transaction.objectStore('projects').get(graph.project.id)) {
      await transaction.done
      throw new ProductError({ code: 'path-conflict', message: 'A project with this ID already exists.', operation: 'project:create', recoverable: true })
    }
    await transaction.objectStore('projects').put(graph.project)
    for (const recipeId of graph.project.recipeIds) {
      await transaction.objectStore('recipes').put({ projectId: graph.project.id, recipeId, recipe: graph.recipes[recipeId] })
    }
    for (const lock of graph.project.packLocks) await transaction.objectStore('packs').put({ ...lock, bundled: true })
    await transaction.done
    return graph
  }

  async saveGraph(graphValue: ProjectGraphV2, expectedRevision: number, reason = 'autosave', now = new Date().toISOString()): Promise<ProjectGraphV2> {
    const graph = parseProjectGraphV2(graphValue)
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'snapshots', 'packs'], 'readwrite')
    const projects = transaction.objectStore('projects')
    const currentProject = await projects.get(graph.project.id)
    if (!currentProject || currentProject.revision !== expectedRevision) {
      await transaction.done
      throw new ProductError({
        code: 'revision-conflict',
        message: 'The stored project has a newer revision.',
        operation: 'project:save',
        recoverable: true,
        details: { expectedRevision, actualRevision: currentProject?.revision ?? -1 },
      })
    }

    const recipeRecords = await transaction.objectStore('recipes').index('by-project').getAll(graph.project.id)
    const currentGraph = parseProjectGraphV2({ project: currentProject, recipes: Object.fromEntries(recipeRecords.map(record => [record.recipeId, record.recipe])) })
    const protectedReason = ['migration', 'pack replacement', 'conflict overwrite', 'archive replace'].includes(reason)
    await transaction.objectStore('snapshots').put({
      projectId: graph.project.id,
      revision: currentProject.revision,
      reason,
      createdAt: now,
      protectedUntil: protectedReason ? addDays(now, 30) : null,
      graph: currentGraph,
    })

    const next = parseProjectGraphV2({
      ...graph,
      project: { ...graph.project, revision: expectedRevision + 1, updatedAt: now },
    })
    await transaction.objectStore('projects').put(next.project)
    for (const recipeId of next.project.recipeIds) {
      await transaction.objectStore('recipes').put({ projectId: next.project.id, recipeId, recipe: next.recipes[recipeId] })
    }
    for (const lock of next.project.packLocks) await transaction.objectStore('packs').put({ ...lock, bundled: true })
    await transaction.done
    this.#revisionChannel?.postMessage({ projectId: next.project.id, revision: next.project.revision })
    await this.applySnapshotRetention(next.project.id, now)
    return next
  }

  async snapshots(projectId: string): Promise<SnapshotRecord[]> {
    const database = await this.database()
    return (await database.getAllFromIndex('snapshots', 'by-project', projectId)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  async restoreSnapshot(projectId: string, revision: number, now = new Date().toISOString()): Promise<ProjectGraphV2> {
    const database = await this.database()
    const [current, snapshot] = await Promise.all([this.loadGraph(projectId), database.get('snapshots', [projectId, revision])])
    if (!current || !snapshot) throw new ProductError({ code: 'invalid-project', message: 'The selected recovery point is unavailable.', operation: 'snapshot:restore', recoverable: true })
    return this.saveGraph({ ...snapshot.graph, project: { ...snapshot.graph.project, revision: current.project.revision } }, current.project.revision, 'snapshot restore', now)
  }

  async deleteProject(projectId: string): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'snapshots'], 'readwrite')
    await transaction.objectStore('projects').delete(projectId)
    const recipes = await transaction.objectStore('recipes').index('by-project').getAllKeys(projectId)
    const snapshots = await transaction.objectStore('snapshots').index('by-project').getAllKeys(projectId)
    await Promise.all(recipes.map(key => transaction.objectStore('recipes').delete(key)))
    await Promise.all(snapshots.map(key => transaction.objectStore('snapshots').delete(key)))
    await transaction.done
  }

  async clearAll(): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'snapshots', 'packs', 'packBlobs', 'migrations', 'settings'], 'readwrite')
    await Promise.all([...transaction.objectStoreNames].map(name => transaction.objectStore(name).clear()))
    await transaction.done
  }

  async previewDisposableData(): Promise<DisposableDataPreview> {
    const database = await this.database()
    const [blobs, snapshots] = await Promise.all([database.getAll('packBlobs'), database.getAll('snapshots')])
    const newestByProject = new Map<string, SnapshotRecord>()
    for (const snapshot of snapshots) {
      const current = newestByProject.get(snapshot.projectId)
      if (!current || snapshot.createdAt > current.createdAt) newestByProject.set(snapshot.projectId, snapshot)
    }
    return {
      unreferencedPackBlobs: blobs.filter(blob => blob.referenceCount === 0 && !blob.userOwned).length,
      removableSnapshots: snapshots.filter(snapshot => newestByProject.get(snapshot.projectId) !== snapshot && !snapshot.protectedUntil).length,
    }
  }

  async clearDisposableData(): Promise<DisposableDataPreview> {
    const database = await this.database()
    const preview = await this.previewDisposableData()
    const transaction = database.transaction(['packBlobs', 'snapshots'], 'readwrite')
    const blobs = await transaction.objectStore('packBlobs').getAll()
    for (const blob of blobs) {
      if (blob.referenceCount === 0 && !blob.userOwned) await transaction.objectStore('packBlobs').delete(blob.sha256)
    }
    const snapshots = await transaction.objectStore('snapshots').getAll()
    const newestByProject = new Map<string, SnapshotRecord>()
    for (const snapshot of snapshots) {
      const current = newestByProject.get(snapshot.projectId)
      if (!current || snapshot.createdAt > current.createdAt) newestByProject.set(snapshot.projectId, snapshot)
    }
    for (const snapshot of snapshots) {
      if (newestByProject.get(snapshot.projectId) !== snapshot && !snapshot.protectedUntil) {
        await transaction.objectStore('snapshots').delete([snapshot.projectId, snapshot.revision])
      }
    }
    await transaction.done
    return preview
  }

  async applySnapshotRetention(projectId: string, now = new Date().toISOString()): Promise<void> {
    const database = await this.database()
    const records = (await database.getAllFromIndex('snapshots', 'by-project', projectId)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    if (records.length <= 1) return
    const cutoff = new Date(now).getTime() - 30 * 86_400_000
    const removable = records.filter((record, index) => index > 0 && (!record.protectedUntil || record.protectedUntil < now) && (index >= 20 || new Date(record.createdAt).getTime() < cutoff))
    const transaction = database.transaction('snapshots', 'readwrite')
    await Promise.all(removable.map(record => transaction.store.delete([record.projectId, record.revision])))
    await transaction.done
  }

  async migrateLegacy(storage: Pick<Storage, 'getItem' | 'removeItem'>, now = new Date().toISOString()): Promise<MigrationOutcome> {
    const recoveryBytes = storage.getItem(LEGACY_PROJECT_KEY)
    if (recoveryBytes === null) return { status: 'none' }
    const sourceSha256 = await sha256Hex(new TextEncoder().encode(recoveryBytes))
    const id = `legacy-localstorage-v1:${sourceSha256}`
    const database = await this.database()
    const existing = await database.get('migrations', id)
    if (existing?.status === 'verified') {
      storage.removeItem(LEGACY_PROJECT_KEY)
      return { status: 'migrated', projectId: existing.candidateProjectId }
    }

    let candidate: ProjectGraphV2
    try {
      const legacy = JSON.parse(recoveryBytes) as { packId?: string }
      if (!legacy.packId) throw new Error('Legacy project does not identify a pack.')
      candidate = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
    } catch (error) {
      const productError = new ProductError({ code: 'invalid-project', message: error instanceof Error ? error.message : 'Legacy project is invalid.', operation: 'migration:transform', recoverable: true })
      await database.put('migrations', {
        id, kind: 'legacy-localstorage-v1-to-project-v2', sourceKey: LEGACY_PROJECT_KEY, sourceSha256,
        status: 'failed', candidateProjectId: '', createdAt: now, completedAt: now,
        failureCode: productError.code, failureStage: 'transform', recoveryBytes, recoveryExpiresAt: null,
      })
      return { status: 'blocked', error: productError, recoveryBytes }
    }

    const pending: MigrationRecord = {
      id, kind: 'legacy-localstorage-v1-to-project-v2', sourceKey: LEGACY_PROJECT_KEY, sourceSha256,
      status: 'pending', candidateProjectId: candidate.project.id, createdAt: now, completedAt: null,
      failureCode: null, failureStage: null, recoveryBytes, recoveryExpiresAt: null,
    }
    try {
      const transaction = database.transaction(['projects', 'recipes', 'packs', 'migrations'], 'readwrite')
      await transaction.objectStore('projects').put(candidate.project)
      for (const recipeId of candidate.project.recipeIds) {
        await transaction.objectStore('recipes').put({ projectId: candidate.project.id, recipeId, recipe: candidate.recipes[recipeId] })
      }
      for (const lock of candidate.project.packLocks) await transaction.objectStore('packs').put({ ...lock, bundled: true })
      await transaction.objectStore('migrations').put(pending)
      await transaction.done

      const readBack = await this.loadGraph(candidate.project.id)
      if (!readBack || canonicalJson(readBack) !== canonicalJson(candidate)) throw new Error('Migrated project failed canonical read-back parity.')
      await database.put('migrations', { ...pending, status: 'verified', completedAt: now, recoveryExpiresAt: addDays(now, 30) })
      storage.removeItem(LEGACY_PROJECT_KEY)
      return { status: 'migrated', projectId: candidate.project.id }
    } catch (error) {
      const transaction = database.transaction(['projects', 'recipes', 'migrations'], 'readwrite')
      await transaction.objectStore('projects').delete(candidate.project.id)
      const recipeKeys = await transaction.objectStore('recipes').index('by-project').getAllKeys(candidate.project.id)
      await Promise.all(recipeKeys.map(key => transaction.objectStore('recipes').delete(key)))
      const productError = new ProductError({ code: 'io-failed', message: error instanceof Error ? error.message : 'Migration write failed.', operation: 'migration:write', recoverable: true })
      await transaction.objectStore('migrations').put({ ...pending, status: 'failed', completedAt: now, failureCode: productError.code, failureStage: 'write' })
      await transaction.done
      return { status: 'blocked', error: productError, recoveryBytes }
    }
  }

  async migrationRecord(id: string): Promise<MigrationRecord | undefined> {
    return (await this.database()).get('migrations', id)
  }

}