import { performance } from 'node:perf_hooks'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { writeProjectArchive, readProjectArchive } from './domain/archive'
import { canonicalJsonBytes } from './domain/canonical'
import { ProductError } from './domain/errors'
import { migrateProjectV1ToV2 } from './domain/migration'
import { packLockFor } from './domain/pack-locks'
import { createProject } from './domain/project'
import { buildTerrainPackage } from './domain/terrain-export'
import { createTerrainDocument, renderTerrainAtlas, renderTerrainMap, renderTerrainTile, TERRAIN_MATERIALS, terrainPixelHash } from './domain/terrain'

async function fixture() {
  const legacy = createProject('Terrain Quality', '2026-07-21T00:00:00.000Z')
  const graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
  graph.terrain = createTerrainDocument(graph.project.theme, 'grass', graph.project.createdAt, 'terrain-1')
  return graph
}

function percentile(values: number[], ratio: number): number {
  return [...values].sort((left, right) => left - right)[Math.ceil(values.length * ratio) - 1]
}

function readWithArchiveV2Only(bytes: Uint8Array, mutation: () => void): never | void {
  const entries = unzipSync(bytes)
  const manifest = JSON.parse(new TextDecoder().decode(entries['archive-manifest.json'])) as { archiveFormatVersion?: unknown }
  if (manifest.archiveFormatVersion !== 1 && manifest.archiveFormatVersion !== 2) {
    throw new ProductError({ code: 'unsupported-version', message: 'Archive format version is unsupported.', operation: 'archive:read', recoverable: true })
  }
  mutation()
}

describe('UPD-003 quality gates', () => {
  it('pins exact pixels for all 64 material-mask combinations', async () => {
    const graph = await fixture()
    const hashes = Object.fromEntries(Object.entries(TERRAIN_MATERIALS).map(([id, material]) => {
      const document = createTerrainDocument(graph.project.theme, id as keyof typeof TERRAIN_MATERIALS, graph.project.createdAt, `terrain-${id}`)
      return [id, Array.from({ length: 16 }, (_, mask) => terrainPixelHash(renderTerrainTile(document.palette, material.textureSeed, mask)))]
    }))
    expect(hashes).toMatchInlineSnapshot(`
      {
        "dirt": [
          "96427160",
          "a351d3d8",
          "68b6cc34",
          "be230cea",
          "05ca1cf5",
          "d5aceadd",
          "20ce980a",
          "d7ae3079",
          "5dd410b8",
          "0004abf3",
          "7957e0f5",
          "82a8f381",
          "575f7543",
          "de82f5b8",
          "4bcab689",
          "eecc4f95",
        ],
        "grass": [
          "4cf29f8d",
          "b9c58177",
          "3b94d18d",
          "706e4f74",
          "9fb3caad",
          "2d5e32cd",
          "65b3f8dc",
          "04e23481",
          "af437783",
          "d531b818",
          "42c26fc5",
          "9287407d",
          "11788402",
          "8960678d",
          "16d4ec8b",
          "a311af85",
        ],
        "sand": [
          "4fd7f873",
          "55f968cf",
          "aa9a79ee",
          "12889a8f",
          "89013c01",
          "78c90c2d",
          "d6b6c2cf",
          "47631af5",
          "fdb747db",
          "a830ea86",
          "35bd290d",
          "cfa28cb9",
          "97225278",
          "68021041",
          "e68182da",
          "a9d3a90a",
        ],
        "stone": [
          "4bfa5c9f",
          "5e8074f3",
          "b2dc07f5",
          "560e8921",
          "b09c8c15",
          "a7cfc749",
          "756786c1",
          "a48edfd5",
          "b5495a27",
          "d677f273",
          "de3be2e5",
          "1336c391",
          "ca74d1fd",
          "78cae564",
          "1741fec0",
          "40515108",
        ],
      }
    `)
  })

  it('keeps ordinary map and atlas generation p95 below 50ms', async () => {
    const graph = await fixture()
    const document = graph.terrain!
    const atlasDurations: number[] = []
    const mapDurations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const atlasStart = performance.now()
      renderTerrainAtlas(document)
      atlasDurations.push(performance.now() - atlasStart)
      document.map.occupied[index % 96] = !document.map.occupied[index % 96]
      const mapStart = performance.now()
      renderTerrainMap(document)
      mapDurations.push(performance.now() - mapStart)
    }
    expect(percentile(atlasDurations, 0.95)).toBeLessThanOrEqual(50)
    expect(percentile(mapDurations, 0.95)).toBeLessThanOrEqual(50)
  })

  it('builds generic and Godot terrain packages below two seconds', async () => {
    const graph = await fixture()
    for (const target of ['generic', 'godot'] as const) {
      const startedAt = performance.now()
      const result = await buildTerrainPackage(graph, target)
      expect(performance.now() - startedAt).toBeLessThanOrEqual(2_000)
      expect(result.bytes.length).toBeGreaterThan(500)
    }
  })

  it('rejects archive v3 in an archive-v2-only reader before mutation', async () => {
    const archive = await writeProjectArchive(await fixture())
    let mutated = false
    expect(() => readWithArchiveV2Only(archive, () => { mutated = true })).toThrowError(expect.objectContaining({ code: 'unsupported-version' }))
    expect(mutated).toBe(false)
  })

  it('preserves terrain through a reader-only rollback round trip', async () => {
    const graph = await fixture()
    graph.terrain!.map.occupied[0] = false
    const archive = await writeProjectArchive(graph)
    const opened = await readProjectArchive(archive)
    expect(opened.graph).toEqual(graph)
    expect(canonicalJsonBytes(opened.graph.terrain)).toEqual(canonicalJsonBytes(graph.terrain))
    expect(await writeProjectArchive(opened.graph)).toEqual(archive)
    expect(canonicalJsonBytes(graph.terrain).length).toBeLessThanOrEqual(64 * 1024)
  })
})
