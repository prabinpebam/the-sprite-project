import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { canonicalJson } from '../domain/canonical'
import { ProductError } from '../domain/errors'
import { migrateProjectV1ToV2 } from '../domain/migration'
import { packLockFor } from '../domain/pack-locks'
import { parseProjectGraphV2 } from '../domain/schemas'
import { sha256Hex } from '../domain/sha256'
import type { CharacterRecipeV1, ProjectGraphV2, SpriteProjectV2, TerrainDocumentV1 } from '../domain/types'
import { readSpritePack } from '../domain/spritepack'
import type { InstalledPackVersion, PackDraftAssetV1, PackDraftV1, PackOrigin } from '../domain/pack-types'

export const WORKSPACE_DB_NAME = 'the-sprite-project-workspace-v1'
export const REVISION_CHANNEL_NAME = 'the-sprite-project-project-revisions-v1'
export const LEGACY_PROJECT_KEY = 'the-sprite-project:mvp:project:v1'

export const PACK_DRAFT_LIMITS = {
  drafts: 32,
  assets: 128,
  sourceBytes: 16 * 1024 * 1024,
  referencedBytes: 128 * 1024 * 1024,
  userOwnedBytes: 512 * 1024 * 1024,
} as const

export function assertPackDraftCapacity(kind: 'drafts' | 'assets' | 'sourceBytes' | 'referencedBytes' | 'userOwnedBytes', observed: number): void {
  const allowed = PACK_DRAFT_LIMITS[kind]
  if (observed > allowed) throw new ProductError({ code: 'draft-limit', message: `Pack draft ${kind} exceeds the supported limit.`, operation: 'draft:capacity', recoverable: true, details: { observed, allowed } })
}

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

interface TerrainRecord {
  projectId: string
  terrain: TerrainDocumentV1
}

export interface ProjectEmbeddedPack {
  projectId: string
  packageSha256: string
  packageBytes: Uint8Array
  packId: string
  version: string
  packDocumentSha256: string
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
  terrainDocuments: {
    key: string
    value: TerrainRecord
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
  packVersions: {
    key: [string, string, string]
    value: InstalledPackVersion
    indexes: { 'by-pack': string; 'by-installed': string }
  }
  packDrafts: {
    key: string
    value: PackDraftV1
    indexes: { 'by-updated': string }
  }
  packDraftAssets: {
    key: [string, string]
    value: PackDraftAssetV1
    indexes: { 'by-draft': string }
  }
  projectEmbeddedPacks: {
    key: [string, string]
    value: ProjectEmbeddedPack
    indexes: { 'by-project': string }
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
      this.#database = openDB<WorkspaceSchema>(this.databaseName, 4, {
        upgrade(database, oldVersion) {
          if (oldVersion < 1) {
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
          }
          if (oldVersion < 2) {
            const versions = database.createObjectStore('packVersions', { keyPath: ['packId', 'version', 'packageSha256'] })
            versions.createIndex('by-pack', 'packId')
            versions.createIndex('by-installed', 'installedAt')
            const drafts = database.createObjectStore('packDrafts', { keyPath: 'id' })
            drafts.createIndex('by-updated', 'updatedAt')
            const assets = database.createObjectStore('packDraftAssets', { keyPath: ['draftId', 'assetId'] })
            assets.createIndex('by-draft', 'draftId')
          }
          if (oldVersion < 3) {
            const embedded = database.createObjectStore('projectEmbeddedPacks', { keyPath: ['projectId', 'packageSha256'] })
            embedded.createIndex('by-project', 'projectId')
          }
          if (oldVersion < 4 && !database.objectStoreNames.contains('terrainDocuments')) database.createObjectStore('terrainDocuments', { keyPath: 'projectId' })
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
    const transaction = database.transaction(['projects', 'recipes', 'terrainDocuments'], 'readonly')
    const project = await transaction.objectStore('projects').get(projectId)
    if (!project) return null
    const recipeRecords = await transaction.objectStore('recipes').index('by-project').getAll(projectId)
    const terrainRecord = await transaction.objectStore('terrainDocuments').get(projectId)
    await transaction.done
    return parseProjectGraphV2({ project, recipes: Object.fromEntries(recipeRecords.map(record => [record.recipeId, record.recipe])), terrain: terrainRecord?.terrain ?? null })
  }

  async createGraph(graphValue: ProjectGraphV2, embeddedPackageBytes: Uint8Array[] = []): Promise<ProjectGraphV2> {
    const graph = parseProjectGraphV2(graphValue)
    const embedded = await Promise.all(embeddedPackageBytes.map(bytes => readSpritePack(bytes)))
    for (const pack of embedded) {
      const lock = graph.project.packLocks.find(item => item.packId === pack.pack.id)
      if (!lock || lock.version !== pack.pack.version || lock.sha256 !== pack.packDocumentSha256) throw new ProductError({ code: 'missing-pack', message: 'Embedded package does not match an exact project lock.', operation: 'project:create', recoverable: true })
    }
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'terrainDocuments', 'packs', 'projectEmbeddedPacks'], 'readwrite')
    if (await transaction.objectStore('projects').get(graph.project.id)) {
      await transaction.done
      throw new ProductError({ code: 'path-conflict', message: 'A project with this ID already exists.', operation: 'project:create', recoverable: true })
    }
    await transaction.objectStore('projects').put(graph.project)
    for (const recipeId of graph.project.recipeIds) {
      await transaction.objectStore('recipes').put({ projectId: graph.project.id, recipeId, recipe: graph.recipes[recipeId] })
    }
    if (graph.terrain) await transaction.objectStore('terrainDocuments').put({ projectId: graph.project.id, terrain: graph.terrain })
    for (const lock of graph.project.packLocks) await transaction.objectStore('packs').put({ ...lock, bundled: true })
    for (const pack of embedded) await transaction.objectStore('projectEmbeddedPacks').put({
      projectId: graph.project.id,
      packageSha256: pack.packageSha256,
      packageBytes: Uint8Array.from(pack.bytes),
      packId: pack.pack.id,
      version: pack.pack.version,
      packDocumentSha256: pack.packDocumentSha256,
    })
    await transaction.done
    return graph
  }

  async saveGraph(graphValue: ProjectGraphV2, expectedRevision: number, reason = 'autosave', now = new Date().toISOString(), embeddedPackageBytes?: Uint8Array[]): Promise<ProjectGraphV2> {
    const graph = parseProjectGraphV2(graphValue)
    const embedded = embeddedPackageBytes ? await Promise.all(embeddedPackageBytes.map(bytes => readSpritePack(bytes))) : null
    if (embedded) for (const pack of embedded) {
      const lock = graph.project.packLocks.find(item => item.packId === pack.pack.id)
      if (!lock || lock.version !== pack.pack.version || lock.sha256 !== pack.packDocumentSha256) throw new ProductError({ code: 'missing-pack', message: 'Embedded package does not match an exact project lock.', operation: 'project:save', recoverable: true })
    }
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'terrainDocuments', 'snapshots', 'packs', 'projectEmbeddedPacks'], 'readwrite')
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
    const terrainRecord = await transaction.objectStore('terrainDocuments').get(graph.project.id)
    const currentGraph = parseProjectGraphV2({ project: currentProject, recipes: Object.fromEntries(recipeRecords.map(record => [record.recipeId, record.recipe])), terrain: terrainRecord?.terrain ?? null })
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
    const recipeStore = transaction.objectStore('recipes')
    for (const record of recipeRecords) {
      if (!next.project.recipeIds.includes(record.recipeId)) await recipeStore.delete([next.project.id, record.recipeId])
    }
    for (const recipeId of next.project.recipeIds) {
      await recipeStore.put({ projectId: next.project.id, recipeId, recipe: next.recipes[recipeId] })
    }
    if (next.terrain) await transaction.objectStore('terrainDocuments').put({ projectId: next.project.id, terrain: next.terrain })
    else await transaction.objectStore('terrainDocuments').delete(next.project.id)
    for (const lock of next.project.packLocks) await transaction.objectStore('packs').put({ ...lock, bundled: true })
    if (embedded) {
      const priorKeys = await transaction.objectStore('projectEmbeddedPacks').index('by-project').getAllKeys(next.project.id)
      await Promise.all(priorKeys.map(key => transaction.objectStore('projectEmbeddedPacks').delete(key)))
      for (const pack of embedded) await transaction.objectStore('projectEmbeddedPacks').put({
        projectId: next.project.id,
        packageSha256: pack.packageSha256,
        packageBytes: Uint8Array.from(pack.bytes),
        packId: pack.pack.id,
        version: pack.pack.version,
        packDocumentSha256: pack.packDocumentSha256,
      })
    }
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
    const transaction = database.transaction(['projects', 'recipes', 'terrainDocuments', 'snapshots', 'projectEmbeddedPacks'], 'readwrite')
    await transaction.objectStore('projects').delete(projectId)
    await transaction.objectStore('terrainDocuments').delete(projectId)
    const recipes = await transaction.objectStore('recipes').index('by-project').getAllKeys(projectId)
    const snapshots = await transaction.objectStore('snapshots').index('by-project').getAllKeys(projectId)
    const embedded = await transaction.objectStore('projectEmbeddedPacks').index('by-project').getAllKeys(projectId)
    await Promise.all(recipes.map(key => transaction.objectStore('recipes').delete(key)))
    await Promise.all(snapshots.map(key => transaction.objectStore('snapshots').delete(key)))
    await Promise.all(embedded.map(key => transaction.objectStore('projectEmbeddedPacks').delete(key)))
    await transaction.done
  }

  async clearAll(): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(['projects', 'recipes', 'terrainDocuments', 'snapshots', 'packs', 'packBlobs', 'migrations', 'settings', 'packVersions', 'packDrafts', 'packDraftAssets', 'projectEmbeddedPacks'], 'readwrite')
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

  async listInstalledPacks(): Promise<InstalledPackVersion[]> {
    const database = await this.database()
    return (await database.getAllFromIndex('packVersions', 'by-installed')).sort((left, right) => right.installedAt.localeCompare(left.installedAt))
  }

  async projectEmbeddedPackages(projectId: string): Promise<ProjectEmbeddedPack[]> {
    const database = await this.database()
    return database.getAllFromIndex('projectEmbeddedPacks', 'by-project', projectId)
  }

  async projectPackageBytes(graphValue: ProjectGraphV2): Promise<Uint8Array[]> {
    const graph = parseProjectGraphV2(graphValue)
    const [embedded, installed] = await Promise.all([this.projectEmbeddedPackages(graph.project.id), this.listInstalledPacks()])
    const packages = new Map<string, Uint8Array>()
    for (const item of embedded) {
      const lock = graph.project.packLocks.find(value => value.packId === item.packId && value.version === item.version && value.sha256 === item.packDocumentSha256)
      if (lock) packages.set(item.packageSha256, Uint8Array.from(item.packageBytes))
    }
    for (const item of installed) {
      const lock = graph.project.packLocks.find(value => value.packId === item.packId && value.version === item.version && value.sha256 === item.packDocumentSha256)
      if (lock) packages.set(item.packageSha256, Uint8Array.from(item.packageBytes))
    }
    return [...packages.values()]
  }

  async installPack(packageBytes: Uint8Array, origin: PackOrigin = 'installed-local', now = new Date().toISOString()): Promise<InstalledPackVersion> {
    const parsed = await readSpritePack(packageBytes)
    const database = await this.database()
    const transaction = database.transaction(['packVersions', 'packBlobs'], 'readwrite')
    const versions = await transaction.objectStore('packVersions').index('by-pack').getAll(parsed.pack.id)
    const exact = versions.find(item => item.version === parsed.pack.version && item.packageSha256 === parsed.packageSha256)
    if (exact) {
      await transaction.done
      return exact
    }
    if (versions.some(item => item.version === parsed.pack.version)) {
      await transaction.done
      throw new ProductError({ code: 'pack-conflict', message: 'This pack ID and version is already installed with different bytes.', operation: 'pack:install', recoverable: true, details: { packId: parsed.pack.id, version: parsed.pack.version } })
    }
    for (const [hash, bytes] of Object.entries(parsed.pngs)) {
      const existing = await transaction.objectStore('packBlobs').get(hash)
      await transaction.objectStore('packBlobs').put(existing
        ? { ...existing, referenceCount: existing.referenceCount + 1 }
        : { sha256: hash, bytes, referenceCount: 1, userOwned: true })
    }
    const installed: InstalledPackVersion = {
      packId: parsed.pack.id,
      version: parsed.pack.version,
      packageSha256: parsed.packageSha256,
      packDocumentSha256: parsed.packDocumentSha256,
      origin,
      enabled: true,
      installedAt: now,
      packageBytes: Uint8Array.from(packageBytes),
      pack: parsed.pack,
      provenance: parsed.provenance,
    }
    await transaction.objectStore('packVersions').put(installed)
    await transaction.done
    const readBack = await database.get('packVersions', [installed.packId, installed.version, installed.packageSha256])
    if (!readBack) throw new ProductError({ code: 'io-failed', message: 'Installed pack failed read-back.', operation: 'pack:install', recoverable: true })
    return readBack
  }

  async setPackEnabled(identity: Pick<InstalledPackVersion, 'packId' | 'version' | 'packageSha256'>, enabled: boolean): Promise<InstalledPackVersion> {
    const database = await this.database()
    const key: [string, string, string] = [identity.packId, identity.version, identity.packageSha256]
    const current = await database.get('packVersions', key)
    if (!current) throw new ProductError({ code: 'pack-missing', message: 'Installed pack is unavailable.', operation: 'pack:enable', recoverable: true })
    const next = { ...current, enabled }
    await database.put('packVersions', next)
    return next
  }

  async removePack(identity: Pick<InstalledPackVersion, 'packId' | 'version' | 'packageSha256'>): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(['packVersions', 'packBlobs', 'projects'], 'readwrite')
    const key: [string, string, string] = [identity.packId, identity.version, identity.packageSha256]
    const current = await transaction.objectStore('packVersions').get(key)
    if (!current) {
      await transaction.done
      return
    }
    const projects = await transaction.objectStore('projects').getAll()
    const dependencies = projects.filter(project => project.packLocks.some(lock => lock.packId === current.packId && lock.version === current.version && lock.sha256 === current.packDocumentSha256))
    if (dependencies.length) {
      await transaction.done
      throw new ProductError({ code: 'pack-in-use', message: 'Pack version is used by local projects.', operation: 'pack:remove', recoverable: true, details: { dependentProjects: dependencies.length } })
    }
    await transaction.objectStore('packVersions').delete(key)
    for (const asset of current.pack.assets) {
      if (asset.source.kind !== 'sheet-v1') continue
      const blob = await transaction.objectStore('packBlobs').get(asset.source.pngSha256)
      if (!blob) continue
      if (blob.referenceCount <= 1) await transaction.objectStore('packBlobs').delete(blob.sha256)
      else await transaction.objectStore('packBlobs').put({ ...blob, referenceCount: blob.referenceCount - 1 })
    }
    await transaction.done
  }

  async createPackDraft(name = 'Untitled pack', now = new Date().toISOString()): Promise<PackDraftV1> {
    const database = await this.database()
    assertPackDraftCapacity('drafts', (await database.count('packDrafts')) + 1)
    const id = crypto.randomUUID()
    const draft: PackDraftV1 = {
      draftSchemaVersion: 1,
      id,
      revision: 0,
      packId: `local.${id}`,
      version: '0.1.0',
      name,
      description: '',
      subjectProfile: 'humanoid-lpc-64',
      assetIds: [],
      activeAssetId: null,
      createdAt: now,
      updatedAt: now,
      lastExportedPackageSha256: null,
    }
    await database.add('packDrafts', draft)
    return draft
  }

  async listPackDrafts(): Promise<PackDraftV1[]> {
    const database = await this.database()
    return (await database.getAllFromIndex('packDrafts', 'by-updated')).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async loadPackDraft(id: string): Promise<{ draft: PackDraftV1; assets: PackDraftAssetV1[] } | null> {
    const database = await this.database()
    const transaction = database.transaction(['packDrafts', 'packDraftAssets'], 'readonly')
    const draft = await transaction.objectStore('packDrafts').get(id)
    if (!draft) return null
    const assets = await transaction.objectStore('packDraftAssets').index('by-draft').getAll(id)
    await transaction.done
    return { draft, assets }
  }

  async savePackDraft(draftValue: PackDraftV1, assets: PackDraftAssetV1[], expectedRevision: number, now = new Date().toISOString()): Promise<PackDraftV1> {
    assertPackDraftCapacity('assets', assets.length)
    const database = await this.database()
    const transaction = database.transaction(['packDrafts', 'packDraftAssets', 'packBlobs'], 'readwrite')
    const current = await transaction.objectStore('packDrafts').get(draftValue.id)
    if (!current || current.revision !== expectedRevision) {
      await transaction.done
      throw new ProductError({ code: 'draft-conflict', message: 'The pack draft has a newer revision.', operation: 'draft:save', recoverable: true, details: { expectedRevision, actualRevision: current?.revision ?? -1 } })
    }
    const priorAssets = await transaction.objectStore('packDraftAssets').index('by-draft').getAll(draftValue.id)
    const nextHashes = new Map<string, number>()
    const priorHashes = new Map<string, number>()
    for (const asset of assets) nextHashes.set(asset.sourceBlobSha256, (nextHashes.get(asset.sourceBlobSha256) ?? 0) + 1)
    for (const asset of priorAssets) priorHashes.set(asset.sourceBlobSha256, (priorHashes.get(asset.sourceBlobSha256) ?? 0) + 1)
    let sourceBytes = 0
    for (const hash of nextHashes.keys()) {
      const blob = await transaction.objectStore('packBlobs').get(hash)
      if (!blob) throw new ProductError({ code: 'draft-limit', message: 'A draft source blob is unavailable.', operation: 'draft:save', recoverable: true, details: { hash } })
      sourceBytes += blob.bytes.length
    }
    assertPackDraftCapacity('referencedBytes', sourceBytes)
    const next = { ...draftValue, revision: expectedRevision + 1, updatedAt: now }
    await transaction.objectStore('packDrafts').put(next)
    const priorKeys = await transaction.objectStore('packDraftAssets').index('by-draft').getAllKeys(draftValue.id)
    await Promise.all(priorKeys.map(key => transaction.objectStore('packDraftAssets').delete(key)))
    await Promise.all(assets.map(asset => transaction.objectStore('packDraftAssets').put(asset)))
    for (const hash of new Set([...priorHashes.keys(), ...nextHashes.keys()])) {
      const blob = await transaction.objectStore('packBlobs').get(hash)
      if (blob) await transaction.objectStore('packBlobs').put({ ...blob, referenceCount: Math.max(0, blob.referenceCount + (nextHashes.get(hash) ?? 0) - (priorHashes.get(hash) ?? 0)) })
    }
    await transaction.done
    return next
  }

  async storePackDraftSource(bytes: Uint8Array): Promise<string> {
    assertPackDraftCapacity('sourceBytes', bytes.length)
    const hash = await sha256Hex(bytes)
    const database = await this.database()
    const current = await database.get('packBlobs', hash)
    if (!current) {
      const userOwnedBytes = (await database.getAll('packBlobs')).filter(blob => blob.userOwned).reduce((sum, blob) => sum + blob.bytes.length, 0)
      assertPackDraftCapacity('userOwnedBytes', userOwnedBytes + bytes.length)
      await database.put('packBlobs', { sha256: hash, bytes: Uint8Array.from(bytes), referenceCount: 0, userOwned: true })
    }
    return hash
  }

  async readPackBlob(hash: string): Promise<Uint8Array | null> {
    const record = await (await this.database()).get('packBlobs', hash)
    return record ? Uint8Array.from(record.bytes) : null
  }

}