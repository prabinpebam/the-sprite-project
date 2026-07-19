import { z } from 'zod'
import type { SaveProjectRequest, WriteArchiveRequest, WriteExportRequest } from './bridge'

const grantId = z.string().uuid()
const fingerprintSchema = z.object({
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
}).strict()

const saveRequestSchema = z.object({
  destinationGrantId: grantId,
  graph: z.unknown(),
  expectedFingerprint: fingerprintSchema.nullable(),
  overwriteExternal: z.boolean().optional(),
}).strict()

const archiveRequestSchema = z.object({ destinationGrantId: grantId, graph: z.unknown() }).strict()
const exportRequestSchema = z.object({
  destinationGrantId: grantId,
  entries: z.array(z.object({ relativePath: z.string(), bytes: z.instanceof(Uint8Array) }).strict()).max(128),
}).strict()

export function parseSaveProjectRequest(value: unknown): SaveProjectRequest {
  return saveRequestSchema.parse(value) as SaveProjectRequest
}

export function parseWriteArchiveRequest(value: unknown): WriteArchiveRequest {
  return archiveRequestSchema.parse(value) as WriteArchiveRequest
}

export function parseWriteExportRequest(value: unknown): WriteExportRequest {
  return exportRequestSchema.parse(value) as WriteExportRequest
}

export function parseGrantId(value: unknown): string {
  return grantId.parse(value)
}

export function parseFolderMode(value: unknown): 'create' | 'open' | 'save-as' {
  return z.enum(['create', 'open', 'save-as']).parse(value)
}

export function parseFileMode(value: unknown): 'open' | 'save' {
  return z.enum(['open', 'save']).parse(value)
}