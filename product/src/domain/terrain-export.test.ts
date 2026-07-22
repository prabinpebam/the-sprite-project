import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { createProject } from './project'
import { buildTerrainPackage } from './terrain-export'
import { createTerrainDocument } from './terrain'

async function fixture() {
  const legacy = createProject('Terrain Export', '2026-07-21T00:00:00.000Z')
  const graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
  graph.terrain = createTerrainDocument(graph.project.theme, 'grass', graph.project.createdAt, 'terrain-1')
  return graph
}

describe('terrain export', () => {
  it('builds a deterministic generic package with exact masks and provenance', async () => {
    const graph = await fixture()
    const first = await buildTerrainPackage(graph, 'generic')
    expect((await buildTerrainPackage(graph, 'generic')).bytes).toEqual(first.bytes)
    const files = unzipSync(first.bytes)
    expect(Object.keys(files).sort()).toEqual(['CREDITS.txt', 'build-manifest.json', 'credits.json', 'terrain-atlas.png', 'terrain-manifest.json'])
    const png = files['terrain-atlas.png']
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
    expect([view.getUint32(16, false), view.getUint32(20, false)]).toEqual([128, 128])
    const manifest = JSON.parse(new TextDecoder().decode(files['terrain-manifest.json']))
    expect(manifest).toMatchObject({ schemaVersion: 1, materialId: 'grass', atlasHash: first.renderHash })
    expect(manifest.masks).toHaveLength(16)
    expect(manifest.masks[15]).toMatchObject({ north: true, east: true, south: true, west: true, x: 96, y: 96 })
    expect(new TextDecoder().decode(files['CREDITS.txt'])).toContain('CC0-1.0')
  })

  it('adds a directly mapped Godot 4.7.1 TileSet without changing atlas pixels', async () => {
    const graph = await fixture()
    const generic = await buildTerrainPackage(graph, 'generic')
    const godot = await buildTerrainPackage(graph, 'godot')
    const files = unzipSync(godot.bytes)
    expect(godot.renderHash).toBe(generic.renderHash)
    expect(Object.keys(files)).toContain('README-GODOT-TERRAIN.md')
    const resource = new TextDecoder().decode(files['terrain_tileset.tres'])
    expect(resource).toContain('terrain_set_0/mode = 2')
    expect(resource).toContain('3:3/0/terrains_peering_bit/top_side = 0')
    expect(resource).toContain('3:3/0/terrains_peering_bit/right_side = 0')
    expect(resource).toContain('sources/0 = SubResource("TileSetAtlasSource_terrain")')
  })

  it('blocks export when the project has no terrain document', async () => {
    const graph = await fixture()
    graph.terrain = null
    await expect(buildTerrainPackage(graph, 'generic')).rejects.toThrow('Create terrain')
  })
})