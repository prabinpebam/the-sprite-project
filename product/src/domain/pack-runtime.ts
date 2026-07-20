import type { ContentPackV2, InstalledPackVersion } from './pack-types'
import type { ContentPack, PackAsset, ThemeTokens, TokenId } from './types'
import { LICENSE_PROFILES } from './license-profiles'

const sheetPixels = new Map<string, ImageData>()

function adjust(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const shift = amount * 18
  const channel = (offset: number) => Math.max(0, Math.min(255, ((value >> offset) & 255) + shift))
  return `#${[channel(16), channel(8), channel(0)].map(item => item.toString(16).padStart(2, '0')).join('')}`
}

function parseRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function recolorSheetCell(source: Uint8ClampedArray, bindings: Record<string, { kind: 'fixed' } | { kind: 'token'; token: TokenId; shade: -2 | -1 | 0 | 1 | 2 }>, tokens: ThemeTokens): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source)
  for (let offset = 0; offset < output.length; offset += 4) {
    if (output[offset + 3] === 0) {
      output[offset] = 0
      output[offset + 1] = 0
      output[offset + 2] = 0
      continue
    }
    const key = `#${[output[offset], output[offset + 1], output[offset + 2]].map(value => value.toString(16).padStart(2, '0')).join('')}`
    const binding = bindings[key]
    if (binding?.kind === 'token') {
      const [red, green, blue] = parseRgb(adjust(tokens[binding.token], binding.shade))
      output[offset] = red
      output[offset + 1] = green
      output[offset + 2] = blue
    }
  }
  return output
}

export async function registerSheetPng(hash: string, bytes: Uint8Array): Promise<void> {
  if (sheetPixels.has(hash)) return
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' }))
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not decode pack PNG.')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  sheetPixels.set(hash, context.getImageData(0, 0, 256, 512))
}

export function registeredSheet(hash: string): ImageData | undefined {
  return sheetPixels.get(hash)
}

export function runtimePackFromInstalled(version: InstalledPackVersion): ContentPack {
  const provenance = version.provenance
  return {
    id: version.pack.id,
    version: version.pack.version,
    name: version.pack.name,
    description: version.pack.description,
    defaults: { ...version.pack.defaults },
    origin: version.origin,
    packageSha256: version.packageSha256,
    packDocumentSha256: version.packDocumentSha256,
    enabled: version.enabled,
    assets: version.pack.assets.map(asset => {
      if (asset.source.kind !== 'sheet-v1') throw new Error(`Installed asset ${asset.id} does not use sheet-v1.`)
      const source = provenance[asset.provenanceId]
      const profile = LICENSE_PROFILES[source.chosenLicense]
      const runtimeAsset: PackAsset = {
        id: asset.id,
        name: asset.name,
        slot: asset.slot,
        description: asset.description,
        parts: [],
        coverage: [...asset.coverage],
        provenance: {
          author: source.author,
          source: source.source,
          sourceUrl: source.sourceUrl,
          license: source.chosenLicense,
          chosenLicense: source.chosenLicense,
        },
        sheet: { pngSha256: asset.source.pngSha256, sourceColorBindings: asset.source.sourceColorBindings },
      }
      if (profile.attributionRequired && !source.attributionText) throw new Error(`Attribution is missing for ${asset.id}.`)
      runtimeAsset.provenance.attributionText = source.attributionText
      return runtimeAsset
    }),
  }
}

export function packDocumentFromRuntime(pack: ContentPackV2): ContentPackV2 {
  return pack
}

export async function decodeSheetPng(bytes: Uint8Array): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' }))
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not decode pack PNG.')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  return context.getImageData(0, 0, 256, 512)
}

export function distinctOpaqueColors(image: ImageData): { hex: string; count: number }[] {
  const counts = new Map<string, number>()
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (image.data[offset + 3] === 0) continue
    const hex = `#${[image.data[offset], image.data[offset + 1], image.data[offset + 2]].map(value => value.toString(16).padStart(2, '0')).join('')}`
    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }
  return [...counts].map(([hex, count]) => ({ hex, count })).sort((left, right) => right.count - left.count || left.hex.localeCompare(right.hex))
}