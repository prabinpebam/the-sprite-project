import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import { unzipSync, zipSync } from 'fflate'
import { readProjectArchive, validateArchivePath, writeProjectArchive } from '../src/domain/archive'
import { canonicalJsonBytes } from '../src/domain/canonical'
import { ProductError, type HostError, type HostErrorCode, type HostResult } from '../src/domain/errors'
import { parseProjectGraphV2 } from '../src/domain/schemas'
import type { ReadSpritePackResult } from '../src/domain/spritepack'
import type { ProjectGraphV2 } from '../src/domain/types'
import type {
  ApprovedLocation, ArchiveSummary, InstalledPackSummary, OpenedProject, ProjectFingerprint, ReadPackBytes, RecentProject,
  SavedProject, WrittenArchive, WrittenExport, WrittenPack,
} from '../src/host/bridge'
import { parseFileMode, parseFolderMode, parseGrantId, parseInstallPackRequest, parseRemovePackRequest, parseSaveProjectRequest, parseWriteArchiveRequest, parseWriteExportRequest, parseWritePackRequest } from '../src/host/validation'
import { CHANNELS } from './channels'

if (process.env.SPRITE_PROJECT_USER_DATA) app.setPath('userData', process.env.SPRITE_PROJECT_USER_DATA)

interface Grant extends ApprovedLocation {
  absolutePath: string
  scopes: Set<'read-project' | 'write-project' | 'read-archive' | 'write-archive' | 'write-export' | 'read-pack' | 'write-pack'>
  ownerWebContentsId?: number
}

interface RecentRecord {
  recentId: string
  displayPath: string
  lastOpenedAt: string
}

interface PackIndexRecord {
  packId: string
  version: string
  name: string
  packageSha256: string
  packDocumentSha256: string
  origin: 'installed-local' | 'authored-local'
  enabled: boolean
  installedAt: string
  packageBytes: number
}

interface PackIndex {
  schemaVersion: 1
  revision: number
  versions: PackIndexRecord[]
}

const grants = new Map<string, Grant>()
let mainWindow: BrowserWindow | null = null

function ok<T>(value: T): HostResult<T> {
  return { ok: true, value }
}

function hostError(error: unknown, operation: string): HostError {
  if (error instanceof ProductError) return error.toHostError()
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'ENOENT') return { code: 'path-missing', message: 'The approved location no longer exists.', operation, recoverable: true }
  if (code === 'EACCES' || code === 'EPERM') return { code: 'permission-denied', message: 'The operating system denied access.', operation, recoverable: true }
  return { code: 'io-failed', message: error instanceof Error ? error.message : 'The operation failed.', operation, recoverable: true }
}

async function result<T>(operation: string, action: () => Promise<T>): Promise<HostResult<T>> {
  try {
    return ok(await action())
  } catch (error) {
    return { ok: false, error: hostError(error, operation) }
  }
}

type PackWorkerMessage =
  | { kind: 'progress'; stage: string }
  | { kind: 'success'; result: ReadSpritePackResult }
  | { kind: 'error'; error: { code: string; message: string; operation: string; recoverable: boolean; details?: Record<string, string | number | boolean> } }

function readSpritePackOffThread(bytes: Uint8Array): Promise<ReadSpritePackResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pack-validation-worker.mjs', import.meta.url))
    let settled = false
    const finish = () => {
      if (!settled) settled = true
      void worker.terminate()
    }
    worker.on('message', (message: PackWorkerMessage) => {
      if (message.kind === 'success') {
        finish()
        resolve(message.result)
      } else if (message.kind === 'error') {
        finish()
        reject(new ProductError({ ...message.error, code: message.error.code as HostErrorCode }))
      }
    })
    worker.on('error', error => {
      finish()
      reject(new ProductError({ code: 'pack-invalid', message: error.message, operation: 'pack:worker', recoverable: true }))
    })
    worker.on('exit', code => {
      if (!settled) {
        settled = true
        reject(new ProductError({ code: 'pack-invalid', message: `Pack validation worker exited before returning a result (code ${code}).`, operation: 'pack:worker', recoverable: true }))
      }
    })
    const transfer = bytes.buffer instanceof ArrayBuffer ? [bytes.buffer] : []
    worker.postMessage({ bytes }, transfer)
  })
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function issueGrant(absolutePath: string, kind: Grant['kind'], scopes: Grant['scopes']): ApprovedLocation {
  const id = randomUUID()
  grants.set(id, { grantId: id, displayPath: absolutePath, kind, absolutePath, scopes })
  return { grantId: id, displayPath: absolutePath, kind }
}

function requireGrant(idValue: unknown, scope: Grant['scopes'] extends Set<infer Scope> ? Scope : never): Grant {
  const id = parseGrantId(idValue)
  const grant = grants.get(id)
  if (!grant || !grant.scopes.has(scope)) throw new ProductError({ code: 'path-not-approved', message: 'This location grant does not authorize the operation.', operation: scope, recoverable: true })
  return grant
}

function issuePackGrant(absolutePath: string, scope: 'read-pack' | 'write-pack', ownerWebContentsId: number): ApprovedLocation {
  const id = randomUUID()
  const grant: Grant = { grantId: id, displayPath: absolutePath, kind: 'pack-file', absolutePath, scopes: new Set([scope]), ownerWebContentsId }
  grants.set(id, grant)
  return { grantId: id, displayPath: absolutePath, kind: 'pack-file' }
}

function requirePackGrant(idValue: unknown, scope: 'read-pack' | 'write-pack', ownerWebContentsId: number): Grant {
  const grant = requireGrant(idValue, scope)
  if (grant.kind !== 'pack-file' || grant.ownerWebContentsId !== ownerWebContentsId) throw new ProductError({ code: 'path-not-approved', message: 'This pack grant does not belong to the requesting window.', operation: scope, recoverable: true })
  return grant
}

function packRoot(): string {
  return path.join(app.getPath('userData'), 'packs', 'v1')
}

function packIndexPath(): string {
  return path.join(packRoot(), 'index.json')
}

function packagePath(packageSha256: string): string {
  return path.join(packRoot(), 'packages', `${packageSha256}.spritepack`)
}

function parsePackIndex(value: unknown): PackIndex {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pack index is not an object.')
  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join(',') !== 'revision,schemaVersion,versions' || record.schemaVersion !== 1 || !Number.isSafeInteger(record.revision) || (record.revision as number) < 0 || !Array.isArray(record.versions)) throw new Error('Pack index violates schema version 1.')
  for (const item of record.versions) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Pack index version is invalid.')
    const keys = Object.keys(item).sort().join(',')
    if (keys !== 'enabled,installedAt,name,origin,packDocumentSha256,packId,packageBytes,packageSha256,version' && keys !== 'enabled,installedAt,name,packDocumentSha256,packId,packageBytes,packageSha256,version') throw new Error('Pack index version has unknown keys.')
    const version = item as Record<string, unknown>
    if (version.origin === undefined) version.origin = 'installed-local'
    if ((version.origin !== 'installed-local' && version.origin !== 'authored-local') || typeof version.packId !== 'string' || typeof version.version !== 'string' || typeof version.name !== 'string' || typeof version.enabled !== 'boolean' || typeof version.installedAt !== 'string' || !Number.isSafeInteger(version.packageBytes) || typeof version.packageSha256 !== 'string' || typeof version.packDocumentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(version.packageSha256) || !/^[a-f0-9]{64}$/.test(version.packDocumentSha256)) throw new Error('Pack index version fields are invalid.')
  }
  return record as unknown as PackIndex
}

async function readPackIndex(): Promise<PackIndex> {
  try {
    return parsePackIndex(JSON.parse(await readFile(packIndexPath(), 'utf8')))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return { schemaVersion: 1, revision: 0, versions: [] }
    throw error
  }
}

async function writePackIndex(index: PackIndex): Promise<void> {
  await writeAtomicFile(packIndexPath(), canonicalJsonBytes(index))
  const readBack = await readPackIndex()
  if (!Buffer.from(canonicalJsonBytes(readBack)).equals(Buffer.from(canonicalJsonBytes(index)))) throw new ProductError({ code: 'io-failed', message: 'Pack index failed read-back.', operation: 'pack:index', recoverable: true })
}

async function readRegularPackFile(absolutePath: string): Promise<Uint8Array> {
  const info = await lstat(absolutePath)
  if (info.isSymbolicLink() || !info.isFile()) throw new ProductError({ code: 'path-not-approved', message: 'Pack source must be a regular file.', operation: 'pack:read', recoverable: true })
  if (info.size > 64 * 1024 * 1024) throw new ProductError({ code: 'pack-limit', message: 'Pack exceeds the 64 MiB payload limit.', operation: 'pack:read', recoverable: true })
  return new Uint8Array(await readFile(absolutePath))
}

async function packDependencyCount(packId: string, version: string, packDocumentSha256: string): Promise<number> {
  let count = 0
  for (const recent of await recentRecords()) {
    try {
      const info = await stat(recent.displayPath)
      const bytes = info.isDirectory() ? await archiveFromFolder(recent.displayPath) : new Uint8Array(await readFile(recent.displayPath))
      const archive = await readProjectArchive(bytes)
      if (archive.graph.project.packLocks.some(lock => lock.packId === packId && lock.version === version && lock.sha256 === packDocumentSha256)) count += 1
    } catch {
      // Unavailable or invalid recents do not authorize removal; active project checks run in the renderer.
    }
  }
  return count
}

function dependencyToken(record: PackIndexRecord, revision: number, dependencyCount: number): string {
  return sha256(canonicalJsonBytes({ packId: record.packId, version: record.version, packageSha256: record.packageSha256, revision, dependencyCount }))
}

async function summarizePackRecord(record: PackIndexRecord, revision: number): Promise<InstalledPackSummary> {
  const dependencyCount = await packDependencyCount(record.packId, record.version, record.packDocumentSha256)
  return { ...record, packageBytes: await readRegularPackFile(packagePath(record.packageSha256)), packageSize: record.packageBytes, indexRevision: revision, dependencyCount, dependencySummaryToken: dependencyToken(record, revision, dependencyCount) }
}

async function archiveFromFolder(root: string): Promise<Uint8Array> {
  const manifestPath = path.join(root, 'archive-manifest.json')
  const manifestBytes = new Uint8Array(await readFile(manifestPath))
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as { entries?: { path?: string }[] }
  if (!Array.isArray(manifest.entries)) throw new ProductError({ code: 'invalid-project', message: 'Folder manifest has no entry inventory.', operation: 'project:read', recoverable: true })
  const zipEntries: Record<string, Uint8Array> = { 'archive-manifest.json': manifestBytes }
  for (const item of manifest.entries) {
    if (typeof item.path !== 'string') throw new ProductError({ code: 'invalid-project', message: 'Folder manifest contains an invalid path.', operation: 'project:read', recoverable: true })
    validateArchivePath(item.path)
    const absolute = path.resolve(root, ...item.path.split('/'))
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) throw new ProductError({ code: 'path-not-approved', message: 'Canonical entry escapes the approved folder.', operation: 'project:read', recoverable: true })
    if ((await lstat(absolute)).isSymbolicLink()) throw new ProductError({ code: 'invalid-project', message: `Symbolic link is not allowed: ${item.path}.`, operation: 'project:read', recoverable: true })
    zipEntries[item.path] = new Uint8Array(await readFile(absolute))
  }
  return zipSync(zipEntries)
}

async function fingerprintFromEntries(entries: Record<string, Uint8Array>): Promise<ProjectFingerprint> {
  const manifest = entries['archive-manifest.json']
  if (!manifest) throw new ProductError({ code: 'invalid-project', message: 'archive-manifest.json is missing.', operation: 'project:fingerprint', recoverable: true })
  const value = JSON.parse(new TextDecoder().decode(manifest)) as { entries: { path: string }[] }
  return { manifestSha256: sha256(manifest), entries: Object.fromEntries(value.entries.map(item => [item.path, sha256(entries[item.path])])) }
}

async function openGrant(grant: Grant): Promise<OpenedProject> {
  const archiveBytes = grant.kind === 'project-folder' ? await archiveFromFolder(grant.absolutePath) : new Uint8Array(await readFile(grant.absolutePath))
  const opened = await readProjectArchive(archiveBytes)
  return { graph: opened.graph, location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, fingerprint: await fingerprintFromEntries(opened.entries), embeddedPackageBytes: opened.embeddedPacks.map(pack => pack.bytes) }
}

function fingerprintsEqual(left: ProjectFingerprint, right: ProjectFingerprint): boolean {
  return left.manifestSha256 === right.manifestSha256 && JSON.stringify(left.entries) === JSON.stringify(right.entries)
}

async function writeAtomicFile(destination: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = `${destination}.sprite-tmp-${randomUUID()}`
  await writeFile(temporary, bytes)
  let destinationExists = false
  try { await stat(destination); destinationExists = true } catch { destinationExists = false }
  if (!destinationExists) {
    await rename(temporary, destination)
    return
  }
  const prior = `${destination}.sprite-old-${randomUUID()}`
  await rename(destination, prior)
  try {
    await rename(temporary, destination)
    await rm(prior, { force: true })
  } catch (error) {
    await rename(prior, destination)
    await rm(temporary, { force: true })
    throw error
  }
}

async function projectPackageBytes(graph: ProjectGraphV2, supplied: Uint8Array[] = []): Promise<Uint8Array[]> {
  const candidates = [...supplied]
  const index = await readPackIndex()
  for (const lock of graph.project.packLocks) {
    const record = index.versions.find(item => item.packId === lock.packId && item.version === lock.version && item.packDocumentSha256 === lock.sha256)
    if (record) candidates.push(await readRegularPackFile(packagePath(record.packageSha256)))
  }
  const exact = new Map<string, Uint8Array>()
  for (const bytes of candidates) {
    const pack = await readSpritePackOffThread(bytes)
    if (graph.project.packLocks.some(lock => lock.packId === pack.pack.id && lock.version === pack.pack.version && lock.sha256 === pack.packDocumentSha256)) exact.set(pack.packageSha256, pack.bytes)
  }
  return [...exact.values()]
}

async function writeFolder(destination: string, graph: ProjectGraphV2, expected: ProjectFingerprint | null, overwriteExternal: boolean, suppliedPackages: Uint8Array[] = []): Promise<ProjectFingerprint> {
  let destinationExists = false
  try { destinationExists = (await stat(destination)).isDirectory() } catch { destinationExists = false }
  if (destinationExists && !expected) {
    const existingEntries = await readdir(destination)
    if (existingEntries.length) throw new ProductError({ code: 'path-conflict', message: 'The selected project folder is not empty.', operation: 'project:save', recoverable: true })
    await rm(destination, { recursive: true })
    destinationExists = false
  }
  if (destinationExists && expected) {
    const currentEntries = unzipSync(await archiveFromFolder(destination))
    const current = await fingerprintFromEntries(currentEntries)
    if (!fingerprintsEqual(current, expected) && !overwriteExternal) throw new ProductError({ code: 'external-modification', message: 'Canonical project files changed after opening.', operation: 'project:save', recoverable: true })
    if (!fingerprintsEqual(current, expected) && overwriteExternal) {
      const recovery = path.join(path.dirname(destination), '.sprite-recovery', path.basename(destination), new Date().toISOString().replace(/[:.]/g, '-'))
      await mkdir(path.dirname(recovery), { recursive: true })
      await rename(destination, recovery)
      destinationExists = false
    }
  }

  const entries = unzipSync(await writeProjectArchive(graph, `sprite-project/${app.getVersion()}`, await projectPackageBytes(graph, suppliedPackages)))
  const temporary = `${destination}.sprite-tmp-${randomUUID()}`
  await rm(temporary, { recursive: true, force: true })
  for (const [relativePath, bytes] of Object.entries(entries)) {
    validateArchivePath(relativePath)
    const output = path.join(temporary, ...relativePath.split('/'))
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, bytes)
  }
  const verified = await readProjectArchive(await archiveFromFolder(temporary))
  if (verified.graph.project.id !== graph.project.id) throw new ProductError({ code: 'io-failed', message: 'Temporary project read-back failed.', operation: 'project:save', recoverable: true })
  if (destinationExists) {
    const old = `${destination}.sprite-old-${randomUUID()}`
    await rename(destination, old)
    try {
      await rename(temporary, destination)
      await rm(old, { recursive: true, force: true })
    } catch (error) {
      await rename(old, destination)
      throw error
    }
  } else {
    await rename(temporary, destination)
  }
  return fingerprintFromEntries(entries)
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'host-settings.json')
}

async function recentRecords(): Promise<RecentRecord[]> {
  try {
    const value = JSON.parse(await readFile(settingsPath(), 'utf8')) as { recent: RecentRecord[] }
    return Array.isArray(value.recent) ? value.recent.slice(0, 10) : []
  } catch {
    return []
  }
}

async function writeRecents(records: RecentRecord[]): Promise<void> {
  await writeAtomicFile(settingsPath(), new TextEncoder().encode(JSON.stringify({ recent: records.slice(0, 10) }, null, 2)))
}

async function remember(displayPath: string): Promise<void> {
  const records = await recentRecords()
  const existing = records.find(record => record.displayPath === displayPath)
  await writeRecents([{ recentId: existing?.recentId ?? randomUUID(), displayPath, lastOpenedAt: new Date().toISOString() }, ...records.filter(record => record.displayPath !== displayPath)])
}

function registerHandlers(): void {
  ipcMain.handle(CHANNELS.getHostInfo, () => ok({ host: 'electron' as const, version: app.getVersion(), platform: process.platform, architecture: process.arch, portable: true }))
  ipcMain.handle(CHANNELS.listRecentProjects, () => result('recent:list', async () => Promise.all((await recentRecords()).map(async record => ({ ...record, available: await stat(record.displayPath).then(() => true, () => false) } satisfies RecentProject)))))
  ipcMain.handle(CHANNELS.openRecentProject, (_event, recentIdValue) => result('recent:open', async () => {
    const recentId = parseGrantId(recentIdValue)
    const record = (await recentRecords()).find(item => item.recentId === recentId)
    if (!record) throw new ProductError({ code: 'path-missing', message: 'Recent project is unavailable.', operation: 'recent:open', recoverable: true })
    const fileStat = await stat(record.displayPath)
    const location = issueGrant(record.displayPath, fileStat.isDirectory() ? 'project-folder' : 'project-file', new Set(['read-project', 'write-project', 'read-archive', 'write-archive']))
    return openGrant(grants.get(location.grantId)!)
  }))
  ipcMain.handle(CHANNELS.forgetRecentProject, (_event, recentIdValue) => result('recent:forget', async () => { const recentId = parseGrantId(recentIdValue); await writeRecents((await recentRecords()).filter(item => item.recentId !== recentId)) }))
  ipcMain.handle(CHANNELS.chooseProjectFolder, (_event, modeValue) => result('dialog:project-folder', async () => {
    const mode = parseFolderMode(modeValue)
    if (mode === 'open') {
      const selection = await dialog.showOpenDialog({ properties: ['openDirectory'] })
      if (selection.canceled || !selection.filePaths[0]) return null
      return issueGrant(selection.filePaths[0], 'project-folder', new Set(['read-project', 'write-project', 'write-archive']))
    }
    const selection = await dialog.showSaveDialog({ title: mode === 'create' ? 'Create project folder' : 'Save project as folder', buttonLabel: 'Choose folder name' })
    if (selection.canceled || !selection.filePath) return null
    return issueGrant(selection.filePath, 'project-folder', new Set(['write-project', 'write-archive']))
  }))
  ipcMain.handle(CHANNELS.chooseProjectFile, (_event, modeValue) => result('dialog:project-file', async () => {
    const mode = parseFileMode(modeValue)
    if (mode === 'open') {
      const selection = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Sprite Project', extensions: ['spriteproject'] }] })
      if (selection.canceled || !selection.filePaths[0]) return null
      return issueGrant(selection.filePaths[0], 'project-file', new Set(['read-project', 'read-archive', 'write-project', 'write-archive']))
    }
    const selection = await dialog.showSaveDialog({ filters: [{ name: 'Sprite Project', extensions: ['spriteproject'] }] })
    return selection.canceled || !selection.filePath ? null : issueGrant(selection.filePath, 'project-file', new Set(['write-project', 'write-archive']))
  }))
  ipcMain.handle(CHANNELS.chooseExportDirectory, () => result('dialog:export-directory', async () => {
    const selection = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return selection.canceled || !selection.filePaths[0] ? null : issueGrant(selection.filePaths[0], 'export-directory', new Set(['write-export']))
  }))
  ipcMain.handle(CHANNELS.readProject, (_event, sourceGrantId) => result('project:read', async () => { const grant = requireGrant(sourceGrantId, 'read-project'); const opened = await openGrant(grant); await remember(grant.absolutePath); return opened }))
  ipcMain.handle(CHANNELS.saveProject, (_event, requestValue) => result('project:save', async () => {
    const request = parseSaveProjectRequest(requestValue)
    const graph = parseProjectGraphV2(request.graph)
    if (new TextEncoder().encode(JSON.stringify(graph)).length > 16 * 1024 * 1024) throw new ProductError({ code: 'invalid-payload', message: 'Project graph exceeds the 16 MiB IPC limit.', operation: 'project:save', recoverable: true })
    const grant = requireGrant(request.destinationGrantId, 'write-project')
    let fingerprint: ProjectFingerprint
    if (grant.kind === 'project-folder') fingerprint = await writeFolder(grant.absolutePath, graph, request.expectedFingerprint, Boolean(request.overwriteExternal), request.embeddedPackageBytes)
    else {
      const bytes = await writeProjectArchive(graph, `sprite-project/${app.getVersion()}`, await projectPackageBytes(graph, request.embeddedPackageBytes))
      await writeAtomicFile(grant.absolutePath, bytes)
      fingerprint = await fingerprintFromEntries(unzipSync(bytes))
    }
    await remember(grant.absolutePath)
    return { location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, fingerprint } satisfies SavedProject
  }))
  ipcMain.handle(CHANNELS.inspectArchive, (_event, sourceGrantId) => result('archive:inspect', async () => {
    const grant = requireGrant(sourceGrantId, 'read-archive')
    const archive = await readProjectArchive(new Uint8Array(await readFile(grant.absolutePath)))
    return { projectId: archive.graph.project.id, projectName: archive.graph.project.name, archiveFormatVersion: archive.manifest.archiveFormatVersion, projectSchemaVersion: archive.manifest.projectSchemaVersion, entryCount: archive.manifest.entries.length, expandedBytes: archive.manifest.entries.reduce((sum, entry) => sum + entry.size, 0) } satisfies ArchiveSummary
  }))
  ipcMain.handle(CHANNELS.writeArchive, (_event, requestValue) => result('archive:write', async () => {
    const request = parseWriteArchiveRequest(requestValue)
    const grant = requireGrant(request.destinationGrantId, 'write-archive')
    const graph = parseProjectGraphV2(request.graph)
    const bytes = await writeProjectArchive(graph, `sprite-project/${app.getVersion()}`, await projectPackageBytes(graph, request.embeddedPackageBytes))
    await writeAtomicFile(grant.absolutePath, bytes)
    return { location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, bytesWritten: bytes.length } satisfies WrittenArchive
  }))
  ipcMain.handle(CHANNELS.writeExport, (_event, requestValue) => result('export:write', async () => {
    const request = parseWriteExportRequest(requestValue)
    const grant = requireGrant(request.destinationGrantId, 'write-export')
    let total = 0
    const files: string[] = []
    for (const entry of request.entries) {
      validateArchivePath(entry.relativePath)
      if (entry.bytes.length > 64 * 1024 * 1024 || total + entry.bytes.length > 128 * 1024 * 1024) throw new ProductError({ code: 'invalid-payload', message: 'Export payload exceeds the bridge limit.', operation: 'export:write', recoverable: true })
      const destination = path.resolve(grant.absolutePath, ...entry.relativePath.split('/'))
      if (!destination.startsWith(`${path.resolve(grant.absolutePath)}${path.sep}`)) throw new ProductError({ code: 'path-not-approved', message: 'Export entry escapes the approved directory.', operation: 'export:write', recoverable: true })
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, entry.bytes)
      total += entry.bytes.length
      files.push(entry.relativePath)
    }
    return { location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, filesWritten: files, bytesWritten: total } satisfies WrittenExport
  }))
  ipcMain.handle(CHANNELS.choosePackFile, (event, modeValue) => result('dialog:pack-file', async () => {
    const mode = parseFileMode(modeValue)
    if (mode === 'open') {
      const selection = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Sprite Pack', extensions: ['spritepack'] }] })
      return selection.canceled || !selection.filePaths[0] ? null : issuePackGrant(selection.filePaths[0], 'read-pack', event.sender.id)
    }
    const selection = await dialog.showSaveDialog({ filters: [{ name: 'Sprite Pack', extensions: ['spritepack'] }] })
    return selection.canceled || !selection.filePath ? null : issuePackGrant(selection.filePath, 'write-pack', event.sender.id)
  }))
  ipcMain.handle(CHANNELS.readPack, (event, sourceGrantId) => result('pack:read', async () => {
    const grant = requirePackGrant(sourceGrantId, 'read-pack', event.sender.id)
    const bytes = await readRegularPackFile(grant.absolutePath)
    const pack = await readSpritePackOffThread(bytes)
    return { location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, bytes: pack.bytes, packageSha256: pack.packageSha256 } satisfies ReadPackBytes
  }))
  ipcMain.handle(CHANNELS.listInstalledPacks, () => result('pack:list', async () => {
    const index = await readPackIndex()
    for (const record of index.versions) {
      const bytes = await readRegularPackFile(packagePath(record.packageSha256))
      const pack = await readSpritePackOffThread(bytes)
      if (pack.packageSha256 !== record.packageSha256 || pack.packDocumentSha256 !== record.packDocumentSha256 || pack.pack.id !== record.packId || pack.pack.version !== record.version) throw new ProductError({ code: 'pack-invalid', message: `Installed package ${record.packId} ${record.version} failed index parity.`, operation: 'pack:list', recoverable: true })
    }
    return Promise.all(index.versions.map(record => summarizePackRecord(record, index.revision)))
  }))
  ipcMain.handle(CHANNELS.installPack, (event, requestValue) => result('pack:install', async () => {
    const request = parseInstallPackRequest(requestValue)
    const bytes = request.sourceGrantId
      ? await readRegularPackFile(requirePackGrant(request.sourceGrantId, 'read-pack', event.sender.id).absolutePath)
      : Uint8Array.from(request.bytes!)
    const pack = await readSpritePackOffThread(bytes)
    const index = await readPackIndex()
    if (index.revision !== request.expectedIndexRevision) throw new ProductError({ code: 'revision-conflict', message: 'The installed pack index has a newer revision.', operation: 'pack:install', recoverable: true, details: { expectedRevision: request.expectedIndexRevision, actualRevision: index.revision } })
    const exact = index.versions.find(record => record.packId === pack.pack.id && record.version === pack.pack.version && record.packageSha256 === pack.packageSha256)
    const collision = index.versions.find(record => record.packId === pack.pack.id && record.version === pack.pack.version && record.packageSha256 !== pack.packageSha256)
    if (collision) throw new ProductError({ code: 'pack-conflict', message: 'This pack ID and version is already installed with different bytes.', operation: 'pack:install', recoverable: true })
    if (exact && exact.enabled === request.enabled) return summarizePackRecord(exact, index.revision)
    const record: PackIndexRecord = exact ? { ...exact, enabled: request.enabled } : {
      packId: pack.pack.id,
      version: pack.pack.version,
      name: pack.pack.name,
      packageSha256: pack.packageSha256,
      packDocumentSha256: pack.packDocumentSha256,
      origin: request.origin ?? 'installed-local',
      enabled: request.enabled,
      installedAt: new Date().toISOString(),
      packageBytes: pack.bytes.length,
    }
    const packageDestination = packagePath(pack.packageSha256)
    let packageCreated = false
    if (!exact) {
      try { await stat(packageDestination) } catch { await writeAtomicFile(packageDestination, pack.bytes); packageCreated = true }
      const readBack = await readSpritePackOffThread(await readRegularPackFile(packageDestination))
      if (readBack.packageSha256 !== pack.packageSha256) throw new ProductError({ code: 'io-failed', message: 'Installed package failed read-back.', operation: 'pack:install', recoverable: true })
    }
    const next: PackIndex = { schemaVersion: 1, revision: index.revision + 1, versions: [...index.versions.filter(item => item !== exact), record].sort((left, right) => `${left.packId}@${left.version}#${left.packageSha256}`.localeCompare(`${right.packId}@${right.version}#${right.packageSha256}`)) }
    try {
      await writePackIndex(next)
    } catch (error) {
      if (packageCreated) await rm(packageDestination, { force: true })
      await writePackIndex(index).catch(() => undefined)
      throw error
    }
    return summarizePackRecord(record, next.revision)
  }))
  ipcMain.handle(CHANNELS.removePack, (_event, requestValue) => result('pack:remove', async () => {
    const request = parseRemovePackRequest(requestValue)
    const index = await readPackIndex()
    if (index.revision !== request.expectedIndexRevision) throw new ProductError({ code: 'revision-conflict', message: 'The installed pack index has a newer revision.', operation: 'pack:remove', recoverable: true, details: { expectedRevision: request.expectedIndexRevision, actualRevision: index.revision } })
    const record = index.versions.find(item => item.packId === request.packId && item.version === request.version && item.packageSha256 === request.packageSha256)
    if (!record) return
    const dependencyCount = await packDependencyCount(record.packId, record.version, record.packDocumentSha256)
    if (dependencyToken(record, index.revision, dependencyCount) !== request.dependencySummaryToken) throw new ProductError({ code: 'revision-conflict', message: 'Pack dependencies changed before removal.', operation: 'pack:remove', recoverable: true })
    if (dependencyCount > 0) throw new ProductError({ code: 'pack-in-use', message: 'Pack version is used by a recent local project.', operation: 'pack:remove', recoverable: true, details: { dependentProjects: dependencyCount } })
    const destination = packagePath(record.packageSha256)
    const tombstone = `${destination}.sprite-remove-${randomUUID()}`
    await rename(destination, tombstone)
    const next: PackIndex = { schemaVersion: 1, revision: index.revision + 1, versions: index.versions.filter(item => item !== record) }
    try {
      await writePackIndex(next)
      await rm(tombstone, { force: true })
    } catch (error) {
      await rename(tombstone, destination).catch(() => undefined)
      await writePackIndex(index).catch(() => undefined)
      throw error
    }
  }))
  ipcMain.handle(CHANNELS.writePack, (event, requestValue) => result('pack:write', async () => {
    const request = parseWritePackRequest(requestValue)
    const grant = requirePackGrant(request.destinationGrantId, 'write-pack', event.sender.id)
    const pack = await readSpritePackOffThread(request.bytes)
    if (pack.packageSha256 !== request.expectedPackageSha256) throw new ProductError({ code: 'pack-invalid', message: 'Pack payload checksum does not match the requested identity.', operation: 'pack:write', recoverable: true })
    await writeAtomicFile(grant.absolutePath, pack.bytes)
    const readBack = await readSpritePackOffThread(await readRegularPackFile(grant.absolutePath))
    if (readBack.packageSha256 !== pack.packageSha256) throw new ProductError({ code: 'io-failed', message: 'Written pack failed read-back.', operation: 'pack:write', recoverable: true })
    return { location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, bytesWritten: pack.bytes.length, packageSha256: pack.packageSha256 } satisfies WrittenPack
  }))
}

function createWindow(): void {
  if (mainWindow) return
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
  const titleBarOverlay = () => nativeTheme.shouldUseDarkColors
    ? { color: '#343231', symbolColor: '#dedede', height: 44 }
    : { color: '#fcfbf8', symbolColor: '#242424', height: 44 }
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 820,
    minHeight: 640,
    show: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(),
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  const syncTitleBarTheme = () => window.setTitleBarOverlay(titleBarOverlay())
  nativeTheme.on('updated', syncTitleBarTheme)
  window.webContents.setWindowOpenHandler(details => {
    if (details.url.startsWith('https://')) void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  let closeApproved = false
  window.on('close', event => {
    if (closeApproved) return
    event.preventDefault()
    void window.webContents.executeJavaScript("document.body.dataset.spriteCloseApproved === 'true'").then(approved => {
      if (approved) {
        closeApproved = true
        window.close()
      } else {
        return window.webContents.executeJavaScript("window.dispatchEvent(new Event('sprite-host-close-requested'))")
      }
    })
  })
  window.on('closed', () => {
    nativeTheme.off('updated', syncTitleBarTheme)
    mainWindow = null
  })
  mainWindow = window
  void window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html')).then(() => {
    window.webContents.on('will-navigate', event => event.preventDefault())
  }).catch(error => console.error('Renderer load failed.', error))
}

void app.whenReady().then(() => {
  registerHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => app.quit())