import { describe, expect, it } from 'vitest'
import { canonicalJson, canonicalJsonBytes } from './canonical'

describe('canonical JSON', () => {
  it('sorts object keys by Unicode code point and preserves array order', () => {
    expect(canonicalJson({ z: 1, '\u{10000}': 2, '\uE000': 3, nested: { b: 2, a: 1 }, list: ['b', 'a'] }))
      .toBe('{"list":["b","a"],"nested":{"a":1,"b":2},"z":1,"":3,"𐀀":2}\n')
  })

  it('uses shortest round-trippable numbers and converts negative zero', () => {
    expect(canonicalJson({ decimal: 1.2345678901234567, integer: 1, negativeZero: -0 }))
      .toBe('{"decimal":1.2345678901234567,"integer":1,"negativeZero":0}\n')
  })

  it('normalizes strings to NFC and emits UTF-8 without a BOM', () => {
    const bytes = canonicalJsonBytes({ name: 'Cafe\u0301' })
    expect(new TextDecoder().decode(bytes)).toBe('{"name":"Café"}\n')
    expect([...bytes.slice(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf])
  })

  it('is byte-idempotent after parsing canonical output', () => {
    const first = canonicalJson({ theme: { skin: '#f0c0a0', hair: '#201810' }, zoom: 5 })
    expect(canonicalJson(JSON.parse(first))).toBe(first)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite number %s',
    value => expect(() => canonicalJson({ value })).toThrow('non-finite numbers'),
  )

  it('rejects undefined properties and cyclic values instead of silently dropping them', () => {
    expect(() => canonicalJson({ missing: undefined })).toThrow('undefined values')
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => canonicalJson(cyclic)).toThrow('cyclic values')
  })

  it('rejects object keys that collide after NFC normalization', () => {
    expect(() => canonicalJson({ 'Café': 1, 'Cafe\u0301': 2 })).toThrow('key collision')
  })
})