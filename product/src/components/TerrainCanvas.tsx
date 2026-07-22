import { useEffect, useRef } from 'react'
import { cardinalMask, renderTerrainAtlas, renderTerrainMap, terrainPixelHash } from '../domain/terrain'
import type { TerrainDocumentV1 } from '../domain/types'

function paintBitmap(canvas: HTMLCanvasElement | null, bitmap: ReturnType<typeof renderTerrainMap>): void {
  if (!canvas) return
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) return
  context.imageSmoothingEnabled = false
  context.putImageData(new ImageData(Uint8ClampedArray.from(bitmap.pixels), bitmap.width, bitmap.height), 0, 0)
}

export function TerrainCanvas({ terrain, mode, onApply }: { terrain: TerrainDocumentV1; mode: 'paint' | 'erase'; onApply: (index: number) => void }) {
  const mapCanvas = useRef<HTMLCanvasElement>(null)
  const atlasCanvas = useRef<HTMLCanvasElement>(null)
  const atlas = renderTerrainAtlas(terrain)
  const renderHash = terrainPixelHash(atlas)

  useEffect(() => {
    paintBitmap(mapCanvas.current, renderTerrainMap(terrain))
    paintBitmap(atlasCanvas.current, atlas)
  }, [atlas, terrain])

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const column = index % 12
    const row = Math.floor(index / 12)
    const next = event.key === 'ArrowLeft' ? [column - 1, row]
      : event.key === 'ArrowRight' ? [column + 1, row]
        : event.key === 'ArrowUp' ? [column, row - 1]
          : event.key === 'ArrowDown' ? [column, row + 1]
            : null
    if (!next) return
    event.preventDefault()
    const nextIndex = Math.max(0, Math.min(7, next[1])) * 12 + Math.max(0, Math.min(11, next[0]))
    document.querySelector<HTMLButtonElement>(`[data-terrain-cell="${nextIndex}"]`)?.focus()
  }

  return (
    <div className="terrain-visuals">
      <section className="terrain-map-tool" aria-labelledby="terrain-map-heading">
        <div className="panel-heading"><div><p className="eyebrow">Verification canvas</p><h2 id="terrain-map-heading">12 × 8 preview map</h2></div><span>{mode === 'paint' ? 'Paint mode' : 'Erase mode'}</span></div>
        <div className="terrain-map-stage">
          <canvas ref={mapCanvas} className="terrain-map-canvas" aria-hidden="true" />
          <div className="terrain-cell-grid" role="grid" aria-label="Terrain preview map">
            {terrain.map.occupied.map((occupied, index) => {
              const row = Math.floor(index / 12)
              const column = index % 12
              const mask = cardinalMask(terrain, column, row)
              return <button key={index} type="button" role="gridcell" data-terrain-cell={index} aria-label={`Row ${row + 1}, column ${column + 1}, ${occupied ? `occupied, mask ${mask}` : 'empty'}`} aria-pressed={occupied} onKeyDown={event => moveFocus(event, index)} onClick={() => onApply(index)} />
            })}
          </div>
        </div>
      </section>
      <section className="terrain-atlas-tool" aria-labelledby="terrain-atlas-heading">
        <div className="panel-heading"><div><p className="eyebrow">Export source</p><h2 id="terrain-atlas-heading">Generated autotile atlas</h2></div><span>128 × 128</span></div>
        <div className="terrain-atlas-stage"><canvas ref={atlasCanvas} className="terrain-atlas-canvas" aria-label="Generated autotile atlas" data-render-hash={renderHash} /></div>
        <div className="terrain-mask-legend" aria-label="Cardinal mask legend">{Array.from({ length: 16 }, (_, mask) => <span key={mask}><strong>{mask}</strong><small>{[mask & 1 ? 'N' : '', mask & 2 ? 'E' : '', mask & 4 ? 'S' : '', mask & 8 ? 'W' : ''].filter(Boolean).join('') || 'none'}</small></span>)}</div>
        <p className="terrain-hash">Atlas #{renderHash}</p>
      </section>
    </div>
  )
}