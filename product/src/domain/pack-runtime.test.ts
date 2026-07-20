import { describe, expect, it } from 'vitest'
import { recolorSheetCell } from './pack-runtime'
import { presetById } from './themes'

describe('pack runtime', () => {
  it('replaces bound RGB while preserving alpha and clears transparent RGB', () => {
    const source = new Uint8ClampedArray([
      0x12, 0x34, 0x56, 1,
      0x12, 0x34, 0x56, 128,
      0x12, 0x34, 0x56, 255,
      0xff, 0x00, 0xff, 0,
    ])
    const tokens = presetById('hearth').tokens
    const output = recolorSheetCell(source, { '#123456': { kind: 'token', token: 'clothPrimary', shade: 0 } }, tokens)
    expect([...output.slice(0, 3)]).toEqual([...output.slice(4, 7)])
    expect([...output.slice(4, 7)]).toEqual([...output.slice(8, 11)])
    expect([output[3], output[7], output[11]]).toEqual([1, 128, 255])
    expect([...output.slice(12)]).toEqual([0, 0, 0, 0])
  })
})