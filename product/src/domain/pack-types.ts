import type { SupportedLicense } from './license-profiles'
import type { SlotId, TokenId } from './types'

export type HexRgb = `#${string}`
export type PackOrigin = 'bundled' | 'installed-local' | 'authored-local' | 'embedded-project'

export interface FixedColorBinding { kind: 'fixed' }
export interface TokenColorBinding { kind: 'token'; token: TokenId; shade: -2 | -1 | 0 | 1 | 2 }
export type SourceColorBinding = FixedColorBinding | TokenColorBinding

export type RuntimeAssetSource =
  | { kind: 'primitive-v1'; parts: unknown[] }
  | {
      kind: 'sheet-v1'
      pngSha256: string
      sheetPath: string
      width: 256
      height: 512
      sourceColorBindings: Record<HexRgb, SourceColorBinding>
    }

export interface PackAssetV2 {
  schemaVersion: 2
  id: string
  name: string
  slot: SlotId
  description: string
  source: RuntimeAssetSource
  coverage: ['idle', 'walk']
  provenanceId: string
}

export interface ContentPackV2 {
  packSchemaVersion: 2
  id: string
  version: string
  name: string
  description: string
  subjectProfile: 'humanoid-lpc-64'
  assets: PackAssetV2[]
  defaults: Record<SlotId, string | null>
}

export interface PackProvenanceV1 {
  schemaVersion: 1
  id: string
  author: string
  source: string
  sourceUrl: string
  offeredLicenses: SupportedLicense[]
  chosenLicense: SupportedLicense
  attributionText: string | null
  authorRightsConfirmed: true
}

export interface InstalledPackVersion {
  packId: string
  version: string
  packageSha256: string
  packDocumentSha256: string
  origin: PackOrigin
  enabled: boolean
  installedAt: string
  packageBytes: Uint8Array
  pack: ContentPackV2
  provenance: Record<string, PackProvenanceV1>
}

export interface PackDraftV1 {
  draftSchemaVersion: 1
  id: string
  revision: number
  packId: string
  version: string
  name: string
  description: string
  subjectProfile: 'humanoid-lpc-64'
  assetIds: string[]
  activeAssetId: string | null
  createdAt: string
  updatedAt: string
  lastExportedPackageSha256: string | null
}

export interface PackDraftAssetV1 {
  draftId: string
  assetId: string
  sourceBlobSha256: string
  name: string
  slot: SlotId
  description: string
  sourceColorBindings: Record<HexRgb, SourceColorBinding>
  provenance: PackProvenanceV1 | null
}