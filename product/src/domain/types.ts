export const SLOT_IDS = ['body', 'hair', 'headwear', 'torso', 'legs', 'feet'] as const
export const REQUIRED_SLOTS = ['body', 'torso', 'legs', 'feet'] as const
export const TOKEN_IDS = ['skin', 'hair', 'clothPrimary', 'clothSecondary', 'leather', 'metal'] as const
export const DIRECTIONS = ['south', 'west', 'east', 'north'] as const
export const ANIMATIONS = ['idle', 'walk'] as const

export type SlotId = (typeof SLOT_IDS)[number]
export type RequiredSlotId = (typeof REQUIRED_SLOTS)[number]
export type TokenId = (typeof TOKEN_IDS)[number]
export type Direction = (typeof DIRECTIONS)[number]
export type AnimationId = (typeof ANIMATIONS)[number]
export type MotionId = 'none' | 'bob' | 'leftFoot' | 'rightFoot' | 'leftHand' | 'rightHand' | 'sway'

export interface Provenance {
  author: string
  source: string
  sourceUrl: string
  license: string
  chosenLicense: string
  attributionText?: string | null
}

export interface PixelPart {
  x: number
  y: number
  width: number
  height: number
  token: TokenId | 'outline' | 'white'
  shade?: -2 | -1 | 0 | 1 | 2
  motion?: MotionId
  directions?: Direction[]
  outline?: boolean
}

export interface PackAsset {
  id: string
  name: string
  slot: SlotId
  description: string
  parts: PixelPart[]
  coverage: AnimationId[]
  provenance: Provenance
  sheet?: {
    pngSha256: string
    sourceColorBindings: Record<string, { kind: 'fixed' } | { kind: 'token'; token: TokenId; shade: -2 | -1 | 0 | 1 | 2 }>
  }
}

export interface ContentPack {
  id: string
  version: string
  name: string
  description: string
  assets: PackAsset[]
  defaults: Record<SlotId, string | null>
  origin?: 'bundled' | 'installed-local' | 'authored-local' | 'embedded-project'
  packageSha256?: string
  packDocumentSha256?: string
  enabled?: boolean
}

export type ThemeTokens = Record<TokenId, string>

export type TerrainMaterialId = 'grass' | 'dirt' | 'sand' | 'stone'
export type TerrainColorRole = 'surface' | 'detail' | 'edge' | 'shadow'
export type TerrainPalette = Record<TerrainColorRole, `#${string}`>

export interface TerrainDocumentV1 {
  schemaVersion: 1
  id: string
  name: string
  materialId: TerrainMaterialId
  palette: TerrainPalette
  map: {
    width: 12
    height: 8
    occupied: boolean[]
  }
  createdAt: string
  updatedAt: string
}

export interface ThemePreset {
  id: string
  name: string
  description: string
  tokens: ThemeTokens
}

export interface CharacterRecipe {
  id: string
  name: string
  packId: string
  selections: Record<SlotId, string | null>
  overrides: Partial<ThemeTokens>
}

export interface CharacterRecipeV1 extends CharacterRecipe {
  schemaVersion: 1
}

export interface PreviewState {
  animation: AnimationId
  direction: Direction
  speed: number
  zoom: number
  playing: boolean
}

export interface SpriteProject {
  schemaVersion: 1
  id: string
  name: string
  packId: string
  themePresetId: string
  theme: ThemeTokens
  character: CharacterRecipe
  preview: PreviewState
  createdAt: string
  updatedAt: string
}

export interface PackLockRef {
  packId: string
  version: string
  sha256: string
}

export interface SpriteProjectV2 {
  schemaVersion: 2
  id: string
  name: string
  activeRecipeId: string
  recipeIds: string[]
  packLocks: PackLockRef[]
  themePresetId: string
  theme: ThemeTokens
  preview: PreviewState
  createdAt: string
  updatedAt: string
  revision: number
}

export interface ProjectGraphV2 {
  project: SpriteProjectV2
  recipes: Record<string, CharacterRecipeV1>
  terrain: TerrainDocumentV1 | null
}

export interface AnimationFrame {
  x: number
  y: number
  width: number
  height: number
  durationMs: number
}

export interface AnimationManifest {
  schemaVersion: 1
  frameWidth: 64
  frameHeight: 64
  columns: 4
  rows: 8
  animations: Record<`${AnimationId}_${Direction}`, AnimationFrame[]>
}

export interface CreditRecord extends Provenance {
  assetIds: string[]
  assetNames: string[]
  packId: string
  packVersion: string
  packageSha256?: string
}
