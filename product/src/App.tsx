import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Box, Check, CheckCircle2, Download, FileArchive, FolderOpen,
  Gamepad2, Info, Layers3, Palette, Pause, Pencil, Play, Plus, RotateCcw,
  Save, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import './App.css'
import { SpriteCanvas } from './components/SpriteCanvas'
import { buildPackage, downloadBytes } from './domain/export'
import { assetsForSlot, packById, PACKS } from './domain/packs'
import {
  createProject, creditsFor, exportBlockers, isExportReady, resolvedTheme,
  switchPack, touch,
} from './domain/project'
import { loadProject, saveProject } from './domain/storage'
import { isValidHex, presetById, THEME_PRESETS, TOKEN_DESCRIPTIONS, TOKEN_LABELS } from './domain/themes'
import {
  DIRECTIONS, REQUIRED_SLOTS, SLOT_IDS, TOKEN_IDS,
  type AnimationId, type Direction, type SlotId, type SpriteProject, type TokenId,
} from './domain/types'

type ViewId = 'project' | 'compose' | 'theme' | 'preview' | 'export'
type DialogMode = 'new' | 'rename' | null

const NAV_ITEMS = [
  { id: 'project' as const, label: 'Project', icon: FolderOpen },
  { id: 'compose' as const, label: 'Compose', icon: Layers3 },
  { id: 'theme' as const, label: 'Theme', icon: Palette },
  { id: 'preview' as const, label: 'Preview', icon: Play },
  { id: 'export' as const, label: 'Export', icon: Download },
]

function ProjectDialog({ mode, initialName, onCancel, onSubmit }: {
  mode: Exclude<DialogMode, null>
  initialName: string
  onCancel: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState(initialName)
  const valid = Boolean(name.trim())
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Local project</p>
            <h2 id="project-dialog-title">{mode === 'new' ? 'New project' : 'Rename project'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cancel" onClick={onCancel}><X /></button>
        </div>
        <label className="field">
          <span>Project name</span>
          <input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && valid) onSubmit(name.trim())
            if (event.key === 'Escape') onCancel()
          }} />
          {!valid && <small className="field-error">Enter a project name.</small>}
        </label>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" disabled={!valid} onClick={() => onSubmit(name.trim())}>
            {mode === 'new' ? 'Create project' : 'Save name'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusStrip({ blockers }: { blockers: string[] }) {
  const ready = blockers.length === 0
  return (
    <div className={`status-strip ${ready ? 'ready' : 'blocked'}`} role="status" aria-label="Composition status">
      {ready ? <CheckCircle2 /> : <AlertTriangle />}
      <div>
        <strong>{ready ? 'Complete recipe' : `${blockers.length} blocking item${blockers.length === 1 ? '' : 's'}`}</strong>
        <span>{ready ? 'Idle and walk are covered in four directions.' : blockers.join(' ')}</span>
      </div>
    </div>
  )
}

function App() {
  const initial = useMemo(() => loadProject(), [])
  const [project, setProject] = useState<SpriteProject | null>(initial.project)
  const [loadError, setLoadError] = useState(initial.error)
  const [view, setView] = useState<ViewId>('project')
  const [selectedSlot, setSelectedSlot] = useState<SlotId>('body')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [dirty, setDirty] = useState(false)
  const [announcement, setAnnouncement] = useState(initial.project ? 'Saved project restored.' : 'No project open.')
  const [exportStatus, setExportStatus] = useState('No package generated in this session.')
  const [colorDrafts, setColorDrafts] = useState<Partial<Record<TokenId, string>>>({})
  const newProjectButton = useRef<HTMLButtonElement>(null)
  const renameButton = useRef<HTMLButtonElement>(null)

  const pack = project ? packById(project.packId) : null
  const blockers = project ? exportBlockers(project) : []
  const ready = project ? isExportReady(project) : false
  const selectedAsset = project && pack
    ? pack.assets.find(item => item.id === project.character.selections[selectedSlot]) ?? null
    : null

  const updateProject = (updater: (current: SpriteProject) => SpriteProject, message?: string) => {
    setProject(current => current ? touch(updater(current)) : current)
    setDirty(true)
    if (message) setAnnouncement(message)
  }

  const closeDialog = () => {
    const mode = dialogMode
    setDialogMode(null)
    requestAnimationFrame(() => (mode === 'rename' ? renameButton.current : newProjectButton.current)?.focus())
  }

  const submitProjectDialog = (name: string) => {
    if (dialogMode === 'new') {
      const next = createProject(name)
      setProject(next)
      setLoadError(null)
      setDirty(true)
      setView('project')
      setAnnouncement(`${name} created with a complete Wayfarer starter character.`)
    } else if (project) {
      updateProject(current => ({ ...current, name }), `Project renamed to ${name}.`)
    }
    setDialogMode(null)
  }

  const handleSave = () => {
    if (!project) return
    saveProject(project)
    setDirty(false)
    setAnnouncement('Project saved locally.')
  }

  const restoreSafeProject = () => {
    const next = project ? switchPack(project, project.packId) : createProject('Recovered project')
    setProject(next)
    setLoadError(null)
    setDirty(true)
    setView('project')
    setAnnouncement('Safe project restored with compatible pack defaults.')
  }

  const handlePackChange = (packId: string) => {
    if (!project) return
    const nextPack = packById(packId)
    setProject(switchPack(project, packId))
    setSelectedSlot('body')
    setDirty(true)
    setAnnouncement(`${nextPack.name} selected. Incompatible selections were replaced with pack defaults.`)
  }

  const selectAsset = (assetId: string) => updateProject(current => ({
    ...current,
    character: {
      ...current.character,
      selections: { ...current.character.selections, [selectedSlot]: assetId },
    },
  }), `${pack?.assets.find(item => item.id === assetId)?.name ?? 'Asset'} selected for ${selectedSlot}.`)

  const clearSlot = () => updateProject(current => ({
    ...current,
    character: { ...current.character, selections: { ...current.character.selections, [selectedSlot]: null } },
  }), `${selectedSlot} cleared.`)

  const applyPreset = (presetId: string) => {
    const preset = presetById(presetId)
    setColorDrafts({})
    updateProject(current => ({ ...current, themePresetId: preset.id, theme: { ...preset.tokens } }), `${preset.name} theme applied.`)
  }

  const tokenValue = (token: TokenId) => project ? resolvedTheme(project)[token] : '#000000'
  const changeToken = (token: TokenId, value: string) => {
    setColorDrafts(current => ({ ...current, [token]: value }))
    if (!project || !isValidHex(value)) return
    updateProject(current => current.character.overrides[token]
      ? { ...current, character: { ...current.character, overrides: { ...current.character.overrides, [token]: value } } }
      : { ...current, theme: { ...current.theme, [token]: value } }, `${TOKEN_LABELS[token]} updated.`)
  }

  const toggleOverride = (token: TokenId, enabled: boolean) => updateProject(current => {
    const overrides = { ...current.character.overrides }
    if (enabled) overrides[token] = current.theme[token]
    else delete overrides[token]
    return { ...current, character: { ...current.character, overrides } }
  }, enabled ? `${TOKEN_LABELS[token]} now uses a character override.` : `${TOKEN_LABELS[token]} now uses the project theme.`)

  const resetOverride = (token: TokenId) => {
    setColorDrafts(current => ({ ...current, [token]: project?.theme[token] }))
    toggleOverride(token, false)
  }

  const setPreview = (patch: Partial<SpriteProject['preview']>) => updateProject(current => ({
    ...current, preview: { ...current.preview, ...patch },
  }))

  const runExport = async (target: 'generic' | 'godot') => {
    if (!project || !ready) return
    setExportStatus(`Building ${target} package...`)
    try {
      const result = await buildPackage(project, target)
      downloadBytes(result.bytes, result.filename)
      setExportStatus(`${result.filename} downloaded. Render #${result.renderHash}.`)
      setAnnouncement(`${target === 'godot' ? 'Godot 4' : 'Generic'} package downloaded.`)
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'Export failed.')
    }
  }

  useEffect(() => {
    document.title = project ? `${project.name} - The Sprite Project` : 'The Sprite Project'
  }, [project])

  const renderView = () => {
    if (!project || !pack) return null
    if (view === 'project') return (
      <section className="view" aria-labelledby="project-heading">
        <div className="view-heading">
          <div><p className="eyebrow">Local workspace</p><h1 id="project-heading">{project.name}</h1></div>
          <button ref={renameButton} className="button secondary" type="button" onClick={() => setDialogMode('rename')}><Pencil /> Rename project</button>
        </div>
        <div className="project-facts">
          <div><span>Character</span><strong>{project.character.name}</strong></div>
          <div><span>Content pack</span><strong>{pack.name} {pack.version}</strong></div>
          <div><span>Theme</span><strong>{presetById(project.themePresetId).name}</strong></div>
          <div><span>Output</span><strong>{ready ? 'Ready' : 'Blocked'}</strong></div>
        </div>
        <StatusStrip blockers={blockers} />
        <div className="action-row">
          <button className="button primary" type="button" onClick={() => setView('compose')}><Layers3 /> Compose character</button>
          <button className="button secondary" type="button" onClick={restoreSafeProject}><RotateCcw /> Restore safe project</button>
        </div>
      </section>
    )

    if (view === 'compose') {
      const options = assetsForSlot(pack, selectedSlot)
      const optional = !REQUIRED_SLOTS.includes(selectedSlot as never)
      return (
        <section className="view" aria-labelledby="compose-heading">
          <div className="view-heading"><div><p className="eyebrow">Recipe</p><h1 id="compose-heading">Compose</h1></div></div>
          <label className="field compact"><span>Content pack</span><select value={pack.id} onChange={event => handlePackChange(event.target.value)}>{PACKS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select><small>{pack.description}</small></label>
          <div className="slot-tabs" role="tablist" aria-label="Character slots">
            {SLOT_IDS.map(slot => <button key={slot} type="button" role="tab" aria-selected={selectedSlot === slot} onClick={() => setSelectedSlot(slot)}><span>{slot}</span>{project.character.selections[slot] ? <Check /> : <span className="required-dot" aria-label={REQUIRED_SLOTS.includes(slot as never) ? 'Required' : 'Optional'} />}</button>)}
          </div>
          <div className="compose-layout">
            <fieldset className="asset-list"><legend>{selectedSlot}</legend>{options.map(item => <label key={item.id} className="asset-option"><input type="radio" name={`asset-${selectedSlot}`} checked={selectedAsset?.id === item.id} onChange={() => selectAsset(item.id)} /><span className="asset-check"><Check /></span><span><strong>{item.name}</strong><small>{item.description}</small></span></label>)}<button className="button quiet" type="button" disabled={!selectedAsset} onClick={clearSlot}><X /> {optional ? 'Clear optional slot' : 'Clear required slot'}</button></fieldset>
            <aside className="asset-details" aria-label="Asset details">
              {selectedAsset ? <><div className="asset-kicker"><Box /> Selected asset</div><h2>{selectedAsset.name}</h2><dl><dt>Pack</dt><dd>{pack.name} {pack.version}</dd><dt>Author</dt><dd>{selectedAsset.provenance.author}</dd><dt>License</dt><dd>{selectedAsset.provenance.chosenLicense}</dd><dt>Source</dt><dd><a href={selectedAsset.provenance.sourceUrl} target="_blank" rel="noreferrer">{selectedAsset.provenance.source}</a></dd><dt>Coverage</dt><dd>{selectedAsset.coverage.join(' · ')}</dd></dl></> : <><Info /><h2>No layer selected</h2><p>This optional slot is clear.</p></>}
            </aside>
          </div>
          <StatusStrip blockers={blockers} />
        </section>
      )
    }

    if (view === 'theme') return (
      <section className="view" aria-labelledby="theme-heading">
        <div className="view-heading"><div><p className="eyebrow">Semantic palette</p><h1 id="theme-heading">Theme</h1></div></div>
        <fieldset className="preset-list"><legend>Theme preset</legend>{THEME_PRESETS.map(item => <label key={item.id} className="preset-option"><input type="radio" name="theme-preset" checked={project.themePresetId === item.id} onChange={() => applyPreset(item.id)} /><span className="preset-swatches">{TOKEN_IDS.slice(0, 4).map(token => <i key={token} style={{ backgroundColor: item.tokens[token] }} />)}</span><span><strong>{item.name}</strong><small>{item.description}</small></span></label>)}</fieldset>
        <div className="token-table" aria-label="Theme tokens">
          {TOKEN_IDS.map(token => {
            const hasOverride = Boolean(project.character.overrides[token])
            const draft = colorDrafts[token] ?? tokenValue(token)
            const invalid = !isValidHex(draft)
            return <div className="token-row" key={token}><span className="color-swatch" style={{ backgroundColor: tokenValue(token) }} aria-hidden="true" /><label><strong>{TOKEN_LABELS[token]}</strong><small>{TOKEN_DESCRIPTIONS[token]}</small></label><div className="token-input"><input aria-label={`${TOKEN_LABELS[token]} hex color`} value={draft} aria-invalid={invalid} onChange={event => changeToken(token, event.target.value)} />{invalid && <small className="field-error">Use #RRGGBB</small>}</div><label className="override-check"><input type="checkbox" checked={hasOverride} onChange={event => toggleOverride(token, event.target.checked)} /> Override for this character</label><button className="icon-button" type="button" aria-label={`Reset ${TOKEN_LABELS[token]} override`} disabled={!hasOverride} onClick={() => resetOverride(token)}><RotateCcw /></button></div>
          })}
        </div>
      </section>
    )

    if (view === 'preview') return (
      <section className="view" aria-labelledby="preview-heading">
        <div className="view-heading"><div><p className="eyebrow">Animation coverage</p><h1 id="preview-heading">Preview</h1></div></div>
        <div className="control-section"><h2>Animation</h2><div className="segmented" role="radiogroup" aria-label="Animation">{(['idle', 'walk'] as AnimationId[]).map(item => <label key={item}><input type="radio" name="animation" checked={project.preview.animation === item} onChange={() => setPreview({ animation: item })} /><span>{item}</span></label>)}</div></div>
        <div className="control-section"><h2>Direction</h2><div className="segmented" role="radiogroup" aria-label="Direction">{DIRECTIONS.map(item => <label key={item}><input type="radio" name="direction" checked={project.preview.direction === item} onChange={() => setPreview({ direction: item as Direction })} /><span>{item}</span></label>)}</div></div>
        <div className="playback-panel">
          <button type="button" className="play-button" aria-label={project.preview.playing ? 'Pause animation' : 'Play animation'} onClick={() => setPreview({ playing: !project.preview.playing })}>{project.preview.playing ? <Pause /> : <Play />}</button>
          <label className="range-field"><span>Playback speed <strong>{project.preview.speed.toFixed(1)}x</strong></span><input type="range" aria-label="Playback speed" min="0.5" max="2" step="0.5" value={project.preview.speed} onChange={event => setPreview({ speed: Number(event.target.value) })} /></label>
          <label className="range-field"><span>Preview zoom <strong>{project.preview.zoom}x</strong></span><input type="range" aria-label="Preview zoom" min="2" max="6" step="1" value={project.preview.zoom} onChange={event => setPreview({ zoom: Number(event.target.value) })} /></label>
        </div>
        <div className="coverage-grid">{(['idle', 'walk'] as AnimationId[]).map(animation => <div key={animation}><strong>{animation}</strong><span>4 directions</span><span>{animation === 'idle' ? '1 frame each' : '4 frames each'}</span><CheckCircle2 /></div>)}</div>
      </section>
    )

    const credits = creditsFor(project)
    return (
      <section className="view" aria-labelledby="export-heading">
        <div className="view-heading"><div><p className="eyebrow">Delivery</p><h1 id="export-heading">Export</h1></div></div>
        <div className={`readiness ${ready ? 'ready' : 'blocked'}`} role="status" aria-label="Export readiness"><div className="readiness-icon">{ready ? <ShieldCheck /> : <AlertTriangle />}</div><div><p className="eyebrow">Export readiness</p><h2>{ready ? 'Ready' : 'Blocked'}</h2><p>{ready ? `${pack.name} recipe has complete frames and provenance.` : blockers.join(' ')}</p></div></div>
        <div className="export-options">
          <section><FileArchive /><div><h2>Generic package</h2><p>PNG spritesheet, animation JSON, build manifest, and exact credits.</p><ul><li>64 × 64 frames</li><li>Idle and walk · four directions</li><li>Portable JSON contract</li></ul></div><button type="button" className="button primary" disabled={!ready} onClick={() => void runExport('generic')}><Download /> Download generic package</button></section>
          <section><Gamepad2 /><div><h2>Godot 4 package</h2><p>Generic files plus a ready-to-load SpriteFrames text resource.</p><ul><li>Named animation cycles</li><li>Atlas regions defined</li><li>No manual slicing</li></ul></div><button type="button" className="button primary" disabled={!ready} onClick={() => void runExport('godot')}><Download /> Download Godot package</button></section>
        </div>
        <div className="credits-panel" aria-label="Credits preview"><div className="panel-heading"><div><p className="eyebrow">Current recipe</p><h2>Credits preview</h2></div><span>{credits.reduce((sum, item) => sum + item.assetIds.length, 0)} selected layers</span></div>{credits.map(item => <div className="credit-row" key={`${item.packId}-${item.source}`}><ShieldCheck /><div><strong>{item.source}</strong><span>{item.author} · {item.chosenLicense}</span><small>{item.assetNames.join(', ')}</small></div></div>)}</div>
        <p className="export-status" role="status">{exportStatus}</p>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles /></span><span><strong>The Sprite Project</strong><small>Character workspace</small></span></div>
        <div className="topbar-actions">
          {project && <span className={`save-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'Saved locally'}</span>}
          <button ref={newProjectButton} type="button" className="button secondary" onClick={() => setDialogMode('new')}><Plus /> New project</button>
          <button type="button" className="button primary" disabled={!project || !dirty} onClick={handleSave}><Save /> Save project</button>
        </div>
      </header>
      <div className="app-body">
        <nav className="workflow-nav" aria-label="Project workflow">
          {NAV_ITEMS.map(item => { const Icon = item.icon; return <button key={item.id} type="button" disabled={!project} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><Icon /><span>{item.label}</span></button> })}
          <div className="nav-progress" aria-label="Workflow progress">{NAV_ITEMS.map(item => <i key={item.id} className={project && (item.id !== 'export' || ready) ? 'complete' : ''} />)}</div>
        </nav>
        <main className="workspace">
          {!project ? (
            <section className="empty-workspace">
              <div className="empty-glyph"><Layers3 /></div>
              <p className="eyebrow">Local-first character studio</p>
              <h1>{loadError ? 'Project recovery required' : 'No project open'}</h1>
              <p>{loadError ?? 'Create a project to begin with a complete animated starter character.'}</p>
              <div className="action-row">
                {loadError && <button className="button secondary" type="button" onClick={restoreSafeProject}><RotateCcw /> Restore safe project</button>}
                <button className="button primary" type="button" onClick={() => setDialogMode('new')}><Plus /> New project</button>
              </div>
            </section>
          ) : (
            <>
              <div className="content-pane">{renderView()}</div>
              <aside className="preview-pane" aria-label="Character preview">
                <div className="preview-heading"><div><p className="eyebrow">Live character</p><h2>{project.character.name}</h2></div><span className={`readiness-pill ${ready ? 'ready' : 'blocked'}`}>{ready ? <Check /> : <AlertTriangle />}{ready ? 'Ready' : 'Blocked'}</span></div>
                <SpriteCanvas project={project} compact={view !== 'preview'} />
                <div className="preview-actions"><button type="button" className="button quiet" onClick={() => setView('preview')}><Play /> Open preview</button><button type="button" className="button quiet" onClick={() => setView('export')}><Download /> Export</button></div>
              </aside>
            </>
          )}
        </main>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      {dialogMode && <ProjectDialog mode={dialogMode} initialName={dialogMode === 'rename' ? project?.name ?? '' : ''} onCancel={closeDialog} onSubmit={submitProjectDialog} />}
    </div>
  )
}

export default App
