import { strToU8, zipSync } from 'fflate'
import { canonicalJsonBytes } from './canonical'
import { sha256Hex } from './sha256'
import type { PackDraftAssetV1, PackDraftV1 } from './pack-types'

const FIXED_ZIP_TIME = new Date('1980-01-01T00:00:00.000Z')

export interface DraftRecoveryInput {
  draft: PackDraftV1
  assets: PackDraftAssetV1[]
  pngs: Record<string, Uint8Array>
  validationReport: string
  exportedAt?: string
  applicationVersion?: string
}

export async function writeDraftRecovery(input: DraftRecoveryInput): Promise<Uint8Array> {
  const orderedAssets = input.draft.assetIds.map(id => input.assets.find(asset => asset.assetId === id)).filter((asset): asset is PackDraftAssetV1 => Boolean(asset))
  if (orderedAssets.length !== input.assets.length) throw new Error('Draft recovery assets do not match draft assetIds.')
  const payload: Record<string, Uint8Array> = {
    'draft.json': new Uint8Array([...canonicalJsonBytes({ draft: input.draft, assets: orderedAssets }), 10]),
    'validation-report.txt': strToU8(`${input.validationReport.replace(/\r\n/g, '\n').replace(/\n*$/, '')}\n`),
    'README.txt': strToU8('Sprite pack draft recovery\n\nThis inspection artifact is not accepted by Add pack. Reconstruct it through Create pack and Add layer sheet.\n'),
  }
  for (const hash of [...new Set(orderedAssets.map(asset => asset.sourceBlobSha256))].sort()) {
    const bytes = input.pngs[hash]
    if (!bytes) throw new Error(`Draft recovery source ${hash} is unavailable.`)
    if (await sha256Hex(bytes) !== hash) throw new Error(`Draft recovery source ${hash} failed checksum validation.`)
    payload[`assets/${hash}.png`] = bytes
  }
  const paths = Object.keys(payload).sort((left, right) => left.localeCompare(right))
  const entries = []
  for (const path of paths) entries.push({ path, size: payload[path].length, sha256: await sha256Hex(payload[path]) })
  const manifest = {
    recoverySchemaVersion: 1,
    draftId: input.draft.id,
    revision: input.draft.revision,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    applicationVersion: input.applicationVersion ?? '0.1.0',
    entries,
  }
  const zipEntries: Record<string, [Uint8Array, { level: 6; mtime: Date }]> = {
    'recovery-manifest.json': [new Uint8Array([...canonicalJsonBytes(manifest), 10]), { level: 6, mtime: FIXED_ZIP_TIME }],
  }
  for (const path of paths) zipEntries[path] = [payload[path], { level: 6, mtime: FIXED_ZIP_TIME }]
  return zipSync(zipEntries)
}
