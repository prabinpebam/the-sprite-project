import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { sha256Hex } from './sha256'
import { spritePackFixturePng } from './spritepack-test-fixture'
import { writeDraftRecovery } from './draft-recovery'
import type { PackDraftAssetV1, PackDraftV1 } from './pack-types'

describe('pack draft recovery', () => {
  it('writes deterministic original sources and a complete checksummed inventory', async () => {
    const png = spritePackFixturePng()
    const hash = await sha256Hex(png)
    const draft: PackDraftV1 = { draftSchemaVersion: 1, id: 'draft-id', revision: 3, packId: 'local.test', version: '1.0.0', name: 'Test', description: '', subjectProfile: 'humanoid-lpc-64', assetIds: ['local.test.asset'], activeAssetId: 'local.test.asset', createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z', lastExportedPackageSha256: null }
    const asset: PackDraftAssetV1 = { draftId: draft.id, assetId: 'local.test.asset', sourceBlobSha256: hash, name: 'Asset', slot: 'torso', description: '', sourceColorBindings: { '#123456': { kind: 'fixed' } }, provenance: null }
    const input = { draft, assets: [asset], pngs: { [hash]: png }, validationReport: 'One blocker', exportedAt: '2026-07-22T00:00:00.000Z', applicationVersion: 'test' }
    const first = await writeDraftRecovery(input)
    expect(await writeDraftRecovery(input)).toEqual(first)
    const files = unzipSync(first)
    expect(Object.keys(files).sort()).toEqual(['README.txt', `assets/${hash}.png`, 'draft.json', 'recovery-manifest.json', 'validation-report.txt'])
    expect(files[`assets/${hash}.png`]).toEqual(png)
    const manifest = JSON.parse(new TextDecoder().decode(files['recovery-manifest.json']))
    expect(manifest).toMatchObject({ recoverySchemaVersion: 1, draftId: draft.id, revision: 3, applicationVersion: 'test' })
    expect(manifest.entries).toHaveLength(4)
  })
})
