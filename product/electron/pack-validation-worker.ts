import { parentPort } from 'node:worker_threads'
import { readSpritePack, type ReadSpritePackResult } from '../src/domain/spritepack'

if (!parentPort) throw new Error('Pack validation worker requires a parent port.')

function transfersFor(result: ReadSpritePackResult): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>()
  if (result.bytes.buffer instanceof ArrayBuffer) buffers.add(result.bytes.buffer)
  for (const bytes of Object.values(result.pngs)) if (bytes.buffer instanceof ArrayBuffer) buffers.add(bytes.buffer)
  return [...buffers]
}

parentPort.on('message', (message: { bytes: Uint8Array }) => {
  void readSpritePack(message.bytes, stage => parentPort.postMessage({ kind: 'progress', stage }))
    .then(result => parentPort.postMessage({ kind: 'success', result }, transfersFor(result)))
    .catch(error => parentPort.postMessage({
      kind: 'error',
      error: {
        code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'pack-invalid',
        message: error instanceof Error ? error.message : 'Pack validation failed.',
        operation: error && typeof error === 'object' && 'operation' in error ? String(error.operation) : 'pack:worker',
        recoverable: true,
        details: error && typeof error === 'object' && 'details' in error ? error.details : undefined,
      },
    }))
})
