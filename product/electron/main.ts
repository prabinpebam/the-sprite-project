import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'
import { readProjectArchive, validateArchivePath, writeProjectArchive } from '../src/domain/archive'
import { ProductError, type HostError, type HostResult } from '../src/domain/errors'
import { parseProjectGraphV2 } from '../src/domain/schemas'
import type { ProjectGraphV2 } from '../src/domain/types'
import type {
  ApprovedLocation, ArchiveSummary, OpenedProject, ProjectFingerprint, RecentProject,
  SavedProject, WrittenArchive, WrittenExport,
} from '../src/host/bridge'
import { parseFileMode, parseFolderMode, parseGrantId, parseSaveProjectRequest, parseWriteArchiveRequest, parseWriteExportRequest } from '../src/host/validation'
import { CHANNELS } from './channels'

interface Grant extends ApprovedLocation {
  absolutePath: string
  scopes: Set<'read-project' | 'write-project' | 'read-archive' | 'write-archive' | 'write-export'>
}

interface RecentRecord {
  recentId: string
  displayPath: string
  lastOpenedAt: string
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
  return { graph: opened.graph, location: { grantId: grant.grantId, displayPath: grant.displayPath, kind: grant.kind }, fingerprint: await fingerprintFromEntries(opened.entries) }
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

async function writeFolder(destination: string, graph: ProjectGraphV2, expected: ProjectFingerprint | null, overwriteExternal: boolean): Promise<ProjectFingerprint> {
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

  const entries = unzipSync(await writeProjectArchive(graph, `sprite-project/${app.getVersion()}`))
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
    if (grant.kind === 'project-folder') fingerprint = await writeFolder(grant.absolutePath, graph, request.expectedFingerprint, Boolean(request.overwriteExternal))
    else {
      const bytes = await writeProjectArchive(graph, `sprite-project/${app.getVersion()}`)
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
    const bytes = await writeProjectArchive(parseProjectGraphV2(request.graph), `sprite-project/${app.getVersion()}`)
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
}

function createWindow(): void {
  if (mainWindow) return
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 820,
    minHeight: 640,
    show: true,
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
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
  window.on('closed', () => { mainWindow = null })
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