/// <reference types="node" />

import 'fake-indexeddb/auto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deleteDB } from 'idb'
import { describe, expect, it } from 'vitest'
import { recolorSheetCell } from './domain/pack-runtime'
import { readSpritePack } from './domain/spritepack'
import { largeSpritePackFixtureBytes, spritePackFixtureBytes, spritePackFixturePng } from './domain/spritepack-test-fixture'
import { sha256Hex } from './domain/sha256'
import { presetById } from './domain/themes'
import type { PackDraftAssetV1 } from './domain/pack-types'
import { WorkspaceRepository } from './web/repository'

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0
}

async function measureEventLoop<T>(action: () => Promise<T>): Promise<{ value: T; durationMs: number; maxStallMs: number }> {
  const intervalMs = 10
  let previous = performance.now()
  let maxStallMs = 0
  const timer = setInterval(() => {
    const now = performance.now()
    maxStallMs = Math.max(maxStallMs, now - previous - intervalMs)
    previous = now
  }, intervalMs)
  await new Promise(resolve => setTimeout(resolve, intervalMs * 2))
  const started = performance.now()
  const value = await action()
  const durationMs = performance.now() - started
  await new Promise(resolve => setTimeout(resolve, intervalMs * 2))
  clearInterval(timer)
  return { value, durationMs, maxStallMs }
}

describe('UPD-002 performance and capacity gates', () => {
  it('meets maximum-pack, 100-save, preview, and one-over-limit thresholds', async () => {
    const startedAt = new Date().toISOString()
    const fixtureStarted = performance.now()
    const largeBytes = await largeSpritePackFixtureBytes()
    const fixtureBuildMs = performance.now() - fixtureStarted
    const validation = await measureEventLoop(() => readSpritePack(largeBytes))

    const databaseName = `upd002-benchmark-${crypto.randomUUID()}`
    const repository = new WorkspaceRepository(databaseName)
    const png = spritePackFixturePng()
    const sourceBlobSha256 = await repository.storePackDraftSource(png)
    let draft = await repository.createPackDraft('Draft benchmark')
    const assets: PackDraftAssetV1[] = Array.from({ length: 16 }, (_, index) => ({
      draftId: draft.id,
      assetId: `local.benchmark.asset.${index}`,
      sourceBlobSha256,
      name: `Benchmark asset ${index}`,
      slot: 'torso',
      description: '',
      sourceColorBindings: { '#123456': { kind: 'token', token: 'clothPrimary', shade: 0 } },
      provenance: null,
    }))
    draft = await repository.savePackDraft({ ...draft, assetIds: assets.map(asset => asset.assetId), activeAssetId: assets[0].assetId }, assets, draft.revision)
    const draftSaveTimings: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const started = performance.now()
      draft = await repository.savePackDraft({ ...draft, description: `Benchmark edit ${index}` }, assets, draft.revision)
      draftSaveTimings.push(performance.now() - started)
    }

    const source = new Uint8ClampedArray(64 * 64 * 4)
    for (let offset = 0; offset < source.length; offset += 4) {
      source[offset] = 0x12
      source[offset + 1] = 0x34
      source[offset + 2] = 0x56
      source[offset + 3] = 0xff
    }
    const previewTimings: number[] = []
    const tokens = presetById('hearth').tokens
    for (let index = 0; index < 100; index += 1) {
      const started = performance.now()
      recolorSheetCell(source, { '#123456': { kind: 'token', token: 'clothPrimary', shade: (index % 5 - 2) as -2 | -1 | 0 | 1 | 2 } }, tokens)
      previewTimings.push(performance.now() - started)
    }

    let overLimitCode = 'none'
    try {
      await readSpritePack(new Uint8Array(64 * 1024 * 1024 + 1))
    } catch (error) {
      overLimitCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
    }
    const ordinaryBytes = await spritePackFixtureBytes()
    const ordinaryHash = await sha256Hex(ordinaryBytes)
    await repository.close()
    await deleteDB(databaseName)

    const thresholds = { validationTotalMs: 10_000, draftSaveP95Ms: 2_000, previewP95Ms: 250 }
    const observed = {
      largeCompressedBytes: largeBytes.length,
      largeExpandedBytes: validation.value.manifest.entries.reduce((sum, entry) => sum + entry.size, 0),
      largeAssetCount: validation.value.pack.assets.length,
      fixtureBuildMs,
      validationTotalMs: validation.durationMs,
      coreDiagnosticMaxEventLoopStallMs: validation.maxStallMs,
      draftSaveP50Ms: percentile(draftSaveTimings, 0.5),
      draftSaveP95Ms: percentile(draftSaveTimings, 0.95),
      draftSaveMaxMs: Math.max(...draftSaveTimings),
      previewP50Ms: percentile(previewTimings, 0.5),
      previewP95Ms: percentile(previewTimings, 0.95),
      previewMaxMs: Math.max(...previewTimings),
      overLimitCode,
      ordinaryPackageSha256: ordinaryHash,
    }
    const checks = {
      validationWithinTenSeconds: observed.validationTotalMs <= thresholds.validationTotalMs,
      draftSaveP95WithinTwoSeconds: observed.draftSaveP95Ms <= thresholds.draftSaveP95Ms,
      previewP95Within250Ms: observed.previewP95Ms <= thresholds.previewP95Ms,
      oneOverCompressedLimitFailsStable: observed.overLimitCode === 'pack-limit',
    }
    const report = {
      id: 'BENCH-UPD002-001', startedAt, completedAt: new Date().toISOString(),
      environment: { platform: process.platform, architecture: process.arch, node: process.version, logicalCpus: (await import('node:os')).cpus().length },
      fixture: { class: 'large-supported', note: 'Eight unique deterministic PNGs with incompressible ancillary data; complete humanoid coverage and provenance.' },
      thresholds, observed, checks, status: Object.values(checks).every(Boolean) ? 'passed' : 'failed',
    }
    const output = path.resolve('..', 'delivery', 'updates', 'UPD-002-local-content-pack-ecosystem', 'evidence', 'runs', 'RUN-UPD002-001', 'performance-results.json')
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)

    expect(checks, JSON.stringify(report, null, 2)).toEqual({
      validationWithinTenSeconds: true,
      draftSaveP95WithinTwoSeconds: true,
      previewP95Within250Ms: true,
      oneOverCompressedLimitFailsStable: true,
    })
  }, 120_000)
})
