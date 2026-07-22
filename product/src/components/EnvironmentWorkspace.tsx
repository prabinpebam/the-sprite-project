import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Eraser, PaintBucket, Paintbrush, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { createTerrainDocument, deriveTerrainPalette, TERRAIN_MATERIALS } from '../domain/terrain'
import { isValidHex } from '../domain/themes'
import type { TerrainColorRole, TerrainDocumentV1, TerrainMaterialId, ThemeTokens } from '../domain/types'
import { TerrainCanvas } from './TerrainCanvas'

const COLOR_ROLES: { id: TerrainColorRole; label: string; description: string }[] = [
  { id: 'surface', label: 'Surface', description: 'Primary interior fill.' },
  { id: 'detail', label: 'Detail', description: 'Sparse procedural texture marks.' },
  { id: 'edge', label: 'Edge', description: 'Top and left open borders.' },
  { id: 'shadow', label: 'Shadow', description: 'Bottom and right open borders.' },
]

function updated(terrain: TerrainDocumentV1, patch: Partial<TerrainDocumentV1>): TerrainDocumentV1 {
  return { ...terrain, ...patch, updatedAt: new Date().toISOString() }
}

export function EnvironmentWorkspace({ terrain, theme, onChange, onOpenExport, onRequestRemove, onAnnouncement }: {
  terrain: TerrainDocumentV1 | null
  theme: ThemeTokens
  onChange: (terrain: TerrainDocumentV1) => void
  onOpenExport: () => void
  onRequestRemove: () => void
  onAnnouncement: (message: string) => void
}) {
  const [mode, setMode] = useState<'paint' | 'erase'>('paint')
  const [drafts, setDrafts] = useState<Partial<Record<TerrainColorRole, string>>>({})

  useEffect(() => setDrafts({}), [terrain?.id, terrain?.materialId])

  if (!terrain) return (
    <section className="view" aria-labelledby="terrain-heading">
      <div className="view-heading"><div><p className="eyebrow">Second producer</p><h1 id="terrain-heading">Terrain</h1></div></div>
      <div className="terrain-empty">
        <PaintBucket />
        <h2>Create a cardinal autotile set</h2>
        <p>Add a fixed 32px terrain atlas and paintable test map to this project. The existing character remains unchanged.</p>
        <div className="project-facts"><div><span>Masks</span><strong>16 cardinal</strong></div><div><span>Tiles</span><strong>32 × 32 px</strong></div><div><span>Preview</span><strong>12 × 8</strong></div><div><span>Materials</span><strong>4 built-in</strong></div></div>
        <button className="button primary" type="button" onClick={() => { onChange(createTerrainDocument(theme)); onAnnouncement('Grass terrain created with all 96 preview cells filled.') }}><PaintBucket /> Create terrain</button>
      </div>
    </section>
  )

  const changeMaterial = (materialId: TerrainMaterialId) => {
    setDrafts({})
    onChange(updated(terrain, { materialId, palette: deriveTerrainPalette(theme, materialId) }))
    onAnnouncement(`${TERRAIN_MATERIALS[materialId].name} terrain selected.`)
  }

  const changeColor = (role: TerrainColorRole, value: string) => {
    setDrafts(current => ({ ...current, [role]: value }))
    if (!isValidHex(value)) return
    onChange(updated(terrain, { palette: { ...terrain.palette, [role]: value as `#${string}` } }))
    onAnnouncement(`${COLOR_ROLES.find(item => item.id === role)?.label} terrain color updated.`)
  }

  const updateOccupancy = (occupied: boolean[]) => onChange(updated(terrain, { map: { ...terrain.map, occupied } }))

  return (
    <section className="view terrain-view" aria-labelledby="terrain-heading">
      <div className="view-heading"><div><p className="eyebrow">Second producer</p><h1 id="terrain-heading">{terrain.name}</h1></div><div className="action-row"><button className="button secondary destructive" type="button" onClick={onRequestRemove}><Trash2 /> Remove terrain</button><button className="button primary" type="button" onClick={onOpenExport}><Download /> Open terrain export</button></div></div>

      <fieldset className="terrain-material-list"><legend>Built-in material</legend>{(Object.values(TERRAIN_MATERIALS)).map(material => {
        const palette = material.id === terrain.materialId ? terrain.palette : deriveTerrainPalette(theme, material.id)
        return <label key={material.id} className="terrain-material"><input type="radio" name="terrain-material" checked={terrain.materialId === material.id} onChange={() => changeMaterial(material.id)} /><span className="terrain-material-swatches">{COLOR_ROLES.map(role => <i key={role.id} style={{ backgroundColor: palette[role.id] }} />)}</span><span><strong>{material.name}</strong><small>{material.description}</small></span></label>
      })}</fieldset>

      <section className="terrain-section" aria-labelledby="terrain-palette-heading"><div className="panel-heading"><div><p className="eyebrow">Local colors</p><h2 id="terrain-palette-heading">Terrain palette</h2></div><button className="button quiet" type="button" onClick={() => { setDrafts({}); onChange(updated(terrain, { palette: deriveTerrainPalette(theme, terrain.materialId) })); onAnnouncement('Terrain palette reset from the current project theme.') }}><RotateCcw /> Reset terrain theme</button></div><div className="terrain-palette">{COLOR_ROLES.map(role => {
        const draft = drafts[role.id] ?? terrain.palette[role.id]
        const invalid = !isValidHex(draft)
        return <div key={role.id}><span className="color-swatch" style={{ backgroundColor: terrain.palette[role.id] }} aria-hidden="true" /><label htmlFor={`terrain-color-${role.id}`}><strong>{role.label}</strong><small>{role.description}</small></label><div className="token-input"><input id={`terrain-color-${role.id}`} aria-label={`${role.label} terrain hex color`} aria-invalid={invalid} value={draft} onChange={event => changeColor(role.id, event.target.value)} />{invalid && <small className="field-error">Use #RRGGBB</small>}</div></div>
      })}</div></section>

      <section className="terrain-tools" aria-label="Terrain paint tools"><div className="segmented terrain-mode" role="radiogroup" aria-label="Paint mode"><label title="Paint"><input type="radio" name="terrain-mode" aria-label="Paint" checked={mode === 'paint'} onChange={() => setMode('paint')} /><span><Paintbrush /><b>Paint</b></span></label><label title="Erase"><input type="radio" name="terrain-mode" aria-label="Erase" checked={mode === 'erase'} onChange={() => setMode('erase')} /><span><Eraser /><b>Erase</b></span></label></div><div className="action-row"><button className="button secondary" type="button" onClick={() => { updateOccupancy(Array.from({ length: 96 }, () => true)); onAnnouncement('Terrain preview map filled.') }}><PaintBucket /> Fill map</button><button className="button secondary" type="button" onClick={() => { updateOccupancy(Array.from({ length: 96 }, () => false)); onAnnouncement('Terrain preview map cleared.') }}><Trash2 /> Clear map</button></div></section>

      <TerrainCanvas terrain={terrain} mode={mode} onApply={index => {
        const occupied = [...terrain.map.occupied]
        occupied[index] = mode === 'paint'
        if (occupied[index] === terrain.map.occupied[index]) return
        updateOccupancy(occupied)
        onAnnouncement(`${mode === 'paint' ? 'Painted' : 'Erased'} terrain row ${Math.floor(index / 12) + 1}, column ${index % 12 + 1}.`)
      }} />

      <div className="readiness ready terrain-readiness" role="status" aria-label="Terrain status"><div className="readiness-icon"><CheckCircle2 /></div><div><p className="eyebrow">Terrain status</p><h2>Ready</h2><p><ShieldCheck /> {TERRAIN_MATERIALS[terrain.materialId].name} · 16 masks · complete CC0 provenance</p></div></div>
    </section>
  )
}