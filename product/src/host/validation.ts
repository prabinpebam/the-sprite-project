import { z } from 'zod'
import type { InstallPackRequest, RemovePackRequest, SaveProjectRequest, WriteArchiveRequest, WriteExportRequest, WritePackRequest } from './bridge'

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
  embeddedPackageBytes: z.array(z.instanceof(Uint8Array).refine(bytes => bytes.length <= 64 * 1024 * 1024)).max(16).optional(),
}).strict()

const archiveRequestSchema = z.object({ destinationGrantId: grantId, graph: z.unknown(), embeddedPackageBytes: z.array(z.instanceof(Uint8Array).refine(bytes => bytes.length <= 64 * 1024 * 1024)).max(16).optional() }).strict()
const exportRequestSchema = z.object({
  destinationGrantId: grantId,
  entries: z.array(z.object({ relativePath: z.string(), bytes: z.instanceof(Uint8Array) }).strict()).max(128),
}).strict()
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const installPackRequestSchema = z.object({ sourceGrantId: grantId.optional(), bytes: z.instanceof(Uint8Array).refine(value => value.length <= 64 * 1024 * 1024).optional(), enabled: z.boolean(), expectedIndexRevision: z.number().int().nonnegative(), origin: z.enum(['installed-local', 'authored-local']).optional() }).strict().refine(value => Boolean(value.sourceGrantId) !== Boolean(value.bytes), { message: 'Provide exactly one pack source.' })
const removePackRequestSchema = z.object({ packId: z.string().min(1), version: z.string().min(1), packageSha256: sha256, expectedIndexRevision: z.number().int().nonnegative(), dependencySummaryToken: sha256 }).strict()
const writePackRequestSchema = z.object({ destinationGrantId: grantId, bytes: z.instanceof(Uint8Array).refine(bytes => bytes.length <= 64 * 1024 * 1024), expectedPackageSha256: sha256 }).strict()

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

export function parseInstallPackRequest(value: unknown): InstallPackRequest {
  return installPackRequestSchema.parse(value) as InstallPackRequest
}

export function parseRemovePackRequest(value: unknown): RemovePackRequest {
  return removePackRequestSchema.parse(value) as RemovePackRequest
}

export function parseWritePackRequest(value: unknown): WritePackRequest {
  return writePackRequestSchema.parse(value) as WritePackRequest
}