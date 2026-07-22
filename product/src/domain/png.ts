import { zlibSync } from 'fflate'
import type { TerrainBitmap } from './terrain'

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
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

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, false)
  return bytes
}

function concat(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const body = concat([typeBytes, data])
  return concat([uint32(data.length), body, uint32(crc32(body))])
}

export function encodeRgbaPng(bitmap: TerrainBitmap): Uint8Array {
  if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.pixels.length !== bitmap.width * bitmap.height * 4) throw new Error('RGBA bitmap dimensions do not match its pixels.')
  const header = new Uint8Array(13)
  const headerView = new DataView(header.buffer)
  headerView.setUint32(0, bitmap.width, false)
  headerView.setUint32(4, bitmap.height, false)
  header.set([8, 6, 0, 0, 0], 8)
  const rowBytes = bitmap.width * 4
  const raw = new Uint8Array(bitmap.height * (rowBytes + 1))
  for (let row = 0; row < bitmap.height; row += 1) raw.set(bitmap.pixels.subarray(row * rowBytes, (row + 1) * rowBytes), row * (rowBytes + 1) + 1)
  return concat([PNG_SIGNATURE, chunk('IHDR', header), chunk('IDAT', zlibSync(raw, { level: 6 })), chunk('IEND', new Uint8Array())])
}