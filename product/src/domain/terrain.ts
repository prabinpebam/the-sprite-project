import { parseTerrainDocumentV1 } from './schemas'
import type { Provenance, TerrainDocumentV1, TerrainMaterialId, TerrainPalette, ThemeTokens } from './types'

export const TERRAIN_TILE_SIZE = 32
export const TERRAIN_MASK_COUNT = 16
export const TERRAIN_ATLAS_COLUMNS = 4
export const TERRAIN_ATLAS_ROWS = 4
export const TERRAIN_MAP_WIDTH = 12
export const TERRAIN_MAP_HEIGHT = 8

export interface TerrainBitmap {
  width: number
  height: number
  pixels: Uint8ClampedArray
}

export interface TerrainMaterialDefinition {
  id: TerrainMaterialId
  name: string
  description: string
  textureSeed: number
  provenance: Provenance
}

const material = (id: TerrainMaterialId, name: string, description: string, textureSeed: number): TerrainMaterialDefinition => ({
  id,
  name,
  description,
  textureSeed,
  provenance: {
    author: 'The Sprite Project',
    source: `${name} Procedural Terrain`,
    sourceUrl: 'https://github.com/prabinpebam/the-sprite-project',
    license: 'CC0-1.0',
    chosenLicense: 'CC0-1.0',
    attributionText: null,
  },
})

export const TERRAIN_MATERIALS: Record<TerrainMaterialId, TerrainMaterialDefinition> = {
  grass: material('grass', 'Grass', 'Soft ground cover with cool earthen borders.', 0x47524153),
  dirt: material('dirt', 'Dirt', 'Packed earth with sparse granular detail.', 0x44495254),
  sand: material('sand', 'Sand', 'Light granular terrain with warm edges.', 0x53414e44),
  stone: material('stone', 'Stone', 'Dense mineral ground with restrained texture.', 0x53544f4e),
}

export function adjustHex(hex: string, signedSteps: number): `#${string}` {
  const value = Number.parseInt(hex.slice(1), 16)
  const shift = signedSteps * 12
  const channel = (offset: number) => Math.max(0, Math.min(255, ((value >> offset) & 255) + shift))
  return `#${[channel(16), channel(8), channel(0)].map(item => item.toString(16).padStart(2, '0')).join('')}`
}

export function deriveTerrainPalette(theme: Readonly<ThemeTokens>, materialId: TerrainMaterialId): TerrainPalette {
  const role = (token: keyof ThemeTokens, steps: number) => adjustHex(theme[token], steps)
  switch (materialId) {
    case 'grass': return { surface: role('clothPrimary', 0), detail: role('clothSecondary', 1), edge: role('leather', -1), shadow: role('hair', -2) }
    case 'dirt': return { surface: role('leather', 0), detail: role('clothSecondary', -1), edge: role('clothPrimary', -1), shadow: role('hair', -2) }
    case 'sand': return { surface: role('clothSecondary', 1), detail: role('skin', 1), edge: role('leather', 0), shadow: role('hair', -1) }
    case 'stone': return { surface: role('metal', 0), detail: role('clothSecondary', -1), edge: role('leather', -1), shadow: role('hair', -2) }
  }
}

export function createTerrainDocument(theme: Readonly<ThemeTokens>, materialId: TerrainMaterialId = 'grass', now = new Date().toISOString(), id: string = crypto.randomUUID()): TerrainDocumentV1 {
  return parseTerrainDocumentV1({
    schemaVersion: 1,
    id,
    name: 'Project terrain',
    materialId,
    palette: deriveTerrainPalette(theme, materialId),
    map: { width: 12, height: 8, occupied: Array.from({ length: 96 }, () => true) },
    createdAt: now,
    updatedAt: now,
  })
}

export function cardinalMask(document: TerrainDocumentV1, x: number, y: number): number {
  const occupied = document.map.occupied
  const index = y * TERRAIN_MAP_WIDTH + x
  if (x < 0 || x >= TERRAIN_MAP_WIDTH || y < 0 || y >= TERRAIN_MAP_HEIGHT || !occupied[index]) return 0
  let mask = 0
  if (y > 0 && occupied[index - TERRAIN_MAP_WIDTH]) mask |= 1
  if (x < TERRAIN_MAP_WIDTH - 1 && occupied[index + 1]) mask |= 2
  if (y < TERRAIN_MAP_HEIGHT - 1 && occupied[index + TERRAIN_MAP_WIDTH]) mask |= 4
  if (x > 0 && occupied[index - 1]) mask |= 8
  return mask
}

function rgba(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
}

function fill(pixels: Uint8ClampedArray, bitmapWidth: number, x: number, y: number, width: number, height: number, color: [number, number, number, number]): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) pixels.set(color, (row * bitmapWidth + column) * 4)
  }
}

function nextXorshift32(state: number): number {
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  return state >>> 0
}

export function renderTerrainTile(palette: TerrainPalette, textureSeed: number, mask: number): TerrainBitmap {
  const pixels = new Uint8ClampedArray(TERRAIN_TILE_SIZE * TERRAIN_TILE_SIZE * 4)
  fill(pixels, TERRAIN_TILE_SIZE, 0, 0, 32, 32, rgba(palette.surface))
  let state = (textureSeed ^ Math.imul(mask + 1, 0x9e3779b1)) >>> 0
  if (state === 0) state = 0x6d2b79f5
  for (let index = 0; index < 12; index += 1) {
    state = nextXorshift32(state)
    const x = 4 + state % 24
    state = nextXorshift32(state)
    const y = 4 + state % 24
    fill(pixels, TERRAIN_TILE_SIZE, x, y, index % 2 === 0 ? 1 : 2, 1, rgba(palette.detail))
  }
  if (!(mask & 1)) fill(pixels, TERRAIN_TILE_SIZE, 0, 0, 32, 3, rgba(palette.edge))
  if (!(mask & 8)) fill(pixels, TERRAIN_TILE_SIZE, 0, 0, 3, 32, rgba(palette.edge))
  if (!(mask & 4)) fill(pixels, TERRAIN_TILE_SIZE, 0, 29, 32, 3, rgba(palette.shadow))
  if (!(mask & 2)) fill(pixels, TERRAIN_TILE_SIZE, 29, 0, 3, 32, rgba(palette.shadow))
  return { width: 32, height: 32, pixels }
}

function copyBitmap(source: TerrainBitmap, target: TerrainBitmap, targetX: number, targetY: number): void {
  for (let y = 0; y < source.height; y += 1) {
    const sourceStart = y * source.width * 4
    const targetStart = ((targetY + y) * target.width + targetX) * 4
    target.pixels.set(source.pixels.subarray(sourceStart, sourceStart + source.width * 4), targetStart)
  }
}

export function renderTerrainAtlas(documentValue: TerrainDocumentV1): TerrainBitmap {
  const document = parseTerrainDocumentV1(documentValue)
  const atlas = { width: 128, height: 128, pixels: new Uint8ClampedArray(128 * 128 * 4) }
  const materialDefinition = TERRAIN_MATERIALS[document.materialId]
  for (let mask = 0; mask < TERRAIN_MASK_COUNT; mask += 1) {
    copyBitmap(renderTerrainTile(document.palette, materialDefinition.textureSeed, mask), atlas, (mask % 4) * 32, Math.floor(mask / 4) * 32)
  }
  return atlas
}

export function renderTerrainMap(documentValue: TerrainDocumentV1): TerrainBitmap {
  const document = parseTerrainDocumentV1(documentValue)
  const map = { width: 384, height: 256, pixels: new Uint8ClampedArray(384 * 256 * 4) }
  const atlas = renderTerrainAtlas(document)
  for (let y = 0; y < TERRAIN_MAP_HEIGHT; y += 1) {
    for (let x = 0; x < TERRAIN_MAP_WIDTH; x += 1) {
      if (!document.map.occupied[y * TERRAIN_MAP_WIDTH + x]) continue
      const mask = cardinalMask(document, x, y)
      const tile = { width: 32, height: 32, pixels: new Uint8ClampedArray(32 * 32 * 4) }
      for (let row = 0; row < 32; row += 1) {
        const sourceStart = (((Math.floor(mask / 4) * 32 + row) * atlas.width) + (mask % 4) * 32) * 4
        tile.pixels.set(atlas.pixels.subarray(sourceStart, sourceStart + 32 * 4), row * 32 * 4)
      }
      copyBitmap(tile, map, x * 32, y * 32)
    }
  }
  return map
}

export function terrainPixelHash(bitmap: TerrainBitmap): string {
  let hash = 2166136261
  for (const byte of bitmap.pixels) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}