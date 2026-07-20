import { strToU8, unzipSync, zipSync } from 'fflate'
import { z } from 'zod'
import { canonicalJsonBytes } from './canonical'
import { ProductError } from './errors'
import { parseContentPackV2, parsePackProvenance } from './pack-schemas'
import { sha256Hex } from './sha256'
import { analyzeHumanoidSheetPng } from './png-profile'
import type { ContentPackV2, PackProvenanceV1 } from './pack-types'

export const SPRITEPACK_LIMITS = {
  compressedBytes: 64 * 1024 * 1024,
  entries: 256,
  textEntryBytes: 4 * 1024 * 1024,
  pngEntryBytes: 16 * 1024 * 1024,
  expandedBytes: 128 * 1024 * 1024,
  compressionRatio: 100,
  pathBytes: 180,
  assets: 128,
} as const

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/)
const entrySchema = z.object({
  path: z.string().min(1),
  mediaType: z.enum(['application/json', 'image/png', 'text/plain; charset=utf-8']),
  size: z.number().int().nonnegative(),
  sha256: sha256Schema,
}).strict()
const manifestSchema = z.object({
  packFormatVersion: z.literal(1),
  packSchemaVersion: z.literal(2),
  packId: z.string().min(1),
  packVersion: z.string().min(1),
  packageSha256: z.null(),
  createdWith: z.string().min(1),
  entries: z.array(entrySchema).min(3).max(255),
}).strict()

export interface SpritePackManifestV1 extends z.infer<typeof manifestSchema> {}

export interface SpritePackContents {
  pack: ContentPackV2
  provenance: Record<string, PackProvenanceV1>
  pngs: Record<string, Uint8Array>
}

export interface ReadSpritePackResult extends SpritePackContents {
  manifest: SpritePackManifestV1
  packageSha256: string
  packDocumentSha256: string
  bytes: Uint8Array
}

export type PackValidationStage = 'container' | 'extract' | 'manifest' | 'checksums' | 'schema' | 'images' | 'complete'

const FIXED_ZIP_TIME = new Date('1980-01-01T00:00:00.000Z')
const MANIFEST_PATH = 'pack-manifest.json'

function packError(code: 'pack-invalid' | 'pack-limit' | 'unsupported-version' | 'unsupported-license' | 'provenance-invalid' | 'image-invalid' | 'image-profile-invalid' | 'color-binding-invalid' | 'coverage-incomplete', message: string, operation: string, details?: Record<string, string | number | boolean>): ProductError {
  return new ProductError({ code, message, operation, recoverable: true, ...(details ? { details } : {}) })
}

function compareUtf8(left: string, right: string): number {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const length = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < length; index += 1) if (leftBytes[index] !== rightBytes[index]) return leftBytes[index] - rightBytes[index]
  return leftBytes.length - rightBytes.length
}

export function validateSpritePackPath(value: string): void {
  const segments = value.split('/')
  const encodedLength = new TextEncoder().encode(value).length
  if (!value || value !== value.normalize('NFC') || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/.test(value) || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw packError('pack-invalid', `Pack path is not canonical: ${value || '(empty)'}.`, 'pack:path', { path: value || '(empty)' })
  }
  if (segments.length > 3 || encodedLength > SPRITEPACK_LIMITS.pathBytes) throw packError('pack-limit', `Pack path exceeds the format boundary: ${value}.`, 'pack:path', { observed: encodedLength, allowed: SPRITEPACK_LIMITS.pathBytes })
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimum = Math.max(0, bytes.length - 65_557)
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) return offset
  }
  throw packError('pack-invalid', 'ZIP end-of-central-directory record is missing.', 'pack:container')
}

function inspectSpritePackContainer(bytes: Uint8Array): void {
  if (bytes.length > SPRITEPACK_LIMITS.compressedBytes) throw packError('pack-limit', 'Pack exceeds the compressed size limit.', 'pack:container', { observed: bytes.length, allowed: SPRITEPACK_LIMITS.compressedBytes })
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endOffset = findEndOfCentralDirectory(bytes)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralSize = view.getUint32(endOffset + 12, true)
  let offset = view.getUint32(endOffset + 16, true)
  if (entryCount === 0xffff || centralSize === 0xffffffff || offset === 0xffffffff) throw packError('pack-limit', 'ZIP64 packs are outside format version 1 limits.', 'pack:container')
  if (entryCount > SPRITEPACK_LIMITS.entries) throw packError('pack-limit', 'Pack contains too many entries.', 'pack:container', { observed: entryCount, allowed: SPRITEPACK_LIMITS.entries })
  if (offset + centralSize > endOffset) throw packError('pack-invalid', 'ZIP central directory is out of bounds.', 'pack:container')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const foldedPaths = new Set<string>()
  let expandedTotal = 0
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw packError('pack-invalid', 'ZIP central directory entry is malformed.', 'pack:container')
    const madeBy = view.getUint16(offset + 4, true)
    const flags = view.getUint16(offset + 8, true)
    const compression = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const expandedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const externalAttributes = view.getUint32(offset + 38, true)
    const nameStart = offset + 46
    const nextOffset = nameStart + nameLength + extraLength + commentLength
    if (nextOffset > endOffset) throw packError('pack-invalid', 'ZIP entry metadata is out of bounds.', 'pack:container')
    let entryPath: string
    try {
      entryPath = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength))
    } catch {
      throw packError('pack-invalid', 'ZIP entry path is not valid UTF-8.', 'pack:path')
    }
    validateSpritePackPath(entryPath)
    const folded = entryPath.toLowerCase()
    if (foldedPaths.has(folded)) throw packError('pack-invalid', `Pack contains a case-folded duplicate path: ${entryPath}.`, 'pack:path')
    foldedPaths.add(folded)
    if ((flags & 0x1) !== 0) throw packError('pack-invalid', `Encrypted pack entry is not supported: ${entryPath}.`, 'pack:container')
    if (compression !== 0 && compression !== 8) throw packError('pack-invalid', `Unsupported ZIP compression for ${entryPath}.`, 'pack:container')
    const platform = madeBy >> 8
    const unixType = (externalAttributes >>> 16) & 0o170000
    if (platform === 3 && unixType === 0o120000) throw packError('pack-invalid', `Symbolic links are not supported: ${entryPath}.`, 'pack:path')
    const entryLimit = entryPath.endsWith('.png') ? SPRITEPACK_LIMITS.pngEntryBytes : SPRITEPACK_LIMITS.textEntryBytes
    if (expandedSize > entryLimit) throw packError('pack-limit', `Pack entry exceeds its limit: ${entryPath}.`, 'pack:size', { observed: expandedSize, allowed: entryLimit })
    if (expandedSize / Math.max(compressedSize, 1) > SPRITEPACK_LIMITS.compressionRatio) throw packError('pack-limit', `Pack entry exceeds the compression-ratio limit: ${entryPath}.`, 'pack:size')
    expandedTotal += expandedSize
    if (expandedTotal > SPRITEPACK_LIMITS.expandedBytes) throw packError('pack-limit', 'Pack expanded size exceeds the limit.', 'pack:size', { observed: expandedTotal, allowed: SPRITEPACK_LIMITS.expandedBytes })
    offset = nextOffset
  }
}

function mediaType(path: string): 'application/json' | 'image/png' | 'text/plain; charset=utf-8' {
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.png')) return 'image/png'
  return 'text/plain; charset=utf-8'
}

function orderedPaths(contents: SpritePackContents): string[] {
  return [
    'pack.json',
    ...Object.keys(contents.pngs).sort(compareUtf8).map(hash => `assets/${hash}.png`),
    ...Object.keys(contents.provenance).sort(compareUtf8).map(id => `provenance/${id}.json`),
    'README.txt',
  ]
}

function validateGraph(contents: SpritePackContents): void {
  const pack = parseContentPackV2(contents.pack)
  if (pack.assets.length > SPRITEPACK_LIMITS.assets) throw packError('pack-limit', 'Pack contains too many assets.', 'pack:graph', { observed: pack.assets.length, allowed: SPRITEPACK_LIMITS.assets })
  const analyses = new Map<string, ReturnType<typeof analyzeHumanoidSheetPng>>()
  for (const asset of pack.assets) {
    if (asset.source.kind !== 'sheet-v1') throw packError('pack-invalid', `Distributed pack asset ${asset.id} must use sheet-v1.`, 'pack:graph', { assetId: asset.id })
    const bytes = contents.pngs[asset.source.pngSha256]
    if (!bytes || asset.source.sheetPath !== `assets/${asset.source.pngSha256}.png`) throw packError('pack-invalid', `Asset ${asset.id} references a missing PNG.`, 'pack:graph', { assetId: asset.id })
    let analysis = analyses.get(asset.source.pngSha256)
    if (!analysis) {
      analysis = analyzeHumanoidSheetPng(bytes)
      analyses.set(asset.source.pngSha256, analysis)
    }
    if (analysis.emptyCells.length) throw packError('coverage-incomplete', `Asset ${asset.id} has empty required cells: ${analysis.emptyCells.join(', ')}.`, 'pack:coverage', { assetId: asset.id })
    const mappedColors = Object.keys(asset.source.sourceColorBindings).sort()
    const opaqueColors = analysis.opaqueColors.map(color => color.hex).sort()
    if (mappedColors.length !== opaqueColors.length || mappedColors.some((color, index) => color !== opaqueColors[index])) throw packError('color-binding-invalid', `Asset ${asset.id} must map every non-transparent source color exactly once.`, 'pack:mapping', { assetId: asset.id, observed: mappedColors.length, allowed: opaqueColors.length })
    const provenance = contents.provenance[asset.provenanceId]
    if (!provenance) throw packError('pack-invalid', `Asset ${asset.id} references missing provenance.`, 'pack:graph', { assetId: asset.id })
    try {
      parsePackProvenance(provenance)
    } catch (error) {
      throw packError('unsupported-license', error instanceof Error ? error.message : 'Provenance is invalid.', 'pack:provenance', { assetId: asset.id })
    }
  }
}

export async function writeSpritePack(contentsValue: SpritePackContents, createdWith = 'sprite-project/0.1.0'): Promise<Uint8Array> {
  if (Array.isArray(contentsValue.pack?.assets) && contentsValue.pack.assets.length > SPRITEPACK_LIMITS.assets) throw packError('pack-limit', 'Pack contains too many assets.', 'pack:graph', { observed: contentsValue.pack.assets.length, allowed: SPRITEPACK_LIMITS.assets })
  const contents: SpritePackContents = {
    pack: parseContentPackV2(contentsValue.pack),
    provenance: Object.fromEntries(Object.entries(contentsValue.provenance).map(([id, value]) => [id, parsePackProvenance(value)])),
    pngs: contentsValue.pngs,
  }
  validateGraph(contents)
  const payload: Record<string, Uint8Array> = {
    'pack.json': canonicalJsonBytes(contents.pack),
    'README.txt': strToU8(`${contents.pack.name}\n\nData-only humanoid content pack for The Sprite Project.\n`),
  }
  for (const [hash, bytes] of Object.entries(contents.pngs)) {
    if (await sha256Hex(bytes) !== hash) throw packError('pack-invalid', `PNG checksum does not match its content-addressed path: ${hash}.`, 'pack:checksum')
    payload[`assets/${hash}.png`] = bytes
  }
  for (const [id, provenance] of Object.entries(contents.provenance)) payload[`provenance/${id}.json`] = canonicalJsonBytes(provenance)
  const entries = []
  for (const path of orderedPaths(contents)) {
    validateSpritePackPath(path)
    const bytes = payload[path]
    entries.push({ path, mediaType: mediaType(path), size: bytes.length, sha256: await sha256Hex(bytes) })
  }
  const manifest: SpritePackManifestV1 = {
    packFormatVersion: 1,
    packSchemaVersion: 2,
    packId: contents.pack.id,
    packVersion: contents.pack.version,
    packageSha256: null,
    createdWith,
    entries,
  }
  manifestSchema.parse(manifest)
  const zipEntries: Record<string, [Uint8Array, { level: 6; mtime: Date }]> = {
    [MANIFEST_PATH]: [canonicalJsonBytes(manifest), { level: 6, mtime: FIXED_ZIP_TIME }],
  }
  for (const entry of entries) zipEntries[entry.path] = [payload[entry.path], { level: 6, mtime: FIXED_ZIP_TIME }]
  return zipSync(zipEntries)
}

export async function readSpritePack(bytes: Uint8Array, onProgress?: (stage: PackValidationStage) => void): Promise<ReadSpritePackResult> {
  onProgress?.('container')
  inspectSpritePackContainer(bytes)
  onProgress?.('extract')
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch (error) {
    throw packError('pack-invalid', error instanceof Error ? error.message : 'Pack ZIP cannot be read.', 'pack:container')
  }
  const paths = Object.keys(files)
  if (paths.length > SPRITEPACK_LIMITS.entries) throw packError('pack-limit', 'Pack contains too many entries.', 'pack:container', { observed: paths.length, allowed: SPRITEPACK_LIMITS.entries })
  const folded = new Set<string>()
  let expanded = 0
  for (const path of paths) {
    validateSpritePackPath(path)
    const lower = path.toLowerCase()
    if (folded.has(lower)) throw packError('pack-invalid', `Pack contains a duplicate path: ${path}.`, 'pack:path')
    folded.add(lower)
    const entryLimit = path.endsWith('.png') ? SPRITEPACK_LIMITS.pngEntryBytes : SPRITEPACK_LIMITS.textEntryBytes
    if (files[path].length > entryLimit) throw packError('pack-limit', `Pack entry exceeds its limit: ${path}.`, 'pack:size', { observed: files[path].length, allowed: entryLimit })
    expanded += files[path].length
  }
  if (expanded > SPRITEPACK_LIMITS.expandedBytes) throw packError('pack-limit', 'Pack expanded size exceeds the limit.', 'pack:size', { observed: expanded, allowed: SPRITEPACK_LIMITS.expandedBytes })
  const manifestBytes = files[MANIFEST_PATH]
  if (!manifestBytes) throw packError('pack-invalid', 'pack-manifest.json is missing.', 'pack:manifest')
  onProgress?.('manifest')
  let manifestValue: unknown
  try {
    manifestValue = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
  } catch {
    throw packError('pack-invalid', 'Pack manifest is not valid UTF-8 JSON.', 'pack:manifest')
  }
  if (typeof manifestValue === 'object' && manifestValue && 'packFormatVersion' in manifestValue && (manifestValue as { packFormatVersion: unknown }).packFormatVersion !== 1) throw packError('unsupported-version', 'Pack format version is unsupported.', 'pack:manifest')
  let manifest: SpritePackManifestV1
  try {
    manifest = manifestSchema.parse(manifestValue)
  } catch (error) {
    throw packError('pack-invalid', error instanceof Error ? error.message : 'Pack manifest is invalid.', 'pack:manifest')
  }
  const listed = new Set(manifest.entries.map(entry => entry.path))
  const payloadPaths = paths.filter(path => path !== MANIFEST_PATH)
  if (listed.size !== manifest.entries.length || payloadPaths.length !== listed.size || payloadPaths.some(path => !listed.has(path))) throw packError('pack-invalid', 'Pack contains missing, duplicate, or unlisted entries.', 'pack:manifest')
  onProgress?.('checksums')
  for (const entry of manifest.entries) {
    const content = files[entry.path]
    if (!content || content.length !== entry.size || await sha256Hex(content) !== entry.sha256) throw packError('pack-invalid', `Pack entry checksum or size mismatch: ${entry.path}.`, 'pack:checksum', { path: entry.path })
  }
  const parseJson = (path: string): unknown => {
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(files[path]))
    } catch {
      throw packError('pack-invalid', `Pack JSON is invalid: ${path}.`, 'pack:schema', { path })
    }
  }
  const packValue = parseJson('pack.json')
  if (packValue && typeof packValue === 'object' && 'assets' in packValue && Array.isArray((packValue as { assets: unknown }).assets) && (packValue as { assets: unknown[] }).assets.length > SPRITEPACK_LIMITS.assets) throw packError('pack-limit', 'Pack contains too many assets.', 'pack:graph', { observed: (packValue as { assets: unknown[] }).assets.length, allowed: SPRITEPACK_LIMITS.assets })
  onProgress?.('schema')
  let pack: ContentPackV2
  try {
    pack = parseContentPackV2(packValue)
  } catch (error) {
    throw packError('pack-invalid', error instanceof Error ? error.message : 'pack.json is invalid.', 'pack:schema')
  }
  if (manifest.packId !== pack.id || manifest.packVersion !== pack.version) throw packError('pack-invalid', 'Manifest identity does not match pack.json.', 'pack:graph')
  const provenance: Record<string, PackProvenanceV1> = {}
  const pngs: Record<string, Uint8Array> = {}
  for (const entry of manifest.entries) {
    const provenanceMatch = /^provenance\/(.+)\.json$/.exec(entry.path)
    const pngMatch = /^assets\/([a-f0-9]{64})\.png$/.exec(entry.path)
    if (provenanceMatch) {
      try {
        const record = parsePackProvenance(parseJson(entry.path))
        if (record.id !== provenanceMatch[1]) throw new Error('Provenance ID does not match its path.')
        provenance[record.id] = record
      } catch (error) {
        throw packError('provenance-invalid', error instanceof Error ? error.message : 'Provenance is invalid.', 'pack:provenance')
      }
    } else if (pngMatch) pngs[pngMatch[1]] = files[entry.path]
  }
  const contents = { pack, provenance, pngs }
  onProgress?.('images')
  validateGraph(contents)
  const result = {
    ...contents,
    manifest,
    packageSha256: await sha256Hex(bytes),
    packDocumentSha256: await sha256Hex(files['pack.json']),
    bytes,
  }
  onProgress?.('complete')
  return result
}