import { describe, expect, it } from 'vitest'
import { strToU8, unzipSync, zipSync, zlibSync } from 'fflate'
import { canonicalJsonBytes } from './canonical'
import { sha256Hex } from './sha256'
import { readSpritePack, validateSpritePackPath, writeSpritePack, type SpritePackContents } from './spritepack'

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = strToU8(type)
  const output = new Uint8Array(data.length + 12)
  const view = new DataView(output.buffer)
  view.setUint32(0, data.length, false)
  output.set(typeBytes, 4)
  output.set(data, 8)
  const crcInput = new Uint8Array(typeBytes.length + data.length)
  crcInput.set(typeBytes)
  crcInput.set(data, typeBytes.length)
  view.setUint32(output.length - 4, crc32(crcInput), false)
  return output
}

function fixturePng(): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const header = new Uint8Array(13)
  const headerView = new DataView(header.buffer)
  headerView.setUint32(0, 256, false)
  headerView.setUint32(4, 512, false)
  header.set([8, 6, 0, 0, 0], 8)
  const raw = new Uint8Array(512 * (1 + 256 * 4))
  for (let row = 0; row < 512; row += 1) {
    const offset = row * (1 + 256 * 4)
    raw[offset] = 0
    for (let column = 0; column < 256; column += 1) {
      const pixelOffset = offset + 1 + column * 4
      raw[pixelOffset] = 0x12
      raw[pixelOffset + 1] = 0x34
      raw[pixelOffset + 2] = 0x56
      raw[pixelOffset + 3] = 0xff
    }
  }
  const chunks = [chunk('IHDR', header), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array())]
  const length = signature.length + chunks.reduce((sum, value) => sum + value.length, 0)
  const output = new Uint8Array(length)
  output.set(signature)
  let offset = signature.length
  for (const value of chunks) {
    output.set(value, offset)
    offset += value.length
  }
  return output
}

async function fixture(): Promise<SpritePackContents> {
  const png = fixturePng()
  const hash = await sha256Hex(png)
  return {
    pack: {
      packSchemaVersion: 2,
      id: 'io.example.field-kit',
      version: '1.0.0',
      name: 'Field Kit',
      description: 'Original test wardrobe.',
      subjectProfile: 'humanoid-lpc-64',
      assets: [{
        schemaVersion: 2,
        id: 'field.torso.coat',
        name: 'Field coat',
        slot: 'torso',
        description: 'A practical coat.',
        source: { kind: 'sheet-v1', pngSha256: hash, sheetPath: `assets/${hash}.png`, width: 256, height: 512, sourceColorBindings: { '#123456': { kind: 'token', token: 'clothPrimary', shade: 0 } } },
        coverage: ['idle', 'walk'],
        provenanceId: 'field.coat.source',
      }],
      defaults: { body: null, hair: null, headwear: null, torso: 'field.torso.coat', legs: null, feet: null },
    },
    provenance: {
      'field.coat.source': {
        schemaVersion: 1,
        id: 'field.coat.source',
        author: 'Test Artist',
        source: 'Original test art',
        sourceUrl: 'https://example.com/field-kit',
        offeredLicenses: ['CC0-1.0'],
        chosenLicense: 'CC0-1.0',
        attributionText: null,
        authorRightsConfirmed: true,
      },
    },
    pngs: { [hash]: png },
  }
}

describe('spritepack format', () => {
  it('writes deterministic package bytes and restores exact content', async () => {
    const contents = await fixture()
    const first = await writeSpritePack(contents)
    const second = await writeSpritePack(contents)
    expect(first).toEqual(second)
    const read = await readSpritePack(first)
    expect(read.pack).toEqual(contents.pack)
    expect(read.provenance).toEqual(contents.provenance)
    expect(read.packageSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(read.packDocumentSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(read.manifest.entries.map(entry => entry.path)).toEqual([
      'pack.json',
      `assets/${Object.keys(contents.pngs)[0]}.png`,
      'provenance/field.coat.source.json',
      'README.txt',
    ])
  })

  it('rejects traversal and non-canonical paths', () => {
    for (const path of ['../pack.json', '/pack.json', 'C:/pack.json', 'a\\b.json', 'a//b.json']) expect(() => validateSpritePackPath(path)).toThrow()
  })

  it('rejects unlisted and checksum-tampered entries before returning content', async () => {
    const bytes = await writeSpritePack(await fixture())
    const entries = unzipSync(bytes)
    entries['extra.json'] = Uint8Array.from(canonicalJsonBytes({ leaked: true }))
    await expect(readSpritePack(zipSync(entries))).rejects.toMatchObject({ code: 'pack-invalid' })
    const original = unzipSync(bytes)
    original['pack.json'] = Uint8Array.from(canonicalJsonBytes({ replaced: true }))
    await expect(readSpritePack(zipSync(original))).rejects.toMatchObject({ code: 'pack-invalid' })
  })

  it('rejects unsupported future format before graph mutation', async () => {
    const bytes = await writeSpritePack(await fixture())
    const entries = unzipSync(bytes)
    const manifest = JSON.parse(new TextDecoder().decode(entries['pack-manifest.json']))
    entries['pack-manifest.json'] = Uint8Array.from(canonicalJsonBytes({ ...manifest, packFormatVersion: 2 }))
    await expect(readSpritePack(zipSync(entries))).rejects.toMatchObject({ code: 'unsupported-version' })
  })

  it('rejects encrypted and symbolic-link central-directory entries before extraction', async () => {
    const valid = await writeSpritePack(await fixture())
    const mutateFirstCentralEntry = (mutate: (view: DataView, offset: number) => void) => {
      const bytes = Uint8Array.from(valid)
      const view = new DataView(bytes.buffer)
      for (let offset = 0; offset <= bytes.length - 4; offset += 1) {
        if (view.getUint32(offset, true) === 0x02014b50) {
          mutate(view, offset)
          return bytes
        }
      }
      throw new Error('Central directory not found.')
    }
    const encrypted = mutateFirstCentralEntry((view, offset) => view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 1, true))
    await expect(readSpritePack(encrypted)).rejects.toMatchObject({ code: 'pack-invalid' })
    const symlink = mutateFirstCentralEntry((view, offset) => {
      view.setUint16(offset + 4, 3 << 8, true)
      view.setUint32(offset + 38, 0o120777 << 16, true)
    })
    await expect(readSpritePack(symlink)).rejects.toMatchObject({ code: 'pack-invalid' })
  })

  it('rejects excessive ZIP compression ratios with pack-limit', async () => {
    const compressed = zipSync({ 'large.txt': new Uint8Array(1024 * 1024) }, { level: 9 })
    await expect(readSpritePack(compressed)).rejects.toMatchObject({ code: 'pack-limit' })
  })
})