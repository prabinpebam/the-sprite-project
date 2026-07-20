import { describe, expect, it } from 'vitest'
import { unzipSync, zipSync } from 'fflate'
import { readProjectArchive, validateArchivePath, writeProjectArchive } from './archive'
import { canonicalJsonBytes } from './canonical'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { createProject } from './project'
import { sha256Hex } from './sha256'
import { readSpritePack } from './spritepack'
import { spritePackFixtureBytes } from './spritepack-test-fixture'

async function fixture() {
  const legacy = createProject('Portable Hero', '2026-07-19T00:00:00.000Z')
  return migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
}

async function replacePayload(archive: Uint8Array, path: string, bytes: Uint8Array): Promise<Uint8Array> {
  const entries = unzipSync(archive)
  const manifest = JSON.parse(new TextDecoder().decode(entries['archive-manifest.json']))
  const record = manifest.entries.find((entry: { path: string }) => entry.path === path)
  record.size = bytes.length
  record.sha256 = await sha256Hex(bytes)
  entries[path] = Uint8Array.from(bytes)
  entries['archive-manifest.json'] = Uint8Array.from(canonicalJsonBytes(manifest))
  return zipSync(entries)
}

function mutateFirstCentralEntry(archive: Uint8Array, mutate: (view: DataView, offset: number) => void): Uint8Array {
  const bytes = Uint8Array.from(archive)
  const view = new DataView(bytes.buffer)
  for (let offset = 0; offset <= bytes.length - 4; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) {
      mutate(view, offset)
      return bytes
    }
  }
  throw new Error('Central directory not found.')
}

describe('spriteproject archives', () => {
  it('writes deterministic archives and restores the complete canonical graph', async () => {
    const graph = await fixture()
    const first = await writeProjectArchive(graph)
    const second = await writeProjectArchive(graph)
    expect(first).toEqual(second)

    const restored = await readProjectArchive(first)
    expect(restored.graph).toEqual(graph)
    expect(restored.manifest.entries.map(entry => entry.path)).toEqual([
      'project.json',
      'packs.lock.json',
      'README.txt',
      'provenance/selected-credits.json',
      `recipes/${graph.project.activeRecipeId}.json`,
    ])
    expect(Object.keys(restored.entries)).not.toContain('exports/')
  })

  it('rejects traversal, absolute, non-canonical, deep, and case-folded duplicate paths', () => {
    for (const path of ['../project.json', '/project.json', 'C:/project.json', 'a\\b.json', 'a/./b.json', 'a//b.json', 'Cafe\u0301.json']) {
      expect(() => validateArchivePath(path)).toThrow()
    }
    expect(() => validateArchivePath('a/b/c/d/e/f/g/h/i.json')).toThrow('segments')

    const duplicate = zipSync({ 'A.json': canonicalJsonBytes({ value: 1 }), 'a.json': canonicalJsonBytes({ value: 2 }) })
    expect(readProjectArchive(duplicate)).rejects.toMatchObject({ code: 'archive-invalid' })
  })

  it('rejects checksum mismatches and unlisted entries before returning a graph', async () => {
    const valid = await writeProjectArchive(await fixture())
    const entries = unzipSync(valid)
    entries['project.json'] = Uint8Array.from(canonicalJsonBytes({ replaced: true }))
    await expect(readProjectArchive(zipSync(entries))).rejects.toMatchObject({ code: 'archive-invalid' })

    const validEntries = unzipSync(valid)
    validEntries['unlisted.json'] = Uint8Array.from(canonicalJsonBytes({ leaked: true }))
    await expect(readProjectArchive(zipSync(validEntries))).rejects.toMatchObject({ code: 'archive-invalid' })
  })

  it('fails unsupported archive versions closed without accepting payload data', async () => {
    const valid = await writeProjectArchive(await fixture())
    const entries = unzipSync(valid)
    const manifest = JSON.parse(new TextDecoder().decode(entries['archive-manifest.json']))
    entries['archive-manifest.json'] = Uint8Array.from(canonicalJsonBytes({ ...manifest, archiveFormatVersion: 3 }))
    await expect(readProjectArchive(zipSync(entries))).rejects.toMatchObject({ code: 'unsupported-version' })
  })

  it('writes archive v2 only for an exact non-bundled lock and restores immutable embedded bytes', async () => {
    const graph = await fixture()
    const packageBytes = await spritePackFixtureBytes()
    const embedded = await readSpritePack(packageBytes)
    graph.project.packLocks = [{ packId: embedded.pack.id, version: embedded.pack.version, sha256: embedded.packDocumentSha256 }]
    graph.recipes = Object.fromEntries(Object.entries(graph.recipes).map(([id, recipe]) => [id, { ...recipe, packId: embedded.pack.id }]))
    const first = await writeProjectArchive(graph, 'sprite-project/test', [packageBytes])
    const second = await writeProjectArchive(graph, 'sprite-project/test', [packageBytes])
    expect(first).toEqual(second)
    const restored = await readProjectArchive(first)
    expect(restored.manifest.archiveFormatVersion).toBe(2)
    expect(restored.manifest.embeddedPacks).toEqual([{
      packId: embedded.pack.id,
      version: embedded.pack.version,
      packageSha256: embedded.packageSha256,
      path: `embedded-packs/${embedded.packageSha256}.spritepack`,
      size: packageBytes.length,
    }])
    expect(restored.embeddedPacks[0].bytes).toEqual(packageBytes)
    expect(restored.graph).toEqual(graph)
  })

  it('rejects a version 1 archive whose graph claims a non-bundled exact lock', async () => {
    const valid = await writeProjectArchive(await fixture())
    const packageBytes = await spritePackFixtureBytes()
    const embedded = await readSpritePack(packageBytes)
    const entries = unzipSync(valid)
    const project = JSON.parse(new TextDecoder().decode(entries['project.json']))
    const recipePath = Object.keys(entries).find(path => path.startsWith('recipes/'))!
    const recipe = JSON.parse(new TextDecoder().decode(entries[recipePath]))
    const mutatedProject = { ...project, packLocks: [{ packId: embedded.pack.id, version: embedded.pack.version, sha256: embedded.packDocumentSha256 }] }
    const mutatedRecipe = { ...recipe, packId: embedded.pack.id }
    const withProject = await replacePayload(valid, 'project.json', canonicalJsonBytes(mutatedProject))
    const withRecipe = await replacePayload(withProject, recipePath, canonicalJsonBytes(mutatedRecipe))
    const lockDocument = { packLockVersion: 1, packs: mutatedProject.packLocks }
    await expect(readProjectArchive(await replacePayload(withRecipe, 'packs.lock.json', canonicalJsonBytes(lockDocument)))).rejects.toMatchObject({ code: 'missing-pack' })
  })

  it('rejects traversal and absolute-path ZIP entries before extraction', async () => {
    for (const path of ['../project.json', '/project.json', 'C:/project.json']) {
      const archive = zipSync({ [path]: new Uint8Array([1]) })
      await expect(readProjectArchive(archive)).rejects.toMatchObject({ code: 'archive-invalid' })
    }
  })

  it('rejects encrypted and symbolic-link central-directory entries', async () => {
    const valid = await writeProjectArchive(await fixture())
    const encrypted = mutateFirstCentralEntry(valid, (view, offset) => view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 1, true))
    await expect(readProjectArchive(encrypted)).rejects.toMatchObject({ code: 'archive-invalid' })
    const symlink = mutateFirstCentralEntry(valid, (view, offset) => {
      view.setUint16(offset + 4, 3 << 8, true)
      view.setUint32(offset + 38, 0o120777 << 16, true)
    })
    await expect(readProjectArchive(symlink)).rejects.toMatchObject({ code: 'archive-invalid' })
  })

  it('rejects too many entries and excessive compression ratios with archive-limit', async () => {
    const tooMany = zipSync(Object.fromEntries(Array.from({ length: 513 }, (_, index) => [`entry-${index}.txt`, new Uint8Array()])))
    await expect(readProjectArchive(tooMany)).rejects.toMatchObject({ code: 'archive-limit' })
    const compressed = zipSync({ 'large.txt': new Uint8Array(1024 * 1024) }, { level: 9 })
    await expect(readProjectArchive(compressed)).rejects.toMatchObject({ code: 'archive-limit' })
  })

  it('rejects malformed JSON, future project schemas, required extensions, and host-state leakage', async () => {
    const valid = await writeProjectArchive(await fixture())
    await expect(readProjectArchive(await replacePayload(valid, 'project.json', new TextEncoder().encode('{invalid\n')))).rejects.toMatchObject({ code: 'archive-invalid' })

    const entries = unzipSync(valid)
    const project = JSON.parse(new TextDecoder().decode(entries['project.json']))
    await expect(readProjectArchive(await replacePayload(valid, 'project.json', canonicalJsonBytes({ ...project, schemaVersion: 3 })))).rejects.toMatchObject({ code: 'unsupported-version' })
    await expect(readProjectArchive(await replacePayload(valid, 'project.json', canonicalJsonBytes({ ...project, extensions: { required: ['example'] } })))).rejects.toMatchObject({ code: 'archive-invalid' })
    await expect(readProjectArchive(await replacePayload(valid, 'project.json', canonicalJsonBytes({ ...project, displayPath: 'C:\\private' })))).rejects.toMatchObject({ code: 'archive-invalid' })
  })
})