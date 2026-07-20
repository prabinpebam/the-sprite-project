import { ProductError, type HostErrorCode } from './errors'
import type { PackValidationStage, ReadSpritePackResult } from './spritepack'

export interface PackValidationProgress {
  stage: 'queued' | PackValidationStage
  elapsedMs: number
}

type WorkerMessage =
  | { kind: 'progress'; stage: PackValidationStage }
  | { kind: 'success'; result: ReadSpritePackResult }
  | { kind: 'error'; error: { code: string; message: string; operation: string; recoverable: boolean; details?: Record<string, string | number | boolean> } }

export function readSpritePackResponsive(bytes: Uint8Array, onProgress?: (progress: PackValidationProgress) => void): Promise<ReadSpritePackResult> {
  const worker = new Worker(new URL('../workers/pack-validation.worker.ts', import.meta.url), { type: 'module' })
  const started = performance.now()
  let stage: PackValidationProgress['stage'] = 'queued'
  const report = () => onProgress?.({ stage, elapsedMs: performance.now() - started })
  report()
  const timer = globalThis.setInterval(report, 400)

  return new Promise((resolve, reject) => {
    const finish = () => {
      globalThis.clearInterval(timer)
      worker.terminate()
    }
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message.kind === 'progress') {
        stage = message.stage
        report()
      } else if (message.kind === 'success') {
        finish()
        resolve(message.result)
      } else {
        finish()
        reject(new ProductError({ ...message.error, code: message.error.code as HostErrorCode }))
      }
    }
    worker.onerror = event => {
      finish()
      reject(new ProductError({ code: 'pack-invalid', message: event.message || 'Pack validation worker failed.', operation: 'pack:worker', recoverable: true }))
    }
    const transfer = bytes.buffer instanceof ArrayBuffer ? [bytes.buffer] : []
    worker.postMessage({ bytes }, transfer)
  })
}
