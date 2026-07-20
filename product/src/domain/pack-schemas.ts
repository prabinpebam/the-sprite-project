import { z } from 'zod'
import { SUPPORTED_LICENSES } from './license-profiles'
import { SLOT_IDS, TOKEN_IDS } from './types'
import type { ContentPackV2, PackProvenanceV1 } from './pack-types'

const id = z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/).min(3).max(64)
const packId = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/).min(3).max(64)
const semver = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const hex = z.string().regex(/^#[a-f0-9]{6}$/)
const fixedBinding = z.object({ kind: z.literal('fixed') }).strict()
const tokenBinding = z.object({ kind: z.literal('token'), token: z.enum(TOKEN_IDS), shade: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]) }).strict()

export const provenanceSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  author: z.string().min(1).max(160),
  source: z.string().min(1).max(240),
  sourceUrl: z.url({ protocol: /^https$/ }),
  offeredLicenses: z.array(z.enum(SUPPORTED_LICENSES)).min(1),
  chosenLicense: z.enum(SUPPORTED_LICENSES),
  attributionText: z.string().min(1).max(500).nullable(),
  authorRightsConfirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (!value.offeredLicenses.includes(value.chosenLicense)) context.addIssue({ code: 'custom', path: ['chosenLicense'], message: 'Chosen license must be offered.' })
  if (value.chosenLicense !== 'CC0-1.0' && !value.attributionText) context.addIssue({ code: 'custom', path: ['attributionText'], message: 'Attribution is required for the chosen license.' })
})

const sourceSchema = z.object({
  kind: z.literal('sheet-v1'),
  pngSha256: sha256,
  sheetPath: z.string().regex(/^assets\/[a-f0-9]{64}\.png$/),
  width: z.literal(256),
  height: z.literal(512),
  sourceColorBindings: z.record(hex, z.union([fixedBinding, tokenBinding])).refine(value => Object.keys(value).length <= 256, 'At most 256 source colors are supported.'),
}).strict()

const assetSchema = z.object({
  schemaVersion: z.literal(2),
  id,
  name: z.string().min(1).max(80),
  slot: z.enum(SLOT_IDS),
  description: z.string().max(500),
  source: sourceSchema,
  coverage: z.tuple([z.literal('idle'), z.literal('walk')]),
  provenanceId: id,
}).strict()

export const contentPackV2Schema = z.object({
  packSchemaVersion: z.literal(2),
  id: packId,
  version: semver,
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  subjectProfile: z.literal('humanoid-lpc-64'),
  assets: z.array(assetSchema).min(1).max(128),
  defaults: z.object(Object.fromEntries(SLOT_IDS.map(slot => [slot, z.string().nullable()])) as Record<(typeof SLOT_IDS)[number], z.ZodNullable<z.ZodString>>).strict(),
}).strict().superRefine((pack, context) => {
  const assetIds = pack.assets.map(asset => asset.id)
  if (new Set(assetIds).size !== assetIds.length) context.addIssue({ code: 'custom', path: ['assets'], message: 'Asset IDs must be unique.' })
  for (const [slot, assetId] of Object.entries(pack.defaults)) {
    if (assetId && !pack.assets.some(asset => asset.id === assetId && asset.slot === slot)) context.addIssue({ code: 'custom', path: ['defaults', slot], message: 'Default must reference an asset in the same slot.' })
  }
})

export function parseContentPackV2(value: unknown): ContentPackV2 {
  return contentPackV2Schema.parse(value) as ContentPackV2
}

export function parsePackProvenance(value: unknown): PackProvenanceV1 {
  return provenanceSchema.parse(value) as PackProvenanceV1
}