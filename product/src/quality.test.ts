import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteDB } from 'idb'
import { readProjectArchive } from './domain/archive'
import { migrateProjectV1ToV2 } from './domain/migration'
import { packLockFor } from './domain/pack-locks'
import { createProject } from './domain/project'
import { WorkspaceRepository } from './web/repository'

const databaseNames: string[] = []

afterEach(async () => {
  for (const name of databaseNames.splice(0)) await deleteDB(name)
})

describe('UPD-001 quality scenarios', () => {
  it('completes 100 revisioned save transactions with p95 below two seconds', async () => {
    const databaseName = `benchmark-${crypto.randomUUID()}`
    databaseNames.push(databaseName)
    const repository = new WorkspaceRepository(databaseName)
    const legacy = createProject('Benchmark', '2026-07-20T00:00:00.000Z')
    let graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
    await repository.createGraph(graph)
    const timings: number[] = []

    for (let index = 0; index < 100; index += 1) {
      const started = performance.now()
      graph = await repository.saveGraph({ ...graph, project: { ...graph.project, name: `Benchmark ${index}` } }, graph.project.revision, 'benchmark')
      timings.push(performance.now() - started)
    }
    await repository.close()
    timings.sort((left, right) => left - right)
    const p95 = timings[Math.ceil(timings.length * 0.95) - 1]
    expect(p95).toBeLessThan(2_000)
  }, 30_000)

  it('rejects a declared over-limit archive well inside ten seconds', async () => {
    const entries = Object.fromEntries(Array.from({ length: 513 }, (_, index) => [`entry-${index}.txt`, new Uint8Array()]))
    const { zipSync } = await import('fflate')
    const archive = zipSync(entries)
    const started = performance.now()
    await expect(readProjectArchive(archive)).rejects.toMatchObject({ code: 'archive-limit' })
    expect(performance.now() - started).toBeLessThan(10_000)
  })
})