import { canonicalJsonBytes } from './canonical'
import { packById } from './packs'
import { sha256Hex } from './sha256'
import type { PackLockRef } from './types'

export async function packLockFor(packId: string): Promise<PackLockRef> {
  const pack = packById(packId)
  if (pack.id !== packId) throw new Error(`Pack ${packId} is unavailable.`)
  return { packId: pack.id, version: pack.version, sha256: await sha256Hex(canonicalJsonBytes(pack)) }
}