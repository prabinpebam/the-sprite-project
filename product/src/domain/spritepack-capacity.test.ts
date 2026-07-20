import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { readSpritePack, validateSpritePackPath, writeSpritePack } from './spritepack'
import { spritePackFixture } from './spritepack-test-fixture'

function mutateCentralSizes(bytesValue: Uint8Array, expandedSize: number, compressedSize = expandedSize): Uint8Array {
  const bytes = Uint8Array.from(bytesValue)
  const view = new DataView(bytes.buffer)
  for (let offset = 0; offset <= bytes.length - 46; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) {
      view.setUint32(offset + 20, compressedSize, true)
      view.setUint32(offset + 24, expandedSize, true)
      const nameLength = view.getUint16(offset + 28, true)
      const extraLength = view.getUint16(offset + 30, true)
      const commentLength = view.getUint16(offset + 32, true)
      offset += 45 + nameLength + extraLength + commentLength
    }
  }
  return bytes
}

describe('spritepack exact capacity boundaries', () => {
  it('accepts 128 assets and rejects 129 with pack-limit', async () => {
    const contents = await spritePackFixture()
    const base = contents.pack.assets[0]
    contents.pack.assets = Array.from({ length: 128 }, (_, index) => ({ ...base, id: `field.torso.coat.${index}`, name: `Field coat ${index}` }))
    contents.pack.defaults.torso = contents.pack.assets[0].id
    const maximum = await writeSpritePack(contents)
    expect((await readSpritePack(maximum)).pack.assets).toHaveLength(128)
    contents.pack.assets.push({ ...base, id: 'field.torso.coat.128', name: 'Field coat 128' })
    await expect(writeSpritePack(contents)).rejects.toMatchObject({ code: 'pack-limit' })
  })

  it('rejects one entry above the 256-entry container boundary', async () => {
    const entries = Object.fromEntries(Array.from({ length: 257 }, (_, index) => [`entry-${index}.txt`, new Uint8Array()]))
    await expect(readSpritePack(zipSync(entries))).rejects.toMatchObject({ code: 'pack-limit' })
  })

  it('rejects one byte above text and PNG expanded-entry boundaries', async () => {
    const text = mutateCentralSizes(zipSync({ 'large.txt': new Uint8Array([1]) }, { level: 0 }), 4 * 1024 * 1024 + 1)
    await expect(readSpritePack(text)).rejects.toMatchObject({ code: 'pack-limit' })
    const png = mutateCentralSizes(zipSync({ 'assets/source.png': new Uint8Array([1]) }, { level: 0 }), 16 * 1024 * 1024 + 1)
    await expect(readSpritePack(png)).rejects.toMatchObject({ code: 'pack-limit' })
  })

  it('rejects one byte above the 128 MiB total expanded boundary', async () => {
    const entries = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`assets/source-${index}.png`, new Uint8Array([index])]))
    const expandedPerEntry = Math.floor((128 * 1024 * 1024) / 9) + 1
    const total = mutateCentralSizes(zipSync(entries, { level: 0 }), expandedPerEntry)
    await expect(readSpritePack(total)).rejects.toMatchObject({ code: 'pack-limit' })
  })

  it('rejects one UTF-8 byte above the canonical path boundary', () => {
    expect(() => validateSpritePackPath(`${'a'.repeat(177)}.txt`)).toThrowError(expect.objectContaining({ code: 'pack-limit' }))
  })
})
