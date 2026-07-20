import { ProductError } from './errors'
import { unzlibSync } from 'fflate'

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

function fail(message: string, details?: Record<string, string | number | boolean>): never {
  throw new ProductError({ code: 'image-invalid', message, operation: 'pack:image', recoverable: true, ...(details ? { details } : {}) })
}

export interface PngProfileSummary {
  width: 256
  height: 512
  colorType: 6
  bitDepth: 8
  interlace: 0
}

export function validateHumanoidSheetPng(bytes: Uint8Array): PngProfileSummary {
  if (bytes.length > 16 * 1024 * 1024) throw new ProductError({ code: 'pack-limit', message: 'PNG exceeds the 16 MiB asset limit.', operation: 'pack:image', recoverable: true, details: { observed: bytes.length, allowed: 16 * 1024 * 1024 } })
  if (bytes.length < 33 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) fail('PNG signature is invalid.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let summary: PngProfileSummary | null = null
  let sawImageData = false
  let sawEnd = false
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false)
    const chunkEnd = offset + 12 + length
    if (chunkEnd > bytes.length) fail('PNG chunk exceeds file bounds.')
    const typeBytes = bytes.subarray(offset + 4, offset + 8)
    const type = new TextDecoder('ascii', { fatal: true }).decode(typeBytes)
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    const expectedCrc = view.getUint32(offset + 8 + length, false)
    const crcInput = new Uint8Array(4 + length)
    crcInput.set(typeBytes)
    crcInput.set(data, 4)
    if (crc32(crcInput) !== expectedCrc) fail(`PNG ${type} CRC is invalid.`)
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) fail('PNG IHDR is malformed.')
      const width = view.getUint32(offset + 8, false)
      const height = view.getUint32(offset + 12, false)
      const bitDepth = bytes[offset + 16]
      const colorType = bytes[offset + 17]
      const compression = bytes[offset + 18]
      const filter = bytes[offset + 19]
      const interlace = bytes[offset + 20]
      if (width !== 256 || height !== 512 || bitDepth !== 8 || colorType !== 6 || compression !== 0 || filter !== 0 || interlace !== 0) {
        throw new ProductError({ code: 'image-profile-invalid', message: 'PNG must be a 256x512, 8-bit RGBA, non-interlaced sheet.', operation: 'pack:image-profile', recoverable: true, details: { width, height, bitDepth, colorType, interlace } })
      }
      summary = { width: 256, height: 512, bitDepth: 8, colorType: 6, interlace: 0 }
    } else if (type === 'IDAT') sawImageData = true
    else if (type === 'IEND') {
      if (length !== 0) fail('PNG IEND is malformed.')
      sawEnd = true
      if (chunkEnd !== bytes.length) fail('PNG contains bytes after IEND.')
      break
    }
    offset = chunkEnd
  }
  if (!summary || !sawImageData || !sawEnd) fail('PNG is missing required chunks.')
  return summary
}

export interface HumanoidSheetAnalysis extends PngProfileSummary {
  opaqueColors: { hex: `#${string}`; count: number }[]
  emptyCells: string[]
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const aboveDistance = Math.abs(estimate - above)
  const upperLeftDistance = Math.abs(estimate - upperLeft)
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance ? left : aboveDistance <= upperLeftDistance ? above : upperLeft
}

export function analyzeHumanoidSheetPng(bytes: Uint8Array): HumanoidSheetAnalysis {
  const summary = validateHumanoidSheetPng(bytes)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const imageDataChunks: Uint8Array[] = []
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false)
    const type = new TextDecoder('ascii').decode(bytes.subarray(offset + 4, offset + 8))
    if (type === 'IDAT') imageDataChunks.push(bytes.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
    if (type === 'IEND') break
  }
  const compressed = new Uint8Array(imageDataChunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let compressedOffset = 0
  for (const chunk of imageDataChunks) {
    compressed.set(chunk, compressedOffset)
    compressedOffset += chunk.length
  }
  let raw: Uint8Array
  try {
    raw = unzlibSync(compressed)
  } catch {
    fail('PNG image data cannot be decompressed.')
  }
  const rowBytes = 256 * 4
  const expected = 512 * (rowBytes + 1)
  if (raw.length !== expected) fail('PNG decompressed byte length is invalid.', { observed: raw.length, allowed: expected })
  const pixels = new Uint8Array(256 * 512 * 4)
  for (let row = 0; row < 512; row += 1) {
    const rawOffset = row * (rowBytes + 1)
    const filter = raw[rawOffset]
    if (filter > 4) fail('PNG row uses an unsupported filter.', { observed: filter, allowed: 4 })
    const outputOffset = row * rowBytes
    for (let column = 0; column < rowBytes; column += 1) {
      const source = raw[rawOffset + 1 + column]
      const left = column >= 4 ? pixels[outputOffset + column - 4] : 0
      const above = row > 0 ? pixels[outputOffset + column - rowBytes] : 0
      const upperLeft = row > 0 && column >= 4 ? pixels[outputOffset + column - rowBytes - 4] : 0
      const predictor = filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, upperLeft) : 0
      pixels[outputOffset + column] = (source + predictor) & 0xff
    }
  }
  const colors = new Map<`#${string}`, number>()
  const occupied = new Set<string>()
  for (let y = 0; y < 512; y += 1) for (let x = 0; x < 256; x += 1) {
    const pixelOffset = (y * 256 + x) * 4
    if (pixels[pixelOffset + 3] === 0) continue
    const hex = `#${[pixels[pixelOffset], pixels[pixelOffset + 1], pixels[pixelOffset + 2]].map(value => value.toString(16).padStart(2, '0')).join('')}` as `#${string}`
    colors.set(hex, (colors.get(hex) ?? 0) + 1)
    occupied.add(`${Math.floor(y / 64)}:${Math.floor(x / 64)}`)
  }
  if (colors.size > 256) throw new ProductError({ code: 'image-color-limit', message: 'PNG contains more than 256 non-transparent RGB colors.', operation: 'pack:image-colors', recoverable: true, details: { observed: colors.size, allowed: 256 } })
  const requiredCells = [
    ...Array.from({ length: 4 }, (_, direction) => ({ key: `${direction}:0`, label: `idle:${direction}:0` })),
    ...Array.from({ length: 4 }, (_, direction) => Array.from({ length: 4 }, (_, frame) => ({ key: `${direction + 4}:${frame}`, label: `walk:${direction}:${frame}` }))).flat(),
  ]
  return {
    ...summary,
    opaqueColors: [...colors].map(([hex, count]) => ({ hex, count })).sort((left, right) => right.count - left.count || left.hex.localeCompare(right.hex)),
    emptyCells: requiredCells.filter(cell => !occupied.has(cell.key)).map(cell => cell.label),
  }
}