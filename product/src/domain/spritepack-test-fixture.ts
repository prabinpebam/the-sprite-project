import { strToU8, zlibSync } from 'fflate'
import { sha256Hex } from './sha256'
import { writeSpritePack, type SpritePackContents } from './spritepack'

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

export function spritePackFixturePng(): Uint8Array {
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
  const output = new Uint8Array(signature.length + chunks.reduce((sum, value) => sum + value.length, 0))
  output.set(signature)
  let offset = signature.length
  for (const value of chunks) {
    output.set(value, offset)
    offset += value.length
  }
  return output
}

function deterministicNoise(length: number, seed: number): Uint8Array {
  const output = new Uint8Array(length)
  let state = seed >>> 0
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    output[index] = state >>> 24
  }
  return output
}

export function paddedSpritePackFixturePng(paddingBytes: number, seed: number): Uint8Array {
  const base = spritePackFixturePng()
  const ancillary = chunk('npAD', deterministicNoise(paddingBytes, seed))
  const output = new Uint8Array(base.length + ancillary.length)
  output.set(base.subarray(0, base.length - 12))
  output.set(ancillary, base.length - 12)
  output.set(base.subarray(base.length - 12), base.length - 12 + ancillary.length)
  return output
}

export async function spritePackFixture(version = '1.0.0', description = 'Original test wardrobe.'): Promise<SpritePackContents> {
  const png = spritePackFixturePng()
  const hash = await sha256Hex(png)
  return {
    pack: {
      packSchemaVersion: 2,
      id: 'io.example.field-kit',
      version,
      name: 'Field Kit',
      description,
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

export async function spritePackFixtureBytes(version = '1.0.0', description = 'Original test wardrobe.'): Promise<Uint8Array> {
  return writeSpritePack(await spritePackFixture(version, description))
}

export async function completeSpritePackFixtureBytes(): Promise<Uint8Array> {
  const contents = await spritePackFixture()
  const base = contents.pack.assets[0]
  contents.pack.id = 'io.example.complete-kit'
  contents.pack.name = 'Complete Kit'
  contents.pack.description = 'Complete required-slot test content.'
  contents.pack.assets = (['body', 'torso', 'legs', 'feet'] as const).map(slot => ({ ...base, id: `complete.${slot}.base`, name: `Complete ${slot}`, slot }))
  contents.pack.defaults = { body: 'complete.body.base', hair: null, headwear: null, torso: 'complete.torso.base', legs: 'complete.legs.base', feet: 'complete.feet.base' }
  return writeSpritePack(contents)
}

export async function largeSpritePackFixtureBytes(assetCount = 8, paddingBytes = Math.floor(7.9 * 1024 * 1024)): Promise<Uint8Array> {
  const pngs: Record<string, Uint8Array> = {}
  const assets = []
  const provenance: SpritePackContents['provenance'] = {}
  for (let index = 0; index < assetCount; index += 1) {
    const png = paddedSpritePackFixturePng(paddingBytes, index + 1)
    const hash = await sha256Hex(png)
    const assetId = `field.torso.coat.${index}`
    const provenanceId = `field.coat.source.${index}`
    pngs[hash] = png
    assets.push({
      schemaVersion: 2 as const,
      id: assetId,
      name: `Field coat ${index}`,
      slot: 'torso' as const,
      description: 'A practical benchmark coat.',
      source: { kind: 'sheet-v1' as const, pngSha256: hash, sheetPath: `assets/${hash}.png`, width: 256 as const, height: 512 as const, sourceColorBindings: { '#123456': { kind: 'token' as const, token: 'clothPrimary' as const, shade: 0 as const } } },
      coverage: ['idle', 'walk'] as ['idle', 'walk'],
      provenanceId,
    })
    provenance[provenanceId] = {
      schemaVersion: 1,
      id: provenanceId,
      author: 'Benchmark Artist',
      source: `Benchmark source ${index}`,
      sourceUrl: `https://example.com/benchmark/${index}`,
      offeredLicenses: ['CC0-1.0'],
      chosenLicense: 'CC0-1.0',
      attributionText: null,
      authorRightsConfirmed: true,
    }
  }
  return writeSpritePack({
    pack: {
      packSchemaVersion: 2,
      id: 'io.example.large-benchmark',
      version: '1.0.0',
      name: 'Large Benchmark Pack',
      description: 'Deterministic near-maximum validation fixture.',
      subjectProfile: 'humanoid-lpc-64',
      assets,
      defaults: { body: null, hair: null, headwear: null, torso: assets[0]?.id ?? null, legs: null, feet: null },
    },
    provenance,
    pngs,
  })
}
