import { z } from 'zod'
import { ANIMATIONS, DIRECTIONS, SLOT_IDS, TOKEN_IDS, type ProjectGraphV2, type SpriteProject, type SpriteProjectV2 } from './types'

const utcTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const identifier = z.string().min(1)
const optionalAsset = z.string().min(1).nullable()

const themeSchema = z.object(Object.fromEntries(TOKEN_IDS.map(token => [token, z.string().regex(/^#[a-fA-F0-9]{6}$/)])) as Record<(typeof TOKEN_IDS)[number], z.ZodString>).strict()
const selectionsSchema = z.object(Object.fromEntries(SLOT_IDS.map(slot => [slot, optionalAsset])) as Record<(typeof SLOT_IDS)[number], typeof optionalAsset>).strict()
const overridesSchema = z.object(Object.fromEntries(TOKEN_IDS.map(token => [token, z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()])) as Record<(typeof TOKEN_IDS)[number], z.ZodOptional<z.ZodString>>).strict()

export const previewSchema = z.object({
  animation: z.enum(ANIMATIONS),
  direction: z.enum(DIRECTIONS),
  speed: z.number().finite().positive(),
  zoom: z.number().finite().positive(),
  playing: z.boolean(),
}).strict()

const legacyRecipeSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  packId: identifier,
  selections: selectionsSchema,
  overrides: overridesSchema,
}).strict()

export const recipeV1Schema = legacyRecipeSchema.extend({ schemaVersion: z.literal(1) }).strict()

export const projectV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: identifier,
  name: z.string().min(1),
  packId: identifier,
  themePresetId: identifier,
  theme: themeSchema,
  character: legacyRecipeSchema,
  preview: previewSchema,
  createdAt: utcTimestamp,
  updatedAt: utcTimestamp,
}).strict()

export const packLockSchema = z.object({
  packId: identifier,
  version: z.string().min(1),
  sha256,
}).strict()

export const packLockDocumentSchema = z.object({
  packLockVersion: z.literal(1),
  packs: z.array(packLockSchema).min(1),
}).strict()

export const archiveManifestEntrySchema = z.object({
  path: z.string().min(1),
  mediaType: z.string().min(1),
  size: z.number().int().nonnegative(),
  sha256,
}).strict()

export const archiveManifestSchema = z.object({
  archiveFormatVersion: z.literal(1),
  projectSchemaVersion: z.literal(2),
  packLockVersion: z.literal(1),
  projectId: identifier,
  createdWith: z.string().min(1),
  entries: z.array(archiveManifestEntrySchema).min(3),
}).strict()

export const archiveEmbeddedPackSchema = z.object({
  packId: identifier,
  version: z.string().min(1),
  packageSha256: sha256,
  path: z.string().regex(/^embedded-packs\/[a-f0-9]{64}\.spritepack$/),
  size: z.number().int().positive(),
}).strict()

export const archiveManifestV2Schema = z.object({
  archiveFormatVersion: z.literal(2),
  projectSchemaVersion: z.literal(2),
  packLockVersion: z.literal(1),
  projectId: identifier,
  createdWith: z.string().min(1),
  embeddedPacks: z.array(archiveEmbeddedPackSchema).min(1).max(16),
  entries: z.array(archiveManifestEntrySchema).min(4),
}).strict()

export const projectV2Schema = z.object({
  schemaVersion: z.literal(2),
  id: identifier,
  name: z.string().min(1),
  activeRecipeId: identifier,
  recipeIds: z.array(identifier).length(1),
  packLocks: z.array(packLockSchema).min(1),
  themePresetId: identifier,
  theme: themeSchema,
  preview: previewSchema,
  createdAt: utcTimestamp,
  updatedAt: utcTimestamp,
  revision: z.number().int().safe().nonnegative(),
}).strict().superRefine((project, context) => {
  if (project.recipeIds[0] !== project.activeRecipeId) {
    context.addIssue({ code: 'custom', path: ['activeRecipeId'], message: 'activeRecipeId must be the sole recipeIds entry.' })
  }
  const packIds = project.packLocks.map(lock => lock.packId)
  if (new Set(packIds).size !== packIds.length) {
    context.addIssue({ code: 'custom', path: ['packLocks'], message: 'Pack lock IDs must be unique.' })
  }
})

export function parseProjectV1(value: unknown): SpriteProject {
  return projectV1Schema.parse(value) as SpriteProject
}

export function parseProjectV2(value: unknown): SpriteProjectV2 {
  return projectV2Schema.parse(value) as SpriteProjectV2
}

export function parseProjectGraphV2(value: unknown): ProjectGraphV2 {
  const envelope = z.object({ project: z.unknown(), recipes: z.record(z.string(), z.unknown()) }).strict().parse(value)
  const project = parseProjectV2(envelope.project)
  const recipes = Object.fromEntries(Object.entries(envelope.recipes).map(([key, recipe]) => [key, recipeV1Schema.parse(recipe)]))

  if (Object.keys(recipes).length !== project.recipeIds.length) throw new Error('Recipe graph contains unlisted or missing recipes.')
  for (const recipeId of project.recipeIds) {
    const recipe = recipes[recipeId]
    if (!recipe || recipe.id !== recipeId) throw new Error(`Recipe ${recipeId} does not resolve by ID.`)
    if (!project.packLocks.some(lock => lock.packId === recipe.packId)) throw new Error(`Recipe ${recipeId} references an unlocked pack.`)
  }

  return { project, recipes } as ProjectGraphV2
}