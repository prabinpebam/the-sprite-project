import { readSpritePack, type PackValidationStage, type ReadSpritePackResult } from '../domain/spritepack'

interface WorkerScope {
  onmessage: ((event: MessageEvent<{ bytes: Uint8Array }>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

const workerScope = self as unknown as WorkerScope

function transfersFor(result: ReadSpritePackResult): Transferable[] {
  const buffers = new Set<ArrayBuffer>()
  if (result.bytes.buffer instanceof ArrayBuffer) buffers.add(result.bytes.buffer)
  for (const bytes of Object.values(result.pngs)) if (bytes.buffer instanceof ArrayBuffer) buffers.add(bytes.buffer)
  return [...buffers]
}

workerScope.onmessage = event => {
  void readSpritePack(event.data.bytes, (stage: PackValidationStage) => workerScope.postMessage({ kind: 'progress', stage }))
    .then(result => workerScope.postMessage({ kind: 'success', result }, transfersFor(result)))
    .catch(error => workerScope.postMessage({
      kind: 'error',
      error: {
        code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'pack-invalid',
        message: error instanceof Error ? error.message : 'Pack validation failed.',
        operation: error && typeof error === 'object' && 'operation' in error ? String(error.operation) : 'pack:worker',
        recoverable: true,
        details: error && typeof error === 'object' && 'details' in error ? error.details : undefined,
      },
    }))
}
