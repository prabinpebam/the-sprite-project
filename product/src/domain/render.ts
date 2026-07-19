import { packById, selectedAssets } from './packs'
import { resolvedTheme } from './project'
import { ANIMATIONS, DIRECTIONS, type AnimationId, type Direction, type MotionId, type PixelPart, type SpriteProject, type ThemeTokens } from './types'

export const FRAME_SIZE = 64
const LOGICAL_SIZE = 32
const SCALE = FRAME_SIZE / LOGICAL_SIZE
const SLOT_ORDER = ['body', 'legs', 'feet', 'torso', 'hair', 'headwear']

function adjust(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const shift = amount * 18
  const channel = (offset: number) => Math.max(0, Math.min(255, ((value >> offset) & 255) + shift))
  return `#${[channel(16), channel(8), channel(0)].map(item => item.toString(16).padStart(2, '0')).join('')}`
}

function colorFor(part: PixelPart, tokens: ThemeTokens): string {
  if (part.token === 'outline') return '#241d24'
  if (part.token === 'white') return '#e9e5d8'
  return adjust(tokens[part.token], part.shade ?? 0)
}

function motionOffset(motion: MotionId, animation: AnimationId, frame: number, direction: Direction): [number, number] {
  if (animation === 'idle') return motion === 'sway' ? [frame % 2, 0] : [0, 0]
  const cycle = [0, 1, 0, -1][frame % 4]
  const vertical = [0, -1, 0, 0][frame % 4]
  const horizontalDirection = direction === 'east' || direction === 'west'
  switch (motion) {
    case 'bob': return [0, vertical]
    case 'leftFoot': return horizontalDirection ? [cycle, 0] : [0, cycle]
    case 'rightFoot': return horizontalDirection ? [-cycle, 0] : [0, -cycle]
    case 'leftHand': return horizontalDirection ? [-cycle, vertical] : [0, -cycle + vertical]
    case 'rightHand': return horizontalDirection ? [cycle, vertical] : [0, cycle + vertical]
    case 'sway': return [cycle, vertical]
    default: return [0, 0]
  }
}

function drawPart(context: CanvasRenderingContext2D, part: PixelPart, tokens: ThemeTokens, animation: AnimationId, direction: Direction, frame: number): void {
  if (part.directions && !part.directions.includes(direction)) return
  const [dx, dy] = motionOffset(part.motion ?? 'none', animation, frame, direction)
  const x = part.x + dx
  const y = part.y + dy
  if (part.outline) {
    context.fillStyle = '#241d24'
    context.fillRect(x - 1, y - 1, part.width + 2, part.height + 2)
  }
  context.fillStyle = colorFor(part, tokens)
  context.fillRect(x, y, part.width, part.height)
}

export function drawFrame(canvas: HTMLCanvasElement, project: SpriteProject, frame = 0): void {
  canvas.width = FRAME_SIZE
  canvas.height = FRAME_SIZE
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) return
  context.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
  context.imageSmoothingEnabled = false
  context.save()
  context.scale(SCALE, SCALE)
  const pack = packById(project.packId)
  const tokens = resolvedTheme(project)
  const assets = selectedAssets(pack, project.character.selections)
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
  for (const item of assets) for (const part of item.parts) drawPart(context, part, tokens, project.preview.animation, project.preview.direction, frame)
  context.restore()
}

export function buildAnimationManifest() {
  const animations = {} as Record<string, { x: number; y: number; width: number; height: number; durationMs: number }[]>
  let row = 0
  for (const animation of ANIMATIONS) {
    for (const direction of DIRECTIONS) {
      const frameCount = animation === 'idle' ? 1 : 4
      animations[`${animation}_${direction}`] = Array.from({ length: frameCount }, (_, column) => ({
        x: column * FRAME_SIZE, y: row * FRAME_SIZE, width: FRAME_SIZE, height: FRAME_SIZE,
        durationMs: animation === 'idle' ? 1000 : 180,
      }))
      row += 1
    }
  }
  return { schemaVersion: 1, frameWidth: 64, frameHeight: 64, columns: 4, rows: 8, animations }
}

export function renderSpritesheet(project: SpriteProject): HTMLCanvasElement {
  const sheet = document.createElement('canvas')
  sheet.width = FRAME_SIZE * 4
  sheet.height = FRAME_SIZE * 8
  const context = sheet.getContext('2d')
  if (!context) return sheet
  context.imageSmoothingEnabled = false
  const frameCanvas = document.createElement('canvas')
  let row = 0
  for (const animation of ANIMATIONS) {
    for (const direction of DIRECTIONS) {
      const frameCount = animation === 'idle' ? 1 : 4
      for (let frame = 0; frame < 4; frame += 1) {
        drawFrame(frameCanvas, { ...project, preview: { ...project.preview, animation, direction } }, Math.min(frame, frameCount - 1))
        context.drawImage(frameCanvas, frame * FRAME_SIZE, row * FRAME_SIZE)
      }
      row += 1
    }
  }
  return sheet
}

export function pixelHash(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext('2d')
  if (!context) return '00000000'
  const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
