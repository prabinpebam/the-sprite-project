import { describe, expect, it } from 'vitest'
import { createProject } from './project'
import { parseProjectGraphV2, parseTerrainDocumentV1 } from './schemas'
import { adjustHex, cardinalMask, createTerrainDocument, deriveTerrainPalette, renderTerrainAtlas, renderTerrainMap, renderTerrainTile, TERRAIN_MATERIALS, terrainPixelHash } from './terrain'

describe('terrain domain', () => {
  const legacy = createProject('Terrain', '2026-07-21T00:00:00.000Z')

  it('derives exact palettes without mutating character theme', () => {
    const before = structuredClone(legacy.theme)
    expect(adjustHex('#5b8c51', -1)).toBe('#4f8045')
    expect(deriveTerrainPalette(legacy.theme, 'grass')).toEqual({
      surface: legacy.theme.clothPrimary.toLowerCase(),
      detail: adjustHex(legacy.theme.clothSecondary, 1),
      edge: adjustHex(legacy.theme.leather, -1),
      shadow: adjustHex(legacy.theme.hair, -2),
    })
    expect(legacy.theme).toEqual(before)
  })

  it('strictly parses the fixed document and rejects extension state', () => {
    const terrain = createTerrainDocument(legacy.theme, 'stone', '2026-07-21T00:00:00.000Z', 'terrain-1')
    expect(parseTerrainDocumentV1(terrain)).toEqual(terrain)
    expect(terrain.map.occupied).toHaveLength(96)
    expect(() => parseTerrainDocumentV1({ ...terrain, hostPath: 'C:\\terrain' })).toThrow()
    expect(() => parseTerrainDocumentV1({ ...terrain, map: { ...terrain.map, width: 13 } })).toThrow()
  })

  it('normalizes baseline graph envelopes and strictly parses terrain envelopes', () => {
    const project = {
      schemaVersion: 2, id: 'project', name: 'Project', activeRecipeId: 'recipe', recipeIds: ['recipe'],
      packLocks: [{ packId: 'wayfarer', version: '1.0.0', sha256: '0'.repeat(64) }],
      themePresetId: legacy.themePresetId, theme: legacy.theme, preview: legacy.preview,
      createdAt: legacy.createdAt, updatedAt: legacy.updatedAt, revision: 0,
    } as const
    const recipes = { recipe: { schemaVersion: 1, ...legacy.character, id: 'recipe' } } as const
    expect(parseProjectGraphV2({ project, recipes }).terrain).toBeNull()
    const terrain = createTerrainDocument(legacy.theme, 'grass', legacy.createdAt, 'terrain-1')
    expect(parseProjectGraphV2({ project, recipes, terrain }).terrain).toEqual(terrain)
  })

  it('computes cardinal masks and deterministic opaque tile bytes', () => {
    const terrain = createTerrainDocument(legacy.theme, 'grass', legacy.createdAt, 'terrain-1')
    expect(cardinalMask(terrain, 0, 0)).toBe(6)
    expect(cardinalMask(terrain, 5, 4)).toBe(15)
    terrain.map.occupied[4 * 12 + 5] = false
    expect(cardinalMask(terrain, 5, 4)).toBe(0)
    expect(cardinalMask(terrain, 5, 3)).toBe(11)

    const tile = renderTerrainTile(terrain.palette, TERRAIN_MATERIALS.grass.textureSeed, 15)
    expect(tile.pixels.every((_, index) => index % 4 !== 3 || tile.pixels[index] === 255)).toBe(true)
    expect(terrainPixelHash(tile)).toBe(terrainPixelHash(renderTerrainTile(terrain.palette, TERRAIN_MATERIALS.grass.textureSeed, 15)))
  })

  it('renders all atlas cells and transparent empty map cells deterministically', () => {
    const terrain = createTerrainDocument(legacy.theme, 'sand', legacy.createdAt, 'terrain-1')
    const atlas = renderTerrainAtlas(terrain)
    expect([atlas.width, atlas.height]).toEqual([128, 128])
    expect(terrainPixelHash(atlas)).toBe(terrainPixelHash(renderTerrainAtlas(terrain)))
    const hashes = Array.from({ length: 16 }, (_, mask) => terrainPixelHash(renderTerrainTile(terrain.palette, TERRAIN_MATERIALS.sand.textureSeed, mask)))
    expect(new Set(hashes).size).toBe(16)

    terrain.map.occupied[0] = false
    const map = renderTerrainMap(terrain)
    expect([map.width, map.height]).toEqual([384, 256])
    expect([...map.pixels.slice(0, 4)]).toEqual([0, 0, 0, 0])
  })
})