export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, character => character.codePointAt(0) ?? 0)
  const rightPoints = Array.from(right, character => character.codePointAt(0) ?? 0)
  const count = Math.min(leftPoints.length, rightPoints.length)

  for (let index = 0; index < count; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index]
  }

  return leftPoints.length - rightPoints.length
}

function canonicalize(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.normalize('NFC')
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON does not support non-finite numbers.')
    return Object.is(value, -0) ? 0 : value
  }

  if (typeof value !== 'object') {
    throw new TypeError(`Canonical JSON does not support ${typeof value} values.`)
  }
  if (ancestors.has(value)) throw new TypeError('Canonical JSON does not support cyclic values.')

  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.map(item => canonicalize(item, ancestors))
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError('Canonical JSON supports only plain objects and arrays.')
    }

    const result: Record<string, JsonValue> = {}
    for (const key of Object.keys(value).sort(compareCodePoints)) {
      const normalizedKey = key.normalize('NFC')
      if (Object.hasOwn(result, normalizedKey)) {
        throw new TypeError(`Canonical JSON key collision after NFC normalization: ${normalizedKey}`)
      }
      result[normalizedKey] = canonicalize((value as Record<string, unknown>)[key], ancestors)
    }
    return result
  } finally {
    ancestors.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value, new Set()))}\n`
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value))
}