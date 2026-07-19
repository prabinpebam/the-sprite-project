import type { ThemePreset, ThemeTokens, TokenId } from './types'

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'hearth',
    name: 'Hearth',
    description: 'Warm cloth, weathered leather, and clear steel.',
    tokens: {
      skin: '#d79b72', hair: '#493126', clothPrimary: '#9f2f3f',
      clothSecondary: '#e2ad52', leather: '#68432f', metal: '#a9bbc2',
    },
  },
  {
    id: 'woodland',
    name: 'Woodland',
    description: 'Moss, berry, bark, and muted silver.',
    tokens: {
      skin: '#c88b67', hair: '#352a25', clothPrimary: '#486b45',
      clothSecondary: '#a94b55', leather: '#604934', metal: '#a8b0a6',
    },
  },
  {
    id: 'tideline',
    name: 'Tideline',
    description: 'Deep ocean cloth with coral and brass accents.',
    tokens: {
      skin: '#b9795d', hair: '#292a2d', clothPrimary: '#225b68',
      clothSecondary: '#d36b52', leather: '#6c4934', metal: '#c8aa58',
    },
  },
]

export const TOKEN_LABELS: Record<TokenId, string> = {
  skin: 'Skin', hair: 'Hair', clothPrimary: 'Primary cloth',
  clothSecondary: 'Secondary cloth', leather: 'Leather', metal: 'Metal',
}

export const TOKEN_DESCRIPTIONS: Record<TokenId, string> = {
  skin: 'Face, hands, and exposed skin', hair: 'Hair and facial-hair regions',
  clothPrimary: 'Dominant garment color', clothSecondary: 'Trim and secondary garments',
  leather: 'Boots, belts, and leather accessories', metal: 'Buckles and metal details',
}

export function presetById(id: string): ThemePreset {
  return THEME_PRESETS.find(preset => preset.id === id) ?? THEME_PRESETS[0]
}

export function resolveTheme(projectTheme: ThemeTokens, overrides: Partial<ThemeTokens>): ThemeTokens {
  return { ...projectTheme, ...overrides }
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}
