/// <reference types="node" />

import 'fake-indexeddb/auto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { unzipSync } from 'fflate'
import { deleteDB } from 'idb'
import { describe, expect, it } from 'vitest'
import { readProjectArchive, writeProjectArchive } from './domain/archive'
import { writeDraftRecovery } from './domain/draft-recovery'
import { createProject } from './domain/project'
import { migrateProjectV1ToV2 } from './domain/migration'
import { readSpritePack } from './domain/spritepack'
import { spritePackFixtureBytes, spritePackFixturePng } from './domain/spritepack-test-fixture'
import { sha256Hex } from './domain/sha256'
import type { PackDraftAssetV1 } from './domain/pack-types'
import { WorkspaceRepository } from './web/repository'

describe('UPD-002 rollback rehearsal', () => {
  it('preserves package, draft, project, and provenance through reader-only rollback and failed mutations', async () => {
    const databaseName = `upd002-rollback-${crypto.randomUUID()}`
    const repository = new WorkspaceRepository(databaseName)
    const packageBytes = await spritePackFixtureBytes()
    const parsedPack = await readSpritePack(packageBytes)
    const installed = await repository.installPack(packageBytes, 'authored-local', '2026-07-20T00:00:00.000Z')

    const sourcePng = spritePackFixturePng()
    const sourceBlobSha256 = await repository.storePackDraftSource(sourcePng)
    let draft = await repository.createPackDraft('Rollback draft', '2026-07-20T00:00:00.000Z')
    const draftAsset: PackDraftAssetV1 = {
      draftId: draft.id,
      assetId: 'local.rollback.asset',
      sourceBlobSha256,
      name: 'Rollback asset',
      slot: 'torso',
      description: 'Preserved source asset.',
      sourceColorBindings: { '#123456': { kind: 'fixed' } },
      provenance: null,
    }
    draft = await repository.savePackDraft({ ...draft, assetIds: [draftAsset.assetId], activeAssetId: draftAsset.assetId }, [draftAsset], 0, '2026-07-20T00:00:01.000Z')
    const recoveryBytes = await writeDraftRecovery({ draft, assets: [draftAsset], pngs: { [sourceBlobSha256]: sourcePng }, validationReport: 'Rollback rehearsal source preservation.', exportedAt: '2026-07-20T00:00:02.000Z', applicationVersion: '0.1.0' })

    const legacy = createProject('Rollback project', '2026-07-20T00:00:00.000Z')
    legacy.packId = parsedPack.pack.id
    legacy.character.packId = parsedPack.pack.id
    legacy.character.selections = { body: null, hair: null, headwear: null, torso: parsedPack.pack.assets[0].id, legs: null, feet: null }
    const graph = migrateProjectV1ToV2(legacy, { packId: parsedPack.pack.id, version: parsedPack.pack.version, sha256: parsedPack.packDocumentSha256 })
    await repository.createGraph(graph, [packageBytes])
    const archiveBytes = await writeProjectArchive(graph, 'sprite-project/rollback-rehearsal', [packageBytes])

    const baseline = {
      packageSha256: await sha256Hex(packageBytes),
      sourcePngSha256: await sha256Hex(sourcePng),
      recoverySha256: await sha256Hex(recoveryBytes),
      archiveSha256: await sha256Hex(archiveBytes),
      packDocumentSha256: parsedPack.packDocumentSha256,
    }

    let removeFailureCode = 'none'
    try { await repository.removePack(installed) } catch (error) { removeFailureCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown' }
    let collisionFailureCode = 'none'
    try { await repository.installPack(await spritePackFixtureBytes('1.0.0', 'Conflicting rollback bytes.')) } catch (error) { collisionFailureCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown' }

    const readerOnlyPack = await readSpritePack(packageBytes)
    const readerOnlyArchive = await readProjectArchive(archiveBytes)
    const recoveryEntries = unzipSync(recoveryBytes)
    const reopenedDraft = await repository.loadPackDraft(draft.id)
    const reopenedProject = await repository.loadGraph(graph.project.id)
    const reopenedInstalled = await repository.listInstalledPacks()
    const reopenedSource = await repository.readPackBlob(sourceBlobSha256)

    const after = {
      packageSha256: await sha256Hex(readerOnlyPack.bytes),
      sourcePngSha256: await sha256Hex(reopenedSource ?? new Uint8Array()),
      recoverySha256: await sha256Hex(recoveryBytes),
      archiveSha256: await sha256Hex(archiveBytes),
      packDocumentSha256: readerOnlyPack.packDocumentSha256,
    }
    const checks = {
      readerOnlyPackOpened: readerOnlyPack.pack.id === parsedPack.pack.id,
      readerOnlyArchiveV2Opened: readerOnlyArchive.manifest.archiveFormatVersion === 2 && readerOnlyArchive.embeddedPacks[0]?.packageSha256 === parsedPack.packageSha256,
      recoveryRetainsOriginalPng: Boolean(recoveryEntries[`assets/${sourceBlobSha256}.png`]),
      draftReopened: reopenedDraft?.draft.revision === draft.revision && reopenedDraft.assets[0]?.sourceBlobSha256 === sourceBlobSha256,
      projectReopened: reopenedProject?.project.id === graph.project.id,
      failedRemovalRolledBack: removeFailureCode === 'pack-in-use' && reopenedInstalled.length === 1,
      failedUpdateRolledBack: collisionFailureCode === 'pack-conflict' && reopenedInstalled[0]?.packageSha256 === parsedPack.packageSha256,
      allCanonicalHashesPreserved: JSON.stringify(after) === JSON.stringify(baseline),
    }
    const report = {
      id: 'ROLLBACK-UPD002-001',
      completedAt: new Date().toISOString(),
      mode: 'local reader-only rollback rehearsal',
      baseline,
      after,
      failures: { removeFailureCode, collisionFailureCode },
      checks,
      status: Object.values(checks).every(Boolean) ? 'passed' : 'failed',
      limitation: 'Deployed Pages withdrawal and independent clean-machine executable rollback remain external release observations.',
    }
    const output = path.resolve('..', 'delivery', 'updates', 'UPD-002-local-content-pack-ecosystem', 'evidence', 'runs', 'RUN-UPD002-001', 'rollback-results.json')
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
    await repository.close()
    await deleteDB(databaseName)

    expect(checks, JSON.stringify(report, null, 2)).toEqual({
      readerOnlyPackOpened: true,
      readerOnlyArchiveV2Opened: true,
      recoveryRetainsOriginalPng: true,
      draftReopened: true,
      projectReopened: true,
      failedRemovalRolledBack: true,
      failedUpdateRolledBack: true,
      allCanonicalHashesPreserved: true,
    })
  }, 30_000)
})
