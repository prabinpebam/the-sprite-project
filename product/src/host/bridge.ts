import type { HostResult } from '../domain/errors'
import type { ProjectGraphV2 } from '../domain/types'

export interface HostInfo {
  host: 'electron'
  version: string
  platform: string
  architecture: string
  portable: boolean
}

export interface ApprovedLocation {
  grantId: string
  displayPath: string
  kind: 'project-folder' | 'project-file' | 'export-directory' | 'pack-file'
}

export interface ProjectFingerprint {
  manifestSha256: string
  entries: Record<string, string>
}

export interface OpenedProject {
  graph: ProjectGraphV2
  location: ApprovedLocation
  fingerprint: ProjectFingerprint
  embeddedPackageBytes: Uint8Array[]
}

export interface SavedProject {
  location: ApprovedLocation
  fingerprint: ProjectFingerprint
}

export interface RecentProject {
  recentId: string
  displayPath: string
  lastOpenedAt: string
  available: boolean
}

export interface ArchiveSummary {
  projectId: string
  projectName: string
  archiveFormatVersion: number
  projectSchemaVersion: number
  entryCount: number
  expandedBytes: number
}

export interface WrittenArchive {
  location: ApprovedLocation
  bytesWritten: number
}

export interface WrittenExport {
  location: ApprovedLocation
  filesWritten: string[]
  bytesWritten: number
}

export interface SaveProjectRequest {
  destinationGrantId: string
  graph: ProjectGraphV2
  expectedFingerprint: ProjectFingerprint | null
  overwriteExternal?: boolean
  embeddedPackageBytes?: Uint8Array[]
}

export interface WriteArchiveRequest {
  destinationGrantId: string
  graph: ProjectGraphV2
  embeddedPackageBytes?: Uint8Array[]
}

export interface WriteExportRequest {
  destinationGrantId: string
  entries: { relativePath: string; bytes: Uint8Array }[]
}

export interface ReadPackBytes {
  location: ApprovedLocation
  bytes: Uint8Array
  packageSha256: string
}

export interface InstalledPackSummary {
  packId: string
  version: string
  name: string
  packageSha256: string
  packDocumentSha256: string
  origin: 'installed-local' | 'authored-local'
  enabled: boolean
  installedAt: string
  packageBytes: Uint8Array
  packageSize: number
  indexRevision: number
  dependencyCount: number
  dependencySummaryToken: string
}

export interface InstallPackRequest {
  sourceGrantId?: string
  bytes?: Uint8Array
  enabled: boolean
  expectedIndexRevision: number
  origin?: 'installed-local' | 'authored-local'
}

export interface RemovePackRequest {
  packId: string
  version: string
  packageSha256: string
  expectedIndexRevision: number
  dependencySummaryToken: string
}

export interface WritePackRequest {
  destinationGrantId: string
  bytes: Uint8Array
  expectedPackageSha256: string
}

export interface WrittenPack {
  location: ApprovedLocation
  bytesWritten: number
  packageSha256: string
}

export interface SpriteHostBridge {
  getHostInfo(): Promise<HostResult<HostInfo>>
  listRecentProjects(): Promise<HostResult<RecentProject[]>>
  openRecentProject(recentId: string): Promise<HostResult<OpenedProject>>
  forgetRecentProject(recentId: string): Promise<HostResult<void>>
  chooseProjectFolder(mode: 'create' | 'open' | 'save-as'): Promise<HostResult<ApprovedLocation | null>>
  chooseProjectFile(mode: 'open' | 'save'): Promise<HostResult<ApprovedLocation | null>>
  chooseExportDirectory(): Promise<HostResult<ApprovedLocation | null>>
  readProject(sourceGrantId: string): Promise<HostResult<OpenedProject>>
  saveProject(request: SaveProjectRequest): Promise<HostResult<SavedProject>>
  inspectArchive(sourceGrantId: string): Promise<HostResult<ArchiveSummary>>
  writeArchive(request: WriteArchiveRequest): Promise<HostResult<WrittenArchive>>
  writeExport(request: WriteExportRequest): Promise<HostResult<WrittenExport>>
  choosePackFile(mode: 'open' | 'save'): Promise<HostResult<ApprovedLocation | null>>
  readPack(sourceGrantId: string): Promise<HostResult<ReadPackBytes>>
  listInstalledPacks(): Promise<HostResult<InstalledPackSummary[]>>
  installPack(request: InstallPackRequest): Promise<HostResult<InstalledPackSummary>>
  removePack(request: RemovePackRequest): Promise<HostResult<void>>
  writePack(request: WritePackRequest): Promise<HostResult<WrittenPack>>
}