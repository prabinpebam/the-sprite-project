import { useEffect, useRef, useState } from 'react'
import { drawFrame, pixelHash } from '../domain/render'
import type { ContentPack, SpriteProject } from '../domain/types'

interface SpriteCanvasProps {
  project: SpriteProject
  pack?: ContentPack
  compact?: boolean
}

export function SpriteCanvas({ project, pack, compact = false }: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState(0)
  const [hash, setHash] = useState('00000000')

  useEffect(() => {
    setFrame(0)
  }, [project.preview.animation, project.preview.direction])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawFrame(canvas, project, frame, pack)
    setHash(pixelHash(canvas))
  }, [frame, pack, project])

  useEffect(() => {
    if (!project.preview.playing || project.preview.animation === 'idle') return
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = globalThis.setInterval(
      () => setFrame(value => (value + 1) % 4),
      Math.round(180 / project.preview.speed),
    )
    return () => globalThis.clearInterval(timer)
  }, [project.preview.animation, project.preview.playing, project.preview.speed])

  const zoom = compact ? Math.min(project.preview.zoom, 4) : project.preview.zoom
  return (
    <div className="sprite-stage" data-testid="sprite-stage">
      <div className="sprite-grid" style={{ '--sprite-size': `${64 * zoom}px` } as React.CSSProperties}>
        <canvas
          ref={canvasRef}
          className="sprite-canvas"
          role="img"
          aria-label={`${project.character.name}, ${project.preview.animation}, facing ${project.preview.direction}`}
          data-frame={frame}
          data-render-hash={hash}
        />
      </div>
      <div className="sprite-meta" aria-label="Preview status">
        <span>{project.preview.animation}</span>
        <span>{project.preview.direction}</span>
        <span>{zoom}x</span>
        <span className="hash">#{hash}</span>
      </div>
    </div>
  )
}
