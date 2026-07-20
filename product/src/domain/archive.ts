import { strToU8, unzipSync, zipSync } from 'fflate'
import { canonicalJsonBytes } from './canonical'
import { ProductError } from './errors'
import { creditsFor } from './project'
import { packLockForPack } from './pack-locks'
import { packByLock, PACKS } from './packs'
import { runtimePackFromInstalled } from './pack-runtime'
import { archiveManifestSchema, archiveManifestV2Schema, packLockDocumentSchema, parseProjectGraphV2, parseProjectV2, recipeV1Schema } from './schemas'
import { sha256Hex } from './sha256'
import { readSpritePack, type ReadSpritePackResult } from './spritepack'
import type { ContentPack, ProjectGraphV2, SpriteProject } from './types'

export const ARCHIVE_LIMITS = {
  compressedBytes: 128 * 1024 * 1024,
  entries: 512,
  textEntryBytes: 8 * 1024 * 1024,
  binaryEntryBytes: 64 * 1024 * 1024,
  expandedBytes: 256 * 1024 * 1024,
  compressionRatio: 100,
  pathBytes: 240,
  pathSegments: 8,
} as const

export interface ArchiveManifestEntry {
  path: string
  mediaType: string
  size: number
  sha256: string
}

export interface ArchiveManifest {
  archiveFormatVersion: 1 | 2
  projectSchemaVersion: 2
  packLockVersion: 1
  projectId: string
  createdWith: string
  embeddedPacks?: EmbeddedPackManifestEntry[]
  entries: ArchiveManifestEntry[]
}

export interface EmbeddedPackManifestEntry {
  packId: string
  version: string
  packageSha256: string
  path: string
  size: number
}

export interface ReadArchiveResult {
  graph: ProjectGraphV2
  manifest: ArchiveManifest
  entries: Record<string, Uint8Array>
  embeddedPacks: ReadSpritePackResult[]
}

const MANIFEST_PATH = 'archive-manifest.json'
const ROOT_ORDER = ['project.json', 'packs.lock.json']
const FIXED_ZIP_TIME = new Date('1980-01-01T00:00:00.000Z')

function archiveError(code: 'archive-invalid' | 'archive-limit' | 'unsupported-version' | 'missing-pack' | 'pack-invalid', message: string, details?: Record<string, string | number | boolean>): ProductError {
  return new ProductError({ code, message, operation: 'archive:read', recoverable: true, ...(details ? { details } : {}) })
}

function utf8Compare(left: string, right: string): number {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const count = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < count; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) return leftBytes[index] - rightBytes[index]
  }
  return leftBytes.length - rightBytes.length
}

export function validateArchivePath(path: string): void {
  const encoded = new TextEncoder().encode(path)
  const segments = path.split('/')
  if (!path || path !== path.normalize('NFC') || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw archiveError('archive-invalid', `Archive path is not canonical: ${path || '(empty)'}.`)
  }
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw archiveError('archive-invalid', `Archive path contains an invalid segment: ${path}.`)
  }
  if (encoded.length > ARCHIVE_LIMITS.pathBytes) {
    throw archiveError('archive-limit', `Archive path exceeds ${ARCHIVE_LIMITS.pathBytes} UTF-8 bytes.`, { path, observed: encoded.length })
  }
  if (segments.length > ARCHIVE_LIMITS.pathSegments) {
    throw archiveError('archive-limit', `Archive path exceeds ${ARCHIVE_LIMITS.pathSegments} segments.`, { path, observed: segments.length })
  }
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimum = Math.max(0, bytes.length - 65_557)
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) return offset
  }
  throw archiveError('archive-invalid', 'ZIP end-of-central-directory record is missing.')
}

function inspectZipContainer(bytes: Uint8Array): void {
  if (bytes.length > ARCHIVE_LIMITS.compressedBytes) {
    throw archiveError('archive-limit', 'Archive compressed size exceeds the supported limit.', { observed: bytes.length, limit: ARCHIVE_LIMITS.compressedBytes })
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endOffset = findEndOfCentralDirectory(bytes)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralSize = view.getUint32(endOffset + 12, true)
  let offset = view.getUint32(endOffset + 16, true)
  if (entryCount === 0xffff || centralSize === 0xffffffff || offset === 0xffffffff) {
    throw archiveError('archive-limit', 'ZIP64 archives are outside format version 1 limits.')
  }
  if (entryCount > ARCHIVE_LIMITS.entries) {
    throw archiveError('archive-limit', 'Archive entry count exceeds the supported limit.', { observed: entryCount, limit: ARCHIVE_LIMITS.entries })
  }
  if (offset + centralSize > endOffset) throw archiveError('archive-invalid', 'ZIP central directory is out of bounds.')

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const foldedPaths = new Set<string>()
  let expandedBytes = 0
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw archiveError('archive-invalid', 'ZIP central directory entry is malformed.')
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
    if (nextOffset > endOffset) throw archiveError('archive-invalid', 'ZIP entry metadata is out of bounds.')

    let path: string
    try {
      path = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength))
    } catch {
      throw archiveError('archive-invalid', 'ZIP entry path is not valid UTF-8.')
    }
    validateArchivePath(path)
    const folded = path.toLowerCase()
    if (foldedPaths.has(folded)) throw archiveError('archive-invalid', `Archive contains a case-folded duplicate path: ${path}.`)
    foldedPaths.add(folded)

    if ((flags & 0x1) !== 0) throw archiveError('archive-invalid', `Encrypted entry is not supported: ${path}.`)
    if (compression !== 0 && compression !== 8) throw archiveError('archive-invalid', `Unsupported ZIP compression for ${path}.`)
    const platform = madeBy >> 8
    const unixType = (externalAttributes >>> 16) & 0o170000
    if (platform === 3 && unixType === 0o120000) throw archiveError('archive-invalid', `Symbolic links are not supported: ${path}.`)

    const textLike = path.endsWith('.json') || path.endsWith('.txt') || path.endsWith('.md')
    const entryLimit = textLike ? ARCHIVE_LIMITS.textEntryBytes : ARCHIVE_LIMITS.binaryEntryBytes
    if (expandedSize > entryLimit) throw archiveError('archive-limit', `Archive entry exceeds its size limit: ${path}.`, { observed: expandedSize, limit: entryLimit })
    if (expandedSize / Math.max(compressedSize, 1) > ARCHIVE_LIMITS.compressionRatio) {
      throw archiveError('archive-limit', `Archive entry exceeds the compression-ratio limit: ${path}.`)
    }
    expandedBytes += expandedSize
    if (expandedBytes > ARCHIVE_LIMITS.expandedBytes) throw archiveError('archive-limit', 'Archive expanded size exceeds the supported limit.')
    offset = nextOffset
  }
}

async function payloadEntries(graphValue: ProjectGraphV2, embeddedRuntimePacks: ContentPack[] = []): Promise<Record<string, Uint8Array>> {
  const graph = parseProjectGraphV2(graphValue)
  const recipe = graph.recipes[graph.project.activeRecipeId]
  const projection: SpriteProject = {
    schemaVersion: 1,
    id: graph.project.id,
    name: graph.project.name,
    packId: recipe.packId,
    themePresetId: graph.project.themePresetId,
    theme: graph.project.theme,
    character: { id: recipe.id, name: recipe.name, packId: recipe.packId, selections: recipe.selections, overrides: recipe.overrides },
    preview: graph.project.preview,
    createdAt: graph.project.createdAt,
    updatedAt: graph.project.updatedAt,
  }
  const entries: Record<string, Uint8Array> = {
    'project.json': canonicalJsonBytes(graph.project),
    'packs.lock.json': canonicalJsonBytes({ packLockVersion: 1, packs: graph.project.packLocks }),
  }
  for (const recipeId of graph.project.recipeIds) entries[`recipes/${recipeId}.json`] = canonicalJsonBytes(graph.recipes[recipeId])
  const lock = graph.project.packLocks.find(item => item.packId === projection.packId)
  const resolvedPack = lock ? packByLock(lock) ?? embeddedRuntimePacks.find(pack => pack.id === lock.packId && pack.version === lock.version && pack.packDocumentSha256 === lock.sha256) ?? null : null
  if (!resolvedPack) throw archiveError('missing-pack', `Exact pack ${projection.packId} is unavailable for archive credits.`)
  entries['provenance/selected-credits.json'] = canonicalJsonBytes({ schemaVersion: 1, records: creditsFor(projection, resolvedPack ?? undefined) })
  entries['README.txt'] = strToU8(`${graph.project.name}\n\nPortable project for The Sprite Project. Open the .spriteproject file in the web or desktop host.\n`)
  return entries
}

function orderedPayloadPaths(paths: string[]): string[] {
  return [...paths].sort((left, right) => {
    const leftRoot = ROOT_ORDER.indexOf(left)
    const rightRoot = ROOT_ORDER.indexOf(right)
    if (leftRoot >= 0 || rightRoot >= 0) {
      if (leftRoot < 0) return 1
      if (rightRoot < 0) return -1
      return leftRoot - rightRoot
    }
    return utf8Compare(left, right)
  })
}

function mediaTypeFor(path: string): string {
  if (path.endsWith('.spritepack')) return 'application/vnd.sprite-project.pack+zip'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.txt') || path.endsWith('.md')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

async function bundledLockMatches(lock: ProjectGraphV2['project']['packLocks'][number]): Promise<boolean> {
  for (const pack of PACKS.filter(item => !item.origin || item.origin === 'bundled')) {
    if (pack.id === lock.packId && pack.version === lock.version && (await packLockForPack(pack)).sha256 === lock.sha256) return true
  }
  return false
}

export async function writeProjectArchive(graphValue: ProjectGraphV2, createdWith = 'sprite-project/0.0.0', embeddedPackageBytes: Uint8Array[] = []): Promise<Uint8Array> {
  const graph = parseProjectGraphV2(graphValue)
  const embeddedPacks = await Promise.all(embeddedPackageBytes.map(bytes => readSpritePack(bytes)))
  const embeddedRuntimePacks = embeddedPacks.map(pack => runtimePackFromInstalled({
    packId: pack.pack.id,
    version: pack.pack.version,
    packageSha256: pack.packageSha256,
    packDocumentSha256: pack.packDocumentSha256,
    origin: 'embedded-project',
    enabled: false,
    installedAt: '1980-01-01T00:00:00.000Z',
    packageBytes: pack.bytes,
    pack: pack.pack,
    provenance: pack.provenance,
  }))
  const payload = await payloadEntries(graph, embeddedRuntimePacks)
  const requiredLocks: ProjectGraphV2['project']['packLocks'] = []
  for (const lock of graph.project.packLocks) if (!await bundledLockMatches(lock)) requiredLocks.push(lock)
  if (requiredLocks.length !== embeddedPacks.length || requiredLocks.some(lock => !embeddedPacks.some(pack => pack.pack.id === lock.packId && pack.pack.version === lock.version && pack.packDocumentSha256 === lock.sha256))) {
    throw archiveError('missing-pack', 'Every non-bundled project lock requires one exact embedded package.')
  }
  if (embeddedPacks.some(pack => !requiredLocks.some(lock => lock.packId === pack.pack.id && lock.version === pack.pack.version && lock.sha256 === pack.packDocumentSha256))) {
    throw archiveError('archive-invalid', 'Archive contains an unreferenced or bundled package.')
  }
  const embeddedRecords: EmbeddedPackManifestEntry[] = []
  for (const pack of embeddedPacks.sort((left, right) => utf8Compare(left.packageSha256, right.packageSha256))) {
    const path = `embedded-packs/${pack.packageSha256}.spritepack`
    payload[path] = pack.bytes
    embeddedRecords.push({ packId: pack.pack.id, version: pack.pack.version, packageSha256: pack.packageSha256, path, size: pack.bytes.length })
  }
  const paths = orderedPayloadPaths(Object.keys(payload))
  const manifestEntries: ArchiveManifestEntry[] = []
  for (const path of paths) {
    validateArchivePath(path)
    manifestEntries.push({ path, mediaType: mediaTypeFor(path), size: payload[path].length, sha256: await sha256Hex(payload[path]) })
  }
  const manifest: ArchiveManifest = {
    archiveFormatVersion: embeddedRecords.length ? 2 : 1,
    projectSchemaVersion: 2,
    packLockVersion: 1,
    projectId: graph.project.id,
    createdWith,
    ...(embeddedRecords.length ? { embeddedPacks: embeddedRecords } : {}),
    entries: manifestEntries,
  }
  if (manifest.archiveFormatVersion === 2) archiveManifestV2Schema.parse(manifest)
  else archiveManifestSchema.parse(manifest)

  const zipEntries: Record<string, [Uint8Array, { level: 6; mtime: Date }]> = {
    [MANIFEST_PATH]: [canonicalJsonBytes(manifest), { level: 6, mtime: FIXED_ZIP_TIME }],
  }
  for (const path of paths) zipEntries[path] = [payload[path], { level: 6, mtime: FIXED_ZIP_TIME }]
  return zipSync(zipEntries)
}

export async function readProjectArchive(bytes: Uint8Array): Promise<ReadArchiveResult> {
  inspectZipContainer(bytes)
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch (error) {
    throw archiveError('archive-invalid', error instanceof Error ? error.message : 'ZIP extraction failed.')
  }
  const manifestBytes = entries[MANIFEST_PATH]
  if (!manifestBytes) throw archiveError('archive-invalid', `${MANIFEST_PATH} is missing.`)

  let manifestValue: unknown
  try {
    manifestValue = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
  } catch {
    throw archiveError('archive-invalid', 'Archive manifest is not valid UTF-8 JSON.')
  }
  const archiveFormatVersion = typeof manifestValue === 'object' && manifestValue && 'archiveFormatVersion' in manifestValue ? (manifestValue as { archiveFormatVersion: unknown }).archiveFormatVersion : null
  if (archiveFormatVersion !== 1 && archiveFormatVersion !== 2) {
    throw archiveError('unsupported-version', 'Archive format version is unsupported.')
  }

  let manifest: ArchiveManifest
  try {
    manifest = (archiveFormatVersion === 2 ? archiveManifestV2Schema : archiveManifestSchema).parse(manifestValue) as ArchiveManifest
  } catch {
    throw archiveError('archive-invalid', 'Archive manifest violates the format version 1 schema.')
  }
  const listed = new Set(manifest.entries.map(entry => entry.path))
  const actual = Object.keys(entries).filter(path => path !== MANIFEST_PATH)
  if (listed.size !== manifest.entries.length || actual.length !== manifest.entries.length || actual.some(path => !listed.has(path))) {
    throw archiveError('archive-invalid', 'Archive contains missing, duplicate, or unlisted payload entries.')
  }

  for (const entry of manifest.entries) {
    const content = entries[entry.path]
    if (!content || content.length !== entry.size) throw archiveError('archive-invalid', `Archive size mismatch for ${entry.path}.`)
    if (await sha256Hex(content) !== entry.sha256) throw archiveError('archive-invalid', `Archive checksum mismatch for ${entry.path}.`)
  }

  const decodeJson = (path: string): unknown => {
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entries[path]))
    } catch {
      throw archiveError('archive-invalid', `Archive entry is not valid UTF-8 JSON: ${path}.`)
    }
  }
  try {
    const projectValue = decodeJson('project.json')
    if (typeof projectValue === 'object' && projectValue && 'schemaVersion' in projectValue && (projectValue as { schemaVersion: unknown }).schemaVersion !== 2) {
      throw archiveError('unsupported-version', 'Project schema version is unsupported.')
    }
    const project = parseProjectV2(projectValue)
    const packDocument = packLockDocumentSchema.parse(decodeJson('packs.lock.json'))
    if (JSON.stringify(packDocument.packs) !== JSON.stringify(project.packLocks)) throw archiveError('archive-invalid', 'Project and packs.lock.json disagree.')
    const recipes = Object.fromEntries(project.recipeIds.map(recipeId => {
      const path = `recipes/${recipeId}.json`
      if (!entries[path]) throw archiveError('archive-invalid', `Recipe entry is missing: ${path}.`)
      return [recipeId, recipeV1Schema.parse(decodeJson(path))]
    }))
    const graph = parseProjectGraphV2({ project, recipes })
    if (manifest.projectId !== project.id) throw archiveError('archive-invalid', 'Manifest project ID disagrees with project.json.')
    const embeddedPacks: ReadSpritePackResult[] = []
    if (manifest.archiveFormatVersion === 2) {
      const embeddedRecords = manifest.embeddedPacks ?? []
      if (new Set(embeddedRecords.map(record => record.path)).size !== embeddedRecords.length || new Set(embeddedRecords.map(record => `${record.packId}@${record.version}`)).size !== embeddedRecords.length) throw archiveError('archive-invalid', 'Embedded package records must be unique by path and pack version.')
      for (const record of manifest.embeddedPacks ?? []) {
        const content = entries[record.path]
        if (!content || content.length !== record.size || await sha256Hex(content) !== record.packageSha256) throw archiveError('archive-invalid', `Embedded package identity mismatch: ${record.path}.`)
        const pack = await readSpritePack(content)
        if (pack.packageSha256 !== record.packageSha256 || pack.pack.id !== record.packId || pack.pack.version !== record.version) throw archiveError('pack-invalid', `Embedded package manifest mismatch: ${record.path}.`)
        const lock = project.packLocks.find(item => item.packId === pack.pack.id)
        if (!lock || lock.version !== pack.pack.version || lock.sha256 !== pack.packDocumentSha256) throw archiveError('missing-pack', `Embedded package does not resolve an exact project lock: ${record.path}.`)
        if (await bundledLockMatches(lock)) throw archiveError('pack-invalid', `Bundled package must not be embedded: ${record.path}.`)
        embeddedPacks.push(pack)
      }
      for (const lock of project.packLocks) {
        if (!await bundledLockMatches(lock) && !embeddedPacks.some(pack => pack.pack.id === lock.packId && pack.pack.version === lock.version && pack.packDocumentSha256 === lock.sha256)) throw archiveError('missing-pack', `Exact pack ${lock.packId} ${lock.version} is unavailable.`)
      }
    } else {
      for (const lock of project.packLocks) if (!await bundledLockMatches(lock)) throw archiveError('missing-pack', `Archive v1 cannot resolve non-bundled pack ${lock.packId} ${lock.version}.`)
    }
    return { graph, manifest, entries, embeddedPacks }
  } catch (error) {
    if (error instanceof ProductError) throw error
    throw archiveError('archive-invalid', error instanceof Error ? error.message : 'Archive project graph is invalid.')
  }
}