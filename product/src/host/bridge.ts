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
  kind: 'project-folder' | 'project-file' | 'export-directory'
}

export interface ProjectFingerprint {
  manifestSha256: string
  entries: Record<string, string>
}

export interface OpenedProject {
  graph: ProjectGraphV2
  location: ApprovedLocation
  fingerprint: ProjectFingerprint
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
}

export interface WriteArchiveRequest {
  destinationGrantId: string
  graph: ProjectGraphV2
}

export interface WriteExportRequest {
  destinationGrantId: string
  entries: { relativePath: string; bytes: Uint8Array }[]
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
}