import { canonicalJsonBytes } from './canonical'
import { packById } from './packs'
import { sha256Hex } from './sha256'
import type { ContentPack, PackLockRef } from './types'

export async function packLockForPack(pack: ContentPack): Promise<PackLockRef> {
  return {
    packId: pack.id,
    version: pack.version,
    sha256: pack.packDocumentSha256 ?? await sha256Hex(canonicalJsonBytes(pack)),
  }
}

export async function packLockFor(packId: string): Promise<PackLockRef> {
  const pack = packById(packId)
  if (pack.id !== packId) throw new Error(`Pack ${packId} is unavailable.`)
  return packLockForPack(pack)
}