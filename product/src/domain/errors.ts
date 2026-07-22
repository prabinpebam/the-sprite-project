export const HOST_ERROR_CODES = [
  'cancelled',
  'invalid-payload',
  'invalid-project',
  'unsupported-version',
  'missing-pack',
  'revision-conflict',
  'external-modification',
  'path-not-approved',
  'path-missing',
  'path-conflict',
  'permission-denied',
  'storage-full',
  'archive-invalid',
  'archive-limit',
  'atomic-replace-unavailable',
  'io-failed',
  'pack-invalid',
  'pack-limit',
  'pack-conflict',
  'pack-missing',
  'pack-in-use',
  'pack-disabled',
  'draft-conflict',
  'draft-limit',
  'invalid-character-name',
  'character-limit',
  'image-invalid',
  'image-profile-invalid',
  'image-color-limit',
  'color-binding-invalid',
  'coverage-incomplete',
  'provenance-invalid',
  'unsupported-license',
] as const

export type HostErrorCode = (typeof HOST_ERROR_CODES)[number]

export interface HostError {
  code: HostErrorCode
  message: string
  operation: string
  recoverable: boolean
  details?: Record<string, string | number | boolean>
}

export type HostResult<T> = { ok: true; value: T } | { ok: false; error: HostError }

export class ProductError extends Error {
  readonly code: HostErrorCode
  readonly operation: string
  readonly recoverable: boolean
  readonly details?: Record<string, string | number | boolean>

  constructor(error: HostError) {
    super(error.message)
    this.name = 'ProductError'
    this.code = error.code
    this.operation = error.operation
    this.recoverable = error.recoverable
    this.details = error.details
  }

  toHostError(): HostError {
    return {
      code: this.code,
      message: this.message,
      operation: this.operation,
      recoverable: this.recoverable,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}