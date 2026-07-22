import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { unzipSync } from 'fflate'
import {
  AlertTriangle, Box, Check, CheckCircle2, Copy, Download, FileArchive, FolderOpen,
  Gamepad2, HardDrive, History, Info, Layers3, Map, Palette, Pause, Pencil, Play, Plus, RotateCcw,
  Package, Save, ShieldCheck, Sparkles, Trash2, Upload, X,
} from 'lucide-react'
import './App.css'
import { SpriteCanvas } from './components/SpriteCanvas'
import { PackWorkspace } from './components/PackWorkspace'
import { EnvironmentWorkspace } from './components/EnvironmentWorkspace'
import { readProjectArchive, writeProjectArchive, type ReadArchiveResult } from './domain/archive'
import { buildPackage, downloadBytes } from './domain/export'
import { buildTerrainPackage } from './domain/terrain-export'
import { TERRAIN_MATERIALS, terrainPixelHash, renderTerrainAtlas } from './domain/terrain'
import { ProductError } from './domain/errors'
import { packLockForPack } from './domain/pack-locks'
import { assetsForSlot, clearEmbeddedRuntimePacks, packByLock, packBySelectionKey, packSelectionKey, PACKS, registerRuntimePack, selectablePacks } from './domain/packs'
import { registerSheetPng, runtimePackFromInstalled } from './domain/pack-runtime'
import { readSpritePackResponsive } from './domain/pack-validation-client'
import {
  creditsFor, exportBlockers, isExportReady, resolvedTheme,
  switchPack, touch,
} from './domain/project'
import { activateCharacter, applyLegacyProjection, copyProjectGraph, createCharacter, createProjectGraph, duplicateCharacter, duplicateCharacterName, legacyProjection, removeCharacter, renameCharacter } from './domain/project-v2'
import { isValidHex, presetById, THEME_PRESETS, TOKEN_DESCRIPTIONS, TOKEN_LABELS } from './domain/themes'
import {
  DIRECTIONS, REQUIRED_SLOTS, SLOT_IDS, TOKEN_IDS,
  type AnimationId, type ContentPack, type Direction, type ProjectGraphV2, type SlotId, type SpriteProject, type SpriteProjectV2, type TerrainDocumentV1, type TokenId,
} from './domain/types'
import { classifyStoragePressure, type DisposableDataPreview, type SnapshotRecord, type StoragePressure, WorkspaceRepository } from './web/repository'
import type { ApprovedLocation, HostInfo, ProjectFingerprint, RecentProject } from './host/bridge'

type ViewId = 'project' | 'compose' | 'theme' | 'terrain' | 'preview' | 'storage' | 'packs' | 'export' | 'terrain-export'
type DialogMode = 'new' | 'rename' | null
type CharacterDialogState = { mode: 'create' | 'duplicate' | 'rename'; recipeId: string; initialName: string } | null

const NAV_ITEMS = [
  { id: 'project' as const, label: 'Project', icon: FolderOpen },
  { id: 'compose' as const, label: 'Compose', icon: Layers3 },
  { id: 'theme' as const, label: 'Theme', icon: Palette },
  { id: 'terrain' as const, label: 'Terrain', icon: Map },
  { id: 'preview' as const, label: 'Preview', icon: Play },
  { id: 'storage' as const, label: 'Storage', icon: HardDrive },
  { id: 'packs' as const, label: 'Packs', icon: Package },
  { id: 'export' as const, label: 'Export', icon: Download },
]

function ProjectDialog({ mode, initialName, onCancel, onSubmit }: {
  mode: Exclude<DialogMode, null>
  initialName: string
  onCancel: () => void
  onSubmit: (name: string) => void | Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const valid = Boolean(name.trim())
  return (
    <div className="dialog-backdrop" role="presentation" onKeyDown={event => { if (event.key === 'Escape') onCancel() }}>
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
            if (event.key === 'Enter' && valid) void onSubmit(name.trim())
            if (event.key === 'Escape') onCancel()
          }} />
          {!valid && <small className="field-error">Enter a project name.</small>}
        </label>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" disabled={!valid} onClick={() => void onSubmit(name.trim())}>
            {mode === 'new' ? 'Create project' : 'Save name'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CharacterNameDialog({ mode, initialName, onCancel, onSubmit }: {
  mode: 'create' | 'duplicate' | 'rename'
  initialName: string
  onCancel: () => void
  onSubmit: (name: string) => string | null
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const title = mode === 'create' ? 'Create character' : mode === 'duplicate' ? 'Duplicate character' : 'Rename character'
  const submit = () => {
    const nextError = onSubmit(name)
    setError(nextError)
  }
  return (
    <div className="dialog-backdrop" role="presentation" onKeyDown={event => { if (event.key === 'Escape') onCancel() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="character-dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Project character</p><h2 id="character-dialog-title">{title}</h2></div><button className="icon-button" type="button" aria-label="Cancel" onClick={onCancel}><X /></button></div>
        <label className="field" htmlFor="character-name"><span>Character name</span><input id="character-name" autoFocus value={name} aria-invalid={Boolean(error)} aria-describedby={error ? 'character-name-error' : undefined} onChange={event => { setName(event.target.value); setError(null) }} onKeyDown={event => { if (event.key === 'Enter') submit() }} />{error && <small id="character-name-error" className="field-error">{error}</small>}</label>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button type="button" className="button primary" onClick={submit}>{mode === 'create' ? 'Create character' : mode === 'duplicate' ? 'Duplicate character' : 'Save character name'}</button></div>
      </div>
    </div>
  )
}

function ChoiceDialog({ title, description, choices, onCancel }: {
  title: string
  description: string
  choices: { label: string; action: () => void | Promise<void>; primary?: boolean; destructive?: boolean }[]
  onCancel: () => void
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onKeyDown={event => { if (event.key === 'Escape') onCancel() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="choice-dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Action required</p><h2 id="choice-dialog-title" tabIndex={-1}>{title}</h2></div></div>
        <p>{description}</p>
        <div className="choice-list">
          {choices.map((choice, index) => <button key={choice.label} autoFocus={index === 0} type="button" className={`button ${choice.primary ? 'primary' : 'secondary'} ${choice.destructive ? 'destructive' : ''}`} onClick={() => void choice.action()}>{choice.label}</button>)}
          <button type="button" className="button quiet" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmNameDialog({ projectName, onConfirm, onCancel }: { projectName: string; onConfirm: () => void | Promise<void>; onCancel: () => void }) {
  const [confirmation, setConfirmation] = useState('')
  return (
    <div className="dialog-backdrop" role="presentation" onKeyDown={event => { if (event.key === 'Escape') onCancel() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Permanent local deletion</p><h2 id="delete-dialog-title">Delete {projectName}?</h2></div></div>
        <p>Type the project name to remove this project and its snapshots from this browser. Downloaded backups are not affected.</p>
        <label className="field"><span>Project name</span><input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <div className="dialog-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button secondary destructive" type="button" disabled={confirmation !== projectName} onClick={() => void onConfirm()}>Delete project</button></div>
      </div>
    </div>
  )
}

function ImportSummaryDialog({ archive, fileName, onImport, onCancel }: { archive: ReadArchiveResult; fileName: string; onImport: () => void | Promise<void>; onCancel: () => void }) {
  const expandedBytes = archive.manifest.entries.reduce((sum, entry) => sum + entry.size, 0)
  return (
    <div className="dialog-backdrop" role="presentation" onKeyDown={event => { if (event.key === 'Escape') onCancel() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Validated project backup</p><h2 id="import-dialog-title">Import {archive.graph.project.name}?</h2></div></div>
        <dl className="summary-list"><dt>Source</dt><dd>{fileName}</dd><dt>Archive format</dt><dd>Version {archive.manifest.archiveFormatVersion}</dd><dt>Project schema</dt><dd>Version {archive.manifest.projectSchemaVersion}</dd><dt>Entries</dt><dd>{archive.manifest.entries.length} verified</dd><dt>Expanded size</dt><dd>{(expandedBytes / 1024).toFixed(1)} KiB</dd><dt>Exact packs</dt><dd>{archive.graph.project.packLocks.map(lock => `${lock.packId} ${lock.version}`).join(', ')}</dd></dl>
        <div className="dialog-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="button" onClick={() => void onImport()}>Import project</button></div>
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
  const repository = useMemo(() => new WorkspaceRepository(), [])
  const [graph, setGraph] = useState<ProjectGraphV2 | null>(null)
  const project = useMemo(() => graph ? legacyProjection(graph) : null, [graph])
  const [projects, setProjects] = useState<SpriteProjectV2[]>([])
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<ViewId>('project')
  const [selectedSlot, setSelectedSlot] = useState<SlotId>('body')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [characterDialog, setCharacterDialog] = useState<CharacterDialogState>(null)
  const [characterDeleteId, setCharacterDeleteId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveConflict, setSaveConflict] = useState<ProjectGraphV2 | null>(null)
  const [importConflict, setImportConflict] = useState<{ graph: ProjectGraphV2; embeddedPackageBytes: Uint8Array[] } | null>(null)
  const [importPending, setImportPending] = useState<{ archive: ReadArchiveResult; fileName: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<SpriteProjectV2 | null>(null)
  const [snapshotCandidate, setSnapshotCandidate] = useState<SnapshotRecord | null>(null)
  const [migrationRecovery, setMigrationRecovery] = useState<string | null>(null)
  const [storagePressure, setStoragePressure] = useState<StoragePressure>('healthy')
  const [disposablePreview, setDisposablePreview] = useState<DisposableDataPreview | null>(null)
  const [announcement, setAnnouncement] = useState('Opening local workspace.')
  const [exportStatus, setExportStatus] = useState('No package generated in this session.')
  const [terrainExportStatus, setTerrainExportStatus] = useState('No terrain package generated in this session.')
  const [storageStatus, setStorageStatus] = useState('Checking browser storage.')
  const [online, setOnline] = useState(navigator.onLine)
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null)
  const [desktopLocation, setDesktopLocation] = useState<ApprovedLocation | null>(null)
  const [desktopFingerprint, setDesktopFingerprint] = useState<ProjectFingerprint | null>(null)
  const [desktopRecents, setDesktopRecents] = useState<RecentProject[]>([])
  const [desktopConflict, setDesktopConflict] = useState(false)
  const [desktopEmbeddedPackageBytes, setDesktopEmbeddedPackageBytes] = useState<Uint8Array[]>([])
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmTerrainRemoval, setConfirmTerrainRemoval] = useState(false)
  const [colorDrafts, setColorDrafts] = useState<Partial<Record<TokenId, string>>>({})
  const [, setPackRegistryRevision] = useState(0)
  const [packActivation, setPackActivation] = useState<ContentPack | null>(null)
  const [missingReplacement, setMissingReplacement] = useState<ContentPack | null>(null)
  const newProjectButton = useRef<HTMLButtonElement>(null)
  const renameButton = useRef<HTMLButtonElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const editVersion = useRef(0)
  const overlayTrigger = useRef<HTMLElement | null>(null)

  const rememberOverlayTrigger = (element?: HTMLElement | null) => {
    overlayTrigger.current = element ?? document.activeElement as HTMLElement | null
  }

  const dismissOverlay = (close: () => void) => {
    close()
    requestAnimationFrame(() => overlayTrigger.current?.focus())
  }

  const activePackLock = project && graph ? graph.project.packLocks.find(lock => lock.packId === project.packId) ?? null : null
  const pack = activePackLock ? packByLock(activePackLock) : null
  const blockers = project && pack ? exportBlockers(project, pack) : []
  const ready = project && pack ? isExportReady(project, pack) : false
  const selectedAsset = project && pack
    ? pack.assets.find(item => item.id === project.character.selections[selectedSlot]) ?? null
    : null
  const activationImpact = packActivation && project && pack ? (() => {
    const selectedIds = Object.values(project.character.selections).filter((id): id is string => Boolean(id))
    const retained = selectedIds.filter(id => packActivation.assets.some(asset => asset.id === id))
    const removed = selectedIds.filter(id => !packActivation.assets.some(asset => asset.id === id))
    const added = packActivation.assets.filter(asset => !pack.assets.some(current => current.id === asset.id)).map(asset => asset.id)
    return { retained, removed, added }
  })() : null

  const refreshProjects = async () => setProjects(await repository.listProjects())

  const hydrateProjectEmbeddedPacks = async (projectId: string) => {
    clearEmbeddedRuntimePacks()
    const records = await repository.projectEmbeddedPackages(projectId)
    for (const record of records) {
      const parsed = await readSpritePackResponsive(record.packageBytes)
      for (const [hash, bytes] of Object.entries(parsed.pngs)) await registerSheetPng(hash, bytes)
      registerRuntimePack(runtimePackFromInstalled({
        packId: parsed.pack.id,
        version: parsed.pack.version,
        packageSha256: parsed.packageSha256,
        packDocumentSha256: parsed.packDocumentSha256,
        origin: 'embedded-project',
        enabled: false,
        installedAt: '1980-01-01T00:00:00.000Z',
        packageBytes: parsed.bytes,
        pack: parsed.pack,
        provenance: parsed.provenance,
      }))
    }
  }

  const hydratePackageBytes = async (packages: Uint8Array[], origin: 'installed-local' | 'embedded-project') => {
    if (origin === 'embedded-project') clearEmbeddedRuntimePacks()
    const hydratedPackages: Uint8Array[] = []
    for (const bytes of packages) {
      const parsed = await readSpritePackResponsive(bytes)
      hydratedPackages.push(parsed.bytes)
      for (const [hash, png] of Object.entries(parsed.pngs)) await registerSheetPng(hash, png)
      registerRuntimePack(runtimePackFromInstalled({ packId: parsed.pack.id, version: parsed.pack.version, packageSha256: parsed.packageSha256, packDocumentSha256: parsed.packDocumentSha256, origin, enabled: origin === 'installed-local', installedAt: '1980-01-01T00:00:00.000Z', packageBytes: parsed.bytes, pack: parsed.pack, provenance: parsed.provenance }))
    }
    return hydratedPackages
  }

  const hydrateStartupProject = useEffectEvent(hydrateProjectEmbeddedPacks)
  const hydrateStartupPackages = useEffectEvent(hydratePackageBytes)

  const openProject = async (projectId: string) => {
    await hydrateProjectEmbeddedPacks(projectId)
    const next = await repository.loadGraph(projectId)
    if (!next) {
      setLoadError('The selected project is no longer available.')
      return
    }
    setGraph(next)
    setDirty(false)
    setView('project')
    setAnnouncement(`${next.project.name} opened at revision ${next.project.revision}.`)
  }

  const persistGraph = async (candidate: ProjectGraphV2, reason = 'autosave') => {
    if (saving) return
    const version = editVersion.current
    setSaving(true)
    try {
      const saved = await repository.saveGraph(candidate, candidate.project.revision, reason)
      setGraph(current => {
        if (!current || current.project.id !== saved.project.id) return current
        if (editVersion.current === version) return saved
        return { ...current, project: { ...current.project, revision: saved.project.revision } }
      })
      const hasNewerEdits = editVersion.current !== version
      setDirty(hasNewerEdits)
      setAnnouncement(hasNewerEdits ? 'Earlier edits saved; newer edits remain unsaved.' : `Saved revision ${saved.project.revision}.`)
      await refreshProjects()
    } catch (error) {
      if (error instanceof ProductError && error.code === 'revision-conflict') {
        rememberOverlayTrigger()
        setSaveConflict(candidate)
        setAnnouncement('A newer project revision is already stored. Choose how to continue.')
      } else if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        setStoragePressure('critical')
        setDirty(true)
        setAnnouncement('Storage is full (storage-full). Current edits remain unsaved. Clear disposable data, export a project backup, or cancel.')
      } else {
        setAnnouncement(error instanceof Error ? error.message : 'Project save failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  const autosave = useEffectEvent((candidate: ProjectGraphV2) => {
    void persistGraph(candidate)
  })

  const updateProject = (updater: (current: SpriteProject) => SpriteProject, message?: string) => {
    setGraph(current => current ? applyLegacyProjection(current, touch(updater(legacyProjection(current)))) : current)
    editVersion.current += 1
    setDirty(true)
    if (message) setAnnouncement(message)
  }

  const updateTerrain = (terrain: TerrainDocumentV1, message?: string) => {
    setGraph(current => current ? { ...current, terrain } : current)
    editVersion.current += 1
    setDirty(true)
    if (message) setAnnouncement(message)
  }

  const commitCharacterGraph = (next: ProjectGraphV2, message: string) => {
    setGraph(next)
    editVersion.current += 1
    setDirty(true)
    setAnnouncement(message)
  }

  const submitCharacterName = (name: string): string | null => {
    if (!graph || !characterDialog) return 'Character project is unavailable.'
    try {
      const next = characterDialog.mode === 'create'
        ? pack ? createCharacter(graph, name, pack) : null
        : characterDialog.mode === 'duplicate'
          ? duplicateCharacter(graph, characterDialog.recipeId, name)
          : renameCharacter(graph, characterDialog.recipeId, name)
      if (!next) return 'The active character pack is unavailable.'
      commitCharacterGraph(next, characterDialog.mode === 'create' ? `${next.recipes[next.project.activeRecipeId].name} created and opened.` : characterDialog.mode === 'duplicate' ? `${next.recipes[next.project.activeRecipeId].name} duplicated and opened.` : `Character renamed to ${next.recipes[characterDialog.recipeId].name}.`)
      setCharacterDialog(null)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Character could not be changed.'
    }
  }

  const openCharacter = (recipeId: string) => {
    if (!graph || graph.project.activeRecipeId === recipeId) return
    const next = activateCharacter(graph, recipeId)
    commitCharacterGraph(next, `${next.recipes[recipeId].name} is now the active character.`)
    setView('project')
  }

  const closeDialog = () => {
    const mode = dialogMode
    setDialogMode(null)
    requestAnimationFrame(() => (mode === 'rename' ? renameButton.current : newProjectButton.current)?.focus())
  }

  const submitProjectDialog = async (name: string) => {
    if (dialogMode === 'new') {
      const next = await createProjectGraph(name)
      setGraph(next)
      if (window.spriteHost) {
        setDesktopLocation(null)
        setDesktopFingerprint(null)
        setDirty(true)
      } else {
        await repository.createGraph(next)
        await refreshProjects()
        setDirty(false)
      }
      setLoadError(null)
      setView('project')
      setAnnouncement(`${name} created with a complete Wayfarer starter character.`)
    } else if (project) {
      updateProject(current => ({ ...current, name }), `Project renamed to ${name}.`)
    }
    setDialogMode(null)
  }

  const handleSave = () => {
    if (!graph) return
    if (window.spriteHost) void saveDesktopProject()
    else void persistGraph(graph, 'manual save')
  }

  const restoreSafeProject = async () => {
    if (!project || !graph || !pack) return
    const next = switchPack(project, pack)
    setGraph(applyLegacyProjection(graph, next, await packLockForPack(pack)))
    editVersion.current += 1
    setLoadError(null)
    setDirty(true)
    setView('project')
    setAnnouncement('Safe project restored with compatible pack defaults.')
  }

  const locateMissingPack = async (file: File) => {
    if (!activePackLock) return
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parsed = await readSpritePackResponsive(bytes)
      if (parsed.pack.id !== activePackLock.packId || parsed.pack.version !== activePackLock.version || parsed.packDocumentSha256 !== activePackLock.sha256) throw new ProductError({ code: 'missing-pack', message: 'Selected package does not match the project exact pack lock.', operation: 'pack:locate', recoverable: true })
      let installed
      if (window.spriteHost) {
        const listed = await window.spriteHost.listInstalledPacks()
        if (!listed.ok) throw new ProductError(listed.error)
        const expectedIndexRevision = Math.max(0, ...listed.value.map(item => item.indexRevision))
        const result = await window.spriteHost.installPack({ bytes: parsed.bytes, enabled: true, expectedIndexRevision })
        if (!result.ok) throw new ProductError(result.error)
        installed = { packId: result.value.packId, version: result.value.version, packageSha256: result.value.packageSha256, packDocumentSha256: result.value.packDocumentSha256, origin: 'installed-local' as const, enabled: result.value.enabled, installedAt: result.value.installedAt, packageBytes: result.value.packageBytes, pack: parsed.pack, provenance: parsed.provenance }
      } else installed = await repository.installPack(parsed.bytes)
      for (const [hash, png] of Object.entries(parsed.pngs)) await registerSheetPng(hash, png)
      registerRuntimePack(runtimePackFromInstalled(installed))
      setPackRegistryRevision(value => value + 1)
      setAnnouncement(`Exact pack ${installed.packId} ${installed.version} installed; project rendering resumed unchanged.`)
    } catch (error) {
      setAnnouncement(`${error instanceof Error ? error.message : 'Exact pack recovery failed.'}${error instanceof ProductError ? ` (${error.code})` : ''}`)
    }
  }

  const replaceMissingPackInCopy = async () => {
    if (!graph || !project || !missingReplacement) return
    const copyBase = copyProjectGraph(graph, `${graph.project.name} (replacement copy)`)
    const replacementProject = switchPack(legacyProjection(copyBase), missingReplacement)
    const copy = applyLegacyProjection(copyBase, replacementProject, await packLockForPack(missingReplacement))
    if (window.spriteHost) {
      setGraph(copy)
      setDesktopLocation(null)
      setDesktopFingerprint(null)
      setDesktopEmbeddedPackageBytes([])
      setDirty(true)
    } else {
      await repository.createGraph(copy)
      setGraph(copy)
      setDirty(false)
      await refreshProjects()
    }
    setMissingReplacement(null)
    setView('project')
    setAnnouncement(`${copy.project.name} created with ${missingReplacement.name}; the original blocked project and exact lock are unchanged.`)
  }

  const applyPackChange = async (nextPack: ContentPack, checkpoint: boolean) => {
    if (!project || !graph) return
    let baseGraph = graph
    if (checkpoint && !window.spriteHost) {
      baseGraph = await repository.saveGraph(graph, graph.project.revision, 'pack replacement')
      await refreshProjects()
    } else if (checkpoint && window.spriteHost && desktopLocation) {
      const saved = await saveDesktopProject()
      if (!saved) return
    }
    const next = switchPack(legacyProjection(baseGraph), nextPack)
    setGraph(applyLegacyProjection(baseGraph, next, await packLockForPack(nextPack)))
    editVersion.current += 1
    setSelectedSlot('body')
    setDirty(true)
    setPackActivation(null)
    setAnnouncement(`${nextPack.name} selected. Incompatible selections were replaced with pack defaults.`)
  }

  const handlePackChange = async (selectionKey: string) => {
    if (!project || !graph) return
    const nextPack = packBySelectionKey(selectionKey)
    if (!nextPack) return
    if (nextPack.origin && nextPack.origin !== 'bundled') {
      rememberOverlayTrigger()
      setPackActivation(nextPack)
      return
    }
    await applyPackChange(nextPack, false)
  }

  const resolveReload = async () => {
    if (!saveConflict) return
    const stored = await repository.loadGraph(saveConflict.project.id)
    if (stored) setGraph(stored)
    setDirty(false)
    setSaveConflict(null)
    setAnnouncement('Reloaded the newer stored revision.')
  }

  const resolveOverwrite = async () => {
    if (!saveConflict) return
    const stored = await repository.loadGraph(saveConflict.project.id)
    if (!stored) return
    const candidate = { ...saveConflict, project: { ...saveConflict.project, revision: stored.project.revision } }
    setSaveConflict(null)
    await persistGraph(candidate, 'conflict overwrite')
  }

  const resolveSaveCopy = async () => {
    if (!saveConflict) return
    const copy = copyProjectGraph(saveConflict, `${saveConflict.project.name} (conflict copy)`)
    await repository.createGraph(copy)
    setGraph(copy)
    setDirty(false)
    setSaveConflict(null)
    await refreshProjects()
    setAnnouncement(`${copy.project.name} saved as a separate project.`)
  }

  const exportArchive = async () => {
    if (!graph) return
    const bytes = await writeProjectArchive(graph, 'sprite-project/0.1.0', await repository.projectPackageBytes(graph))
    const safeName = graph.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
    downloadBytes(bytes, `${safeName}.spriteproject`)
    setAnnouncement('Portable project archive downloaded with verified checksums.')
  }

  const importArchive = async (file: File) => {
    try {
      setAnnouncement(`Validating ${file.name}.`)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      const archive = await readProjectArchive(new Uint8Array(await file.arrayBuffer()))
      setImportPending({ archive, fileName: file.name })
      setAnnouncement(`${file.name} validated. Review its project summary before import.`)
    } catch (error) {
      const code = error instanceof ProductError ? ` (${error.code})` : ''
      setAnnouncement(`${error instanceof Error ? error.message : 'Archive import failed.'}${code}`)
    }
  }

  const confirmArchiveImport = async () => {
    if (!importPending) return
    const imported = importPending.archive.graph
    const sourceFileName = importPending.fileName
    rememberOverlayTrigger()
    setImportPending(null)
    try {
      const existing = await repository.loadGraph(imported.project.id)
      if (existing) {
        setImportConflict({ graph: imported, embeddedPackageBytes: importPending.archive.embeddedPacks.map(pack => pack.bytes) })
        return
      }
      await repository.createGraph(imported, importPending.archive.embeddedPacks.map(pack => pack.bytes))
      await hydrateProjectEmbeddedPacks(imported.project.id)
      setGraph(imported)
      setDirty(false)
      await refreshProjects()
      setView('project')
      setAnnouncement(`${imported.project.name} imported from ${sourceFileName}.`)
    } catch (error) {
      const code = error instanceof ProductError ? ` (${error.code})` : ''
      setAnnouncement(`${error instanceof Error ? error.message : 'Archive import failed.'}${code}`)
    }
  }

  const replaceImportedProject = async () => {
    if (!importConflict) return
    const current = await repository.loadGraph(importConflict.graph.project.id)
    if (!current) return
    const replaced = await repository.saveGraph({ ...importConflict.graph, project: { ...importConflict.graph.project, revision: current.project.revision } }, current.project.revision, 'archive replace', new Date().toISOString(), importConflict.embeddedPackageBytes)
    await hydrateProjectEmbeddedPacks(replaced.project.id)
    setGraph(replaced)
    setImportConflict(null)
    setDirty(false)
    setView('project')
    await refreshProjects()
    setAnnouncement('Existing project replaced; prior work is available as a recovery checkpoint.')
  }

  const copyImportedProject = async () => {
    if (!importConflict) return
    const copy = copyProjectGraph(importConflict.graph, `${importConflict.graph.project.name} (imported copy)`)
    await repository.createGraph(copy, importConflict.embeddedPackageBytes)
    await hydrateProjectEmbeddedPacks(copy.project.id)
    setGraph(copy)
    setImportConflict(null)
    setDirty(false)
    setView('project')
    await refreshProjects()
    setAnnouncement(`${copy.project.name} imported without changing the existing project.`)
  }

  const clearWorkspace = async () => {
    await repository.clearAll()
    setGraph(null)
    setProjects([])
    setSnapshots([])
    setDirty(false)
    setConfirmClear(false)
    setAnnouncement('Browser workspace cleared. Downloaded archives were not changed.')
  }

  const deleteLocalProject = async () => {
    if (!deleteCandidate) return
    const deletingActive = graph?.project.id === deleteCandidate.id
    await repository.deleteProject(deleteCandidate.id)
    setDeleteCandidate(null)
    const remaining = await repository.listProjects()
    setProjects(remaining)
    if (deletingActive) {
      const next = remaining[0] ? await repository.loadGraph(remaining[0].id) : null
      setGraph(next)
      setDirty(false)
    }
    setAnnouncement(`${deleteCandidate.name} deleted from this browser.`)
  }

  const restoreSelectedSnapshot = async () => {
    if (!snapshotCandidate) return
    const selected = snapshotCandidate
    setSnapshotCandidate(null)
    try {
      const restored = await repository.restoreSnapshot(selected.projectId, selected.revision)
      setGraph(restored)
      setDirty(false)
      setAnnouncement(`Revision ${selected.revision} restored with a pre-restore checkpoint.`)
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'Snapshot restore failed.')
    }
  }

  const retryMigration = async () => {
    const outcome = await repository.migrateLegacy(localStorage)
    if (outcome.status === 'migrated' && outcome.projectId) {
      const migrated = await repository.loadGraph(outcome.projectId)
      if (migrated) setGraph(migrated)
      setMigrationRecovery(null)
      setLoadError(null)
      await refreshProjects()
      setAnnouncement('Legacy project migration completed.')
    } else if (outcome.status === 'blocked') {
      setMigrationRecovery(outcome.recoveryBytes ?? migrationRecovery)
      setAnnouncement(`${outcome.error?.message ?? 'Migration failed.'} (${outcome.error?.code ?? 'invalid-project'})`)
    }
  }

  const downloadMigrationRecovery = () => {
    if (migrationRecovery === null) return
    const url = URL.createObjectURL(new Blob([migrationRecovery], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'sprite-project-legacy-recovery.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const previewCleanup = async () => setDisposablePreview(await repository.previewDisposableData())

  const clearDisposable = async () => {
    const removed = await repository.clearDisposableData()
    setDisposablePreview(null)
    if (graph) setSnapshots(await repository.snapshots(graph.project.id))
    setAnnouncement(`Disposable cleanup removed ${removed.unreferencedPackBlobs} unreferenced pack blobs and ${removed.removableSnapshots} unprotected snapshots. Current projects and protected recovery data were retained.`)
  }

  const refreshDesktopRecents = async () => {
    const response = await window.spriteHost?.listRecentProjects()
    if (response?.ok) setDesktopRecents(response.value)
  }

  const openDesktopLocation = async (location: ApprovedLocation) => {
    const response = await window.spriteHost?.readProject(location.grantId)
    if (!response) return
    if (!response.ok) {
      setAnnouncement(`${response.error.message} (${response.error.code})`)
      return
    }
    const hydratedPackages = await hydratePackageBytes(response.value.embeddedPackageBytes, 'embedded-project')
    setGraph(response.value.graph)
    setDesktopEmbeddedPackageBytes(hydratedPackages)
    setDesktopLocation(response.value.location)
    setDesktopFingerprint(response.value.fingerprint)
    setDirty(false)
    setView('project')
    setAnnouncement(`${response.value.graph.project.name} opened from ${response.value.location.displayPath}.`)
    await refreshDesktopRecents()
  }

  const chooseDesktopProject = async (kind: 'folder' | 'file') => {
    const response = kind === 'folder'
      ? await window.spriteHost?.chooseProjectFolder('open')
      : await window.spriteHost?.chooseProjectFile('open')
    if (!response || !response.ok || !response.value) {
      if (response && !response.ok) setAnnouncement(`${response.error.message} (${response.error.code})`)
      return
    }
    await openDesktopLocation(response.value)
  }

  const saveDesktopProject = async (location = desktopLocation, overwriteExternal = false): Promise<boolean> => {
    if (!graph || !window.spriteHost) return false
    let destination = location
    if (!destination) {
      const chosen = await window.spriteHost.chooseProjectFolder('save-as')
      if (!chosen.ok || !chosen.value) {
        if (!chosen.ok) setAnnouncement(`${chosen.error.message} (${chosen.error.code})`)
        return false
      }
      destination = chosen.value
    }
    const response = await window.spriteHost.saveProject({ destinationGrantId: destination.grantId, graph, expectedFingerprint: destination.grantId === desktopLocation?.grantId ? desktopFingerprint : null, overwriteExternal, embeddedPackageBytes: desktopEmbeddedPackageBytes })
    if (!response.ok) {
      if (response.error.code === 'external-modification') {
        rememberOverlayTrigger()
        setDesktopConflict(true)
      }
      setAnnouncement(`${response.error.message} (${response.error.code})`)
      return false
    }
    setDesktopLocation(response.value.location)
    setDesktopFingerprint(response.value.fingerprint)
    setDirty(false)
    setDesktopConflict(false)
    setAnnouncement(`Saved to ${response.value.location.displayPath}.`)
    await refreshDesktopRecents()
    return true
  }

  const saveDesktopAs = async () => {
    const response = await window.spriteHost?.chooseProjectFolder('save-as')
    if (response?.ok && response.value) await saveDesktopProject(response.value)
  }

  const exportDesktopArchive = async () => {
    if (!graph || !window.spriteHost) return
    const chosen = await window.spriteHost.chooseProjectFile('save')
    if (!chosen.ok || !chosen.value) return
    const response = await window.spriteHost.writeArchive({ destinationGrantId: chosen.value.grantId, graph, embeddedPackageBytes: desktopEmbeddedPackageBytes })
    setAnnouncement(response.ok ? `Portable archive written to ${response.value.location.displayPath}.` : `${response.error.message} (${response.error.code})`)
  }

  const openRecentDesktopProject = async (recentId: string) => {
    const response = await window.spriteHost?.openRecentProject(recentId)
    if (!response) return
    if (!response.ok) {
      setAnnouncement(`${response.error.message} (${response.error.code})`)
      return
    }
    const hydratedPackages = await hydratePackageBytes(response.value.embeddedPackageBytes, 'embedded-project')
    setGraph(response.value.graph)
    setDesktopEmbeddedPackageBytes(hydratedPackages)
    setDesktopLocation(response.value.location)
    setDesktopFingerprint(response.value.fingerprint)
    setDirty(false)
    setView('project')
  }

  const forgetRecentDesktopProject = async (recentId: string) => {
    const response = await window.spriteHost?.forgetRecentProject(recentId)
    if (response?.ok) await refreshDesktopRecents()
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
      const result = await buildPackage(project, target, pack ?? undefined)
      if (window.spriteHost) {
        const chosen = await window.spriteHost.chooseExportDirectory()
        if (!chosen.ok || !chosen.value) return
        const entries = Object.entries(unzipSync(result.bytes)).map(([relativePath, bytes]) => ({ relativePath, bytes }))
        const written = await window.spriteHost.writeExport({ destinationGrantId: chosen.value.grantId, entries })
        if (!written.ok) throw new ProductError(written.error)
        setExportStatus(`${written.value.filesWritten.length} files written to ${written.value.location.displayPath}. Render #${result.renderHash}.`)
        setAnnouncement(`${target === 'godot' ? 'Godot 4' : 'Generic'} files written directly.`)
      } else {
        downloadBytes(result.bytes, result.filename)
        setExportStatus(`${result.filename} downloaded. Render #${result.renderHash}.`)
        setAnnouncement(`${target === 'godot' ? 'Godot 4' : 'Generic'} package downloaded.`)
      }
    } catch (error) {
      setExportStatus(error instanceof ProductError ? `${error.message} (${error.code})` : error instanceof Error ? error.message : 'Export failed.')
    }
  }

  const runTerrainExport = async (target: 'generic' | 'godot') => {
    if (!graph?.terrain) return
    setTerrainExportStatus(`Building ${target} terrain package...`)
    try {
      const result = await buildTerrainPackage(graph, target)
      if (window.spriteHost) {
        const chosen = await window.spriteHost.chooseExportDirectory()
        if (!chosen.ok || !chosen.value) return
        const entries = Object.entries(unzipSync(result.bytes)).map(([relativePath, bytes]) => ({ relativePath, bytes }))
        const written = await window.spriteHost.writeExport({ destinationGrantId: chosen.value.grantId, entries })
        if (!written.ok) throw new ProductError(written.error)
        setTerrainExportStatus(`${written.value.filesWritten.length} terrain files written to ${written.value.location.displayPath}. Atlas #${result.renderHash}.`)
        setAnnouncement(`${target === 'godot' ? 'Godot 4.7.1' : 'Generic'} terrain files written directly.`)
      } else {
        downloadBytes(result.bytes, result.filename)
        setTerrainExportStatus(`${result.filename} downloaded. Atlas #${result.renderHash}.`)
        setAnnouncement(`${target === 'godot' ? 'Godot 4.7.1' : 'Generic'} terrain package downloaded.`)
      }
    } catch (error) {
      setTerrainExportStatus(error instanceof ProductError ? `${error.message} (${error.code})` : error instanceof Error ? error.message : 'Terrain export failed.')
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      if (window.spriteHost) {
        const [host, recent, installed] = await Promise.all([window.spriteHost.getHostInfo(), window.spriteHost.listRecentProjects(), window.spriteHost.listInstalledPacks()])
        if (!active) return
        if (host.ok) setHostInfo(host.value)
        if (recent.ok) setDesktopRecents(recent.value)
        if (installed.ok) await hydrateStartupPackages(installed.value.map(item => item.packageBytes), 'installed-local')
        setAnnouncement('Portable desktop workspace ready. Open a project or create a new one.')
        setLoading(false)
        return
      }
      const installedPacks = await repository.listInstalledPacks()
      for (const installed of installedPacks) {
        for (const asset of installed.pack.assets) {
          if (asset.source.kind !== 'sheet-v1') continue
          const bytes = await repository.readPackBlob(asset.source.pngSha256)
          if (bytes) await registerSheetPng(asset.source.pngSha256, bytes)
        }
        registerRuntimePack(runtimePackFromInstalled(installed))
      }
      const migration = await repository.migrateLegacy(localStorage)
      if (!active) return
      if (migration.status === 'blocked') {
        setLoadError(`${migration.error?.message ?? 'Legacy migration failed.'} Recovery data remains unchanged.`)
        setMigrationRecovery(migration.recoveryBytes ?? null)
      }
      const available = await repository.listProjects()
      if (!active) return
      setProjects(available)
      const preferredId = migration.projectId ?? available[0]?.id
      if (preferredId) {
          await hydrateStartupProject(preferredId)
          const restored = await repository.loadGraph(preferredId)
        if (active && restored) {
          setGraph(restored)
          setAnnouncement(`${restored.project.name} restored from local workspace.`)
        }
      } else if (migration.status !== 'blocked') {
        setAnnouncement('No project open.')
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [repository])

  useEffect(() => {
    if (!window.spriteHost) return
    const handleCloseRequest = () => {
      if (dirty) setConfirmClose(true)
      else {
        document.body.dataset.spriteCloseApproved = 'true'
        window.close()
      }
    }
    window.addEventListener('sprite-host-close-requested', handleCloseRequest)
    return () => window.removeEventListener('sprite-host-close-requested', handleCloseRequest)
  }, [dirty])

  const closeAfterSave = async () => {
    if (await saveDesktopProject()) {
      setConfirmClose(false)
      document.body.dataset.spriteCloseApproved = 'true'
      window.close()
    }
  }

  const discardAndClose = () => {
    setConfirmClose(false)
    document.body.dataset.spriteCloseApproved = 'true'
    window.close()
  }

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      if (!navigator.storage?.estimate) {
        setStorageStatus('Storage estimates are unavailable in this browser.')
        return
      }
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      const pressure = classifyStoragePressure(usage, quota)
      const persisted = await navigator.storage.persisted?.()
      setStoragePressure(pressure)
      setStorageStatus(`${pressure[0].toUpperCase()}${pressure.slice(1)}: ${(usage / 1_048_576).toFixed(1)} MiB of ${(quota / 1_048_576).toFixed(1)} MiB used. Persistent storage: ${persisted ? 'granted' : 'best effort'}.`)
    })()
  }, [projects, snapshots])

  useEffect(() => {
    if (!graph || view !== 'storage') return
    void repository.snapshots(graph.project.id).then(setSnapshots)
  }, [graph, repository, view])

  useEffect(() => {
    if (window.spriteHost || !graph || !dirty || saving || saveConflict) return
    const timer = window.setTimeout(() => autosave(graph), 750)
    return () => window.clearTimeout(timer)
  }, [dirty, graph, saveConflict, saving])

  useEffect(() => {
    document.title = project ? `${project.name} - The Sprite Project` : 'The Sprite Project'
  }, [project])

  const renderView = () => {
    if (view === 'packs') return <PackWorkspace repository={repository} protectedLock={activePackLock} onAnnouncement={setAnnouncement} onLibraryChange={() => setPackRegistryRevision(value => value + 1)} onOpenProject={projectId => void openProject(projectId)} onOpenStorage={() => setView('storage')} />
    if (!project) return null
    if (!pack && activePackLock) return (
      <section className="view" aria-labelledby="missing-pack-heading">
        <div className="view-heading"><div><p className="eyebrow">Project dependency blocked</p><h1 id="missing-pack-heading">Exact pack unavailable</h1></div></div>
        <div className="readiness blocked" role="alert"><div className="readiness-icon"><AlertTriangle /></div><div><p className="eyebrow">No substitution performed</p><h2>{activePackLock.packId} · {activePackLock.version}</h2><p>Checksum {activePackLock.sha256}. The project remains intact, but preview and export are blocked until this exact pack is located.</p></div></div>
        <div className="action-row"><label className="button primary" htmlFor="missing-pack-file"><Upload /> Locate exact pack</label><button className="button secondary" type="button" onClick={() => setView('packs')}>Open pack library</button></div>
        <input id="missing-pack-file" className="sr-only" type="file" accept=".spritepack" onChange={event => { const file = event.target.files?.[0]; if (file) void locateMissingPack(file); event.target.value = '' }} />
        <section className="storage-section missing-replacement" aria-labelledby="missing-replacement-heading"><div className="panel-heading"><div><p className="eyebrow">Optional recovery copy</p><h2 id="missing-replacement-heading">Replace with compatible local content</h2></div></div><p>The original project stays blocked and unchanged. A new project ID receives the selected pack defaults after impact confirmation.</p><div className="action-row">{selectablePacks().filter(item => item.id !== activePackLock.packId).map(candidate => <button key={packSelectionKey(candidate)} className="button secondary" type="button" onClick={() => setMissingReplacement(candidate)}>Use {candidate.name} {candidate.version} in a copy</button>)}</div></section>
      </section>
    )
    if (!pack) return null
    if (view === 'project') return (
      <section className="view" aria-labelledby="project-heading">
        <div className="view-heading">
          <div><p className="eyebrow">Local workspace</p><h1 id="project-heading">{project.name}</h1></div>
          <button ref={renameButton} className="button secondary" type="button" onClick={() => setDialogMode('rename')}><Pencil /> Rename project</button>
        </div>
        <section className="character-collection" aria-labelledby="characters-heading">
          <div className="panel-heading"><div><p className="eyebrow">Project cast</p><h2 id="characters-heading">Characters</h2></div><div className="character-create"><button className="button primary" type="button" disabled={graph!.project.recipeIds.length >= 16} onClick={event => { rememberOverlayTrigger(event.currentTarget); setCharacterDialog({ mode: 'create', recipeId: graph!.project.activeRecipeId, initialName: '' }) }}><Plus /> Create character</button>{graph!.project.recipeIds.length >= 16 && <small>Maximum 16 characters per project</small>}</div></div>
          <div className="character-list" role="list" aria-label="Project characters">
            {graph!.project.recipeIds.map(recipeId => {
              const recipe = graph!.recipes[recipeId]
              const active = graph!.project.activeRecipeId === recipeId
              const lock = graph!.project.packLocks.find(item => item.packId === recipe.packId)
              const recipePack = lock ? packByLock(lock) : null
              const recipeReady = recipePack ? isExportReady(legacyProjection(graph!, recipeId), recipePack) : false
              return <div key={recipeId} role="listitem" aria-current={active ? 'true' : undefined} className={`character-row ${active ? 'active' : ''}`}><div className="character-row__identity"><div><strong>{recipe.name}</strong>{active && <span className="active-label">Active</span>}</div><span>{recipePack ? `${recipePack.name} ${recipePack.version}` : `${recipe.packId} unavailable`} · {recipeReady ? 'Ready' : 'Blocked'}</span></div><div className="action-row">{active ? <button className="button secondary" type="button" onClick={() => setView('compose')}><Layers3 /> Edit active character</button> : <button className="button secondary" type="button" onClick={() => openCharacter(recipeId)}>Open character</button>}<button className="icon-button" type="button" aria-label={`Duplicate ${recipe.name}`} onClick={event => { rememberOverlayTrigger(event.currentTarget); setCharacterDialog({ mode: 'duplicate', recipeId, initialName: duplicateCharacterName(graph!, recipeId) }) }}><Copy /></button><button className="icon-button" type="button" aria-label={`Rename ${recipe.name}`} onClick={event => { rememberOverlayTrigger(event.currentTarget); setCharacterDialog({ mode: 'rename', recipeId, initialName: recipe.name }) }}><Pencil /></button><button className="icon-button" type="button" aria-label={`Delete ${recipe.name}`} disabled={graph!.project.recipeIds.length === 1} onClick={event => { rememberOverlayTrigger(event.currentTarget); setCharacterDeleteId(recipeId) }}><Trash2 /></button></div></div>
            })}
          </div>
        </section>
        <div className="project-facts">
          <div><span>Active character</span><strong>{project.character.name}</strong></div>
          <div><span>Characters</span><strong>{graph!.project.recipeIds.length} of 16</strong></div>
          <div><span>Content pack</span><strong>{pack.name} {pack.version}</strong></div>
          <div><span>Output</span><strong>{ready ? 'Ready' : 'Blocked'}</strong></div>
        </div>
        <StatusStrip blockers={blockers} />
        <div className="action-row">
          <button className="button primary" type="button" onClick={() => setView('compose')}><Layers3 /> Compose character</button>
          <button className="button secondary" type="button" onClick={() => void restoreSafeProject()}><RotateCcw /> Restore safe project</button>
        </div>
      </section>
    )

    if (view === 'compose') {
      const options = assetsForSlot(pack, selectedSlot)
      const optional = !REQUIRED_SLOTS.includes(selectedSlot as never)
      return (
        <section className="view" aria-labelledby="compose-heading">
          <div className="view-heading"><div><p className="eyebrow">Recipe · {project.character.name}</p><h1 id="compose-heading">Compose</h1></div><div className="active-character-context" role="status" aria-label="Active character"><span>Active character</span><strong>{project.character.name}</strong></div></div>
          <label className="field compact"><span>Content pack</span><select value={packSelectionKey(pack)} onChange={event => void handlePackChange(event.target.value)}>{selectablePacks(pack).map(item => <option key={packSelectionKey(item)} value={packSelectionKey(item)}>{item.name} · {item.version}</option>)}</select><small>{pack.description}</small></label>
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
        <div className="view-heading"><div><p className="eyebrow">Semantic palette · {project.character.name}</p><h1 id="theme-heading">Theme</h1></div></div>
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

    if (view === 'terrain') return <EnvironmentWorkspace terrain={graph?.terrain ?? null} theme={project.theme} onChange={updateTerrain} onOpenExport={() => setView('terrain-export')} onRequestRemove={() => { rememberOverlayTrigger(); setConfirmTerrainRemoval(true) }} onAnnouncement={setAnnouncement} />

    if (view === 'terrain-export') {
      const terrain = graph?.terrain ?? null
      if (!terrain) return <EnvironmentWorkspace terrain={null} theme={project.theme} onChange={updateTerrain} onOpenExport={() => setView('terrain-export')} onRequestRemove={() => {}} onAnnouncement={setAnnouncement} />
      const material = TERRAIN_MATERIALS[terrain.materialId]
      const atlasHash = terrainPixelHash(renderTerrainAtlas(terrain))
      return (
        <section className="view" aria-labelledby="terrain-export-heading">
          <div className="view-heading"><div><p className="eyebrow">Terrain delivery</p><h1 id="terrain-export-heading">Terrain export</h1></div><button className="button secondary" type="button" onClick={() => setView('terrain')}><Map /> Back to terrain</button></div>
          <div className="readiness ready" role="status" aria-label="Terrain export readiness"><div className="readiness-icon"><ShieldCheck /></div><div><p className="eyebrow">Export readiness</p><h2>Ready</h2><p>{material.name} · 128 × 128 atlas · 32px tiles · #{atlasHash}</p></div></div>
          <div className="export-options">
            <section><FileArchive /><div><h2>Generic terrain package</h2><p>Autotile atlas, complete mask manifest, build metadata, and exact credits.</p><ul><li>16 cardinal masks</li><li>Deterministic RGBA PNG</li><li>Portable JSON contract</li></ul></div><button type="button" className="button primary" onClick={() => void runTerrainExport('generic')}><Download /> Download terrain package</button></section>
            <section><Gamepad2 /><div><h2>Godot 4.7.1 terrain package</h2><p>Generic files plus a directly loadable TileSet with all side peering bits.</p><ul><li>Source ID 0</li><li>Match sides terrain</li><li>No manual slicing</li></ul></div><button type="button" className="button primary" onClick={() => void runTerrainExport('godot')}><Download /> Download Godot terrain package</button></section>
          </div>
          <div className="credits-panel" aria-label="Terrain credits"><div className="panel-heading"><div><p className="eyebrow">Selected material</p><h2>Credits</h2></div><span>{material.id}</span></div><div className="credit-row"><ShieldCheck /><div><strong>{material.provenance.source}</strong><span>{material.provenance.author} · {material.provenance.chosenLicense}</span><small>{material.provenance.sourceUrl}</small></div></div></div>
          <p className="export-status" role="status">{terrainExportStatus}</p>
        </section>
      )
    }

    if (view === 'preview') return (
      <section className="view" aria-labelledby="preview-heading">
        <div className="view-heading"><div><p className="eyebrow">Animation coverage · {project.character.name}</p><h1 id="preview-heading">Preview</h1></div></div>
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

    if (view === 'storage' && hostInfo) return (
      <section className="view" aria-labelledby="desktop-storage-heading">
        <div className="view-heading"><div><p className="eyebrow">Portable desktop host</p><h1 id="desktop-storage-heading">Project files</h1></div><span className="host-state ready">Windows x64 · {hostInfo.version}</span></div>
        <div className="storage-summary" role="status"><HardDrive /><div><strong>{desktopLocation ? 'Approved project location' : 'No project location selected'}</strong><span>{desktopLocation?.displayPath ?? 'Choose a folder or .spriteproject file. Displayed paths never authorize later operations.'}</span><small>{desktopFingerprint ? `Manifest ${desktopFingerprint.manifestSha256.slice(0, 12)}… · ${Object.keys(desktopFingerprint.entries).length} canonical entries` : 'Operations require an opaque, session-scoped native grant.'}</small></div></div>
        <div className="storage-actions">
          <button type="button" className="button secondary" onClick={() => void chooseDesktopProject('folder')}><FolderOpen /> Open project folder</button>
          <button type="button" className="button secondary" onClick={() => void chooseDesktopProject('file')}><FileArchive /> Open .spriteproject</button>
          <button type="button" className="button primary" disabled={!graph} onClick={() => void saveDesktopProject()}><Save /> Save</button>
          <button type="button" className="button secondary" disabled={!graph} onClick={() => void saveDesktopAs()}><FolderOpen /> Save As</button>
          <button type="button" className="button secondary" disabled={!graph} onClick={() => void exportDesktopArchive()}><Download /> Export .spriteproject</button>
        </div>
        <section className="storage-section" aria-labelledby="recent-heading">
          <div className="panel-heading"><div><p className="eyebrow">Local host settings</p><h2 id="recent-heading">Recent projects</h2></div><span>{desktopRecents.length} remembered</span></div>
          {desktopRecents.length ? <div className="project-list">{desktopRecents.map(item => <div key={item.recentId}><div><strong>{item.available ? 'Available' : 'Unavailable'}</strong><span>{item.displayPath}</span></div><div className="action-row"><button className="button secondary" type="button" onClick={() => void openRecentDesktopProject(item.recentId)}>Open</button><button className="icon-button" type="button" aria-label={`Remove ${item.displayPath} from recent`} onClick={() => void forgetRecentDesktopProject(item.recentId)}><X /></button></div></div>)}</div> : <p className="empty-state">Projects opened or saved in this session appear here.</p>}
        </section>
        <p className="export-status" role="status">Renderer isolation active. Node.js and raw filesystem paths are not exposed to this interface.</p>
      </section>
    )

    if (view === 'storage') return (
      <section className="view" aria-labelledby="storage-heading">
        <div className="view-heading"><div><p className="eyebrow">Local data custody</p><h1 id="storage-heading">Storage</h1></div><span className={`host-state ${online ? 'ready' : 'offline'}`}>{online ? 'Online' : 'Offline'}</span></div>
        <div className={`storage-summary ${storagePressure}`} role="status"><HardDrive /><div><strong>Browser workspace · IndexedDB · revision {graph?.project.revision ?? 0}</strong><span>{storageStatus}</span><small>{graph?.project.packLocks.every(lock => PACKS.some(item => item.id === lock.packId && item.version === lock.version)) ? 'Ready offline: every exact pack lock is bundled.' : 'Offline blocked: one or more exact packs are unavailable.'} No cloud backup is active.</small></div></div>
        <div className="storage-actions">
          <button type="button" className="button primary" onClick={() => void exportArchive()}><Download /> Download project backup</button>
          <button type="button" className="button secondary" onClick={event => { rememberOverlayTrigger(event.currentTarget); importInput.current?.click() }}><Upload /> Import project backup</button>
          {storagePressure !== 'healthy' && <button type="button" className="button secondary" onClick={event => { rememberOverlayTrigger(event.currentTarget); void previewCleanup() }}><Trash2 /> Clear disposable data</button>}
        </div>
        <section className="storage-section" aria-labelledby="projects-heading">
          <div className="panel-heading"><div><p className="eyebrow">IndexedDB</p><h2 id="projects-heading">Projects</h2></div><span>{projects.length} local</span></div>
          <div className="project-list">{projects.map(item => <div key={item.id} className={item.id === graph?.project.id ? 'active' : ''}><div><strong>{item.name}</strong><span>Revision {item.revision} · {item.id}</span></div><div className="action-row"><button className="button secondary" type="button" disabled={item.id === graph?.project.id} onClick={() => void openProject(item.id)}>Open</button><button className="icon-button" type="button" aria-label={`Delete ${item.name}`} onClick={event => { rememberOverlayTrigger(event.currentTarget); setDeleteCandidate(item) }}><Trash2 /></button></div></div>)}</div>
        </section>
        <section className="storage-section" aria-labelledby="snapshots-heading">
          <div className="panel-heading"><div><p className="eyebrow">Recovery</p><h2 id="snapshots-heading">Snapshots</h2></div><span>{snapshots.length} available</span></div>
          {snapshots.length ? <div className="snapshot-list">{snapshots.map(item => <div key={item.revision}><History /><div><strong>Revision {item.revision}</strong><span>{item.reason} · {new Date(item.createdAt).toLocaleString()}</span></div><button className="button secondary" type="button" onClick={event => { rememberOverlayTrigger(event.currentTarget); setSnapshotCandidate(item) }}>Restore</button></div>)}</div> : <p className="empty-state">Recovery points appear after the first replacement save.</p>}
        </section>
        <section className="danger-zone"><div><strong>Clear browser workspace</strong><span>Removes projects, snapshots, packs, migration records, and preferences from this browser only.</span></div><button type="button" className="button secondary destructive" onClick={event => { rememberOverlayTrigger(event.currentTarget); setConfirmClear(true) }}><Trash2 /> Clear all local data</button></section>
      </section>
    )

    const credits = creditsFor(project, pack)
    return (
      <section className="view" aria-labelledby="export-heading">
        <div className="view-heading"><div><p className="eyebrow">Delivery · active character</p><h1 id="export-heading">Export {project.character.name}</h1></div></div>
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
    <div className={`app-shell ${hostInfo ? 'electron-shell' : ''}`}>
      {hostInfo && (
        <div className="electron-titlebar" aria-label="Application title bar">
          <div className="electron-titlebar__identity">
            <span className="electron-titlebar__mark"><Sparkles /></span>
            <strong>The Sprite Project</strong>
            <span className="electron-titlebar__separator" aria-hidden="true">/</span>
            <span className="electron-titlebar__project">{project?.name ?? 'Desktop workspace'}</span>
          </div>
          <span className="electron-titlebar__meta">Portable · {hostInfo.version}</span>
        </div>
      )}
      <header className="topbar">
        {hostInfo
          ? <div className="command-context"><span>Project workspace</span><strong>{project?.name ?? 'No project open'}</strong></div>
          : <div className="brand"><span className="brand-mark"><Sparkles /></span><span><strong>The Sprite Project</strong><small>Browser character workspace</small></span></div>}
        <div className="topbar-actions">
          {project && <span className={`save-state ${dirty ? 'dirty' : ''}`}>{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved locally'}</span>}
          <button ref={newProjectButton} type="button" className="button secondary" onClick={() => setDialogMode('new')}><Plus /> New project</button>
          <button type="button" className="button primary" disabled={!project || !dirty || saving} onClick={handleSave}><Save /> Save project</button>
        </div>
      </header>
      <div className="app-body">
        <nav className="workflow-nav" aria-label="Project workflow">
          {NAV_ITEMS.map(item => { const Icon = item.icon; return <button key={item.id} type="button" disabled={!project && item.id !== 'packs'} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><Icon /><span>{item.label}</span></button> })}
          <div className="nav-progress" aria-label="Workflow progress">{NAV_ITEMS.map(item => <i key={item.id} className={project && (item.id !== 'export' || ready) ? 'complete' : ''} />)}</div>
        </nav>
        <main className={`workspace ${view === 'packs' || (project && !pack) ? 'pack-mode' : ''}`}>
          {!project && view !== 'packs' ? (
            <section className="empty-workspace">
              <div className="empty-glyph"><Layers3 /></div>
              <p className="eyebrow">Local-first character studio</p>
              <h1>{loading ? 'Opening local workspace' : loadError ? 'Project recovery required' : 'No project open'}</h1>
              <p>{loading ? 'Checking IndexedDB and legacy recovery data.' : loadError ?? 'Create a project to begin with a complete animated starter character.'}</p>
              <div className="action-row">
                {!loading && migrationRecovery !== null && <button className="button secondary" type="button" onClick={() => void retryMigration()}><RotateCcw /> Retry migration</button>}
                {!loading && migrationRecovery !== null && <button className="button secondary" type="button" onClick={downloadMigrationRecovery}><Download /> Download recovery data</button>}
                {!loading && migrationRecovery !== null && <button className="button quiet" type="button" onClick={() => { setLoadError(null); setMigrationRecovery(null); setAnnouncement('Continuing without opening the legacy project. Source recovery bytes remain unchanged.') }}>Continue without opening project</button>}
                {!loading && hostInfo && <button className="button secondary" type="button" onClick={() => void chooseDesktopProject('folder')}><FolderOpen /> Open project folder</button>}
                {!loading && hostInfo && <button className="button secondary" type="button" onClick={() => void chooseDesktopProject('file')}><FileArchive /> Open .spriteproject</button>}
                {!loading && !hostInfo && <button className="button secondary" type="button" onClick={event => { rememberOverlayTrigger(event.currentTarget); importInput.current?.click() }}><Upload /> Import project backup</button>}
                {!loading && <button className="button primary" type="button" onClick={() => setDialogMode('new')}><Plus /> New project</button>}
              </div>
            </section>
          ) : view === 'packs' || (project && !pack) ? (
            <div className="content-pane content-pane--wide">{renderView()}</div>
          ) : (
            <>
              <div className="content-pane">{renderView()}</div>
              <aside className="preview-pane" aria-label="Character preview">
                <div className="preview-heading"><div><p className="eyebrow">Live character</p><h2>{project!.character.name}</h2></div><span className={`readiness-pill ${ready ? 'ready' : 'blocked'}`}>{ready ? <Check /> : <AlertTriangle />}{ready ? 'Ready' : 'Blocked'}</span></div>
                <SpriteCanvas project={project!} pack={pack ?? undefined} compact={view !== 'preview'} />
                <div className="preview-actions"><button type="button" className="button quiet" onClick={() => setView('preview')}><Play /> Open preview</button><button type="button" className="button quiet" onClick={() => setView('export')}><Download /> Export</button></div>
              </aside>
            </>
          )}
        </main>
      </div>
      <input ref={importInput} className="sr-only" type="file" accept=".spriteproject,application/zip" aria-label="Choose project backup" onChange={event => {
        const file = event.target.files?.[0]
        if (file) void importArchive(file)
        event.target.value = ''
      }} />
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      {dialogMode && <ProjectDialog mode={dialogMode} initialName={dialogMode === 'rename' ? project?.name ?? '' : ''} onCancel={closeDialog} onSubmit={submitProjectDialog} />}
      {characterDialog && <CharacterNameDialog mode={characterDialog.mode} initialName={characterDialog.initialName} onCancel={() => dismissOverlay(() => setCharacterDialog(null))} onSubmit={submitCharacterName} />}
      {importPending && <ImportSummaryDialog archive={importPending.archive} fileName={importPending.fileName} onCancel={() => dismissOverlay(() => setImportPending(null))} onImport={confirmArchiveImport} />}
      {deleteCandidate && <ConfirmNameDialog projectName={deleteCandidate.name} onCancel={() => dismissOverlay(() => setDeleteCandidate(null))} onConfirm={deleteLocalProject} />}
      {snapshotCandidate && <ChoiceDialog title={`Restore revision ${snapshotCandidate.revision}?`} description="The current graph will be preserved as a pre-restore checkpoint before this recovery point replaces it." onCancel={() => dismissOverlay(() => setSnapshotCandidate(null))} choices={[
        { label: 'Restore recovery point', action: restoreSelectedSnapshot, primary: true },
      ]} />}
      {disposablePreview && <ChoiceDialog title="Clear disposable data?" description={`This will remove ${disposablePreview.unreferencedPackBlobs} unreferenced official pack blobs and ${disposablePreview.removableSnapshots} unprotected snapshots. Current projects, referenced packs, user imports, migration recovery, and one last-known-good snapshot per project remain.`} onCancel={() => dismissOverlay(() => setDisposablePreview(null))} choices={[
        { label: 'Clear disposable data', action: clearDisposable, primary: true },
      ]} />}
      {saveConflict && <ChoiceDialog title="Newer project revision found" description={`${saveConflict.project.name} changed in another tab. No stale data was written.`} onCancel={() => dismissOverlay(() => setSaveConflict(null))} choices={[
        { label: 'Reload newer version', action: resolveReload, primary: true },
        { label: 'Overwrite with my version', action: resolveOverwrite },
        { label: 'Save as copy', action: resolveSaveCopy },
      ]} />}
      {importConflict && <ChoiceDialog title="Project already exists" description="Choose whether to replace the existing project while preserving a recovery checkpoint, or import a separate copy." onCancel={() => dismissOverlay(() => setImportConflict(null))} choices={[
        { label: 'Replace existing project with imported version', action: replaceImportedProject },
        { label: 'Import as new project', action: copyImportedProject, primary: true },
      ]} />}
      {packActivation && <ChoiceDialog title={`Activate ${packActivation.name} ${packActivation.version}?`} description={`The current project state will be checkpointed before its exact lock changes. Compatibility: ${activationImpact?.retained.length ?? 0} selected asset IDs retained, ${activationImpact?.removed.length ?? 0} unavailable, ${activationImpact?.added.length ?? 0} target-only assets. Defaults replace incompatible selections; rendered pixels and credits are expected to change. Other projects are unchanged.`} onCancel={() => dismissOverlay(() => setPackActivation(null))} choices={[
        { label: 'Create checkpoint and activate', action: async () => applyPackChange(packActivation, true), primary: true },
      ]} />}
      {missingReplacement && project && <ChoiceDialog title={`Create a ${missingReplacement.name} replacement copy?`} description={`${Object.values(project.character.selections).filter(Boolean).length} current selections cannot be verified without the missing pack and will be replaced by ${missingReplacement.name} defaults. The new copy gets a new project ID; the original exact lock, project bytes, and recovery path remain unchanged.`} onCancel={() => dismissOverlay(() => setMissingReplacement(null))} choices={[
        { label: 'Create replacement copy', action: replaceMissingPackInCopy, primary: true },
      ]} />}
      {confirmClear && <ChoiceDialog title="Clear browser workspace?" description="This removes all projects and recovery data stored by this browser. Downloaded .spriteproject files are not affected." onCancel={() => dismissOverlay(() => setConfirmClear(false))} choices={[
        { label: 'Clear all local data', action: clearWorkspace, destructive: true },
      ]} />}
      {desktopConflict && <ChoiceDialog title="Project files changed outside this window" description="No files were written. Reload the disk version, overwrite after preserving a recovery copy, choose a new folder, or cancel." onCancel={() => setDesktopConflict(false)} choices={[
        { label: 'Reload disk version', action: async () => { if (desktopLocation) await openDesktopLocation(desktopLocation); setDesktopConflict(false) }, primary: true },
        { label: 'Overwrite from this window', action: async () => { await saveDesktopProject(desktopLocation, true) } },
        { label: 'Save As', action: saveDesktopAs },
      ]} />}
      {confirmClose && <ChoiceDialog title="Save changes before closing?" description={`${project?.name ?? 'This project'} has unsaved changes.`} onCancel={() => setConfirmClose(false)} choices={[
        { label: 'Save', action: closeAfterSave, primary: true },
        { label: 'Discard', action: discardAndClose, destructive: true },
      ]} />}
      {confirmTerrainRemoval && graph?.terrain && <ChoiceDialog title="Remove terrain from this project?" description={`${graph.terrain.name} uses ${TERRAIN_MATERIALS[graph.terrain.materialId].name}. The next save creates the normal project snapshot. Character recipe, packs, theme, and character exports are unaffected.`} onCancel={() => dismissOverlay(() => setConfirmTerrainRemoval(false))} choices={[
        { label: 'Remove terrain document', action: () => { setGraph(current => current ? { ...current, terrain: null } : current); editVersion.current += 1; setDirty(true); setConfirmTerrainRemoval(false); setAnnouncement('Terrain removed. Character state is unchanged.') }, destructive: true },
      ]} />}
      {characterDeleteId && graph?.recipes[characterDeleteId] && <ChoiceDialog title={`Delete ${graph.recipes[characterDeleteId].name}?`} description={`${graph.recipes[characterDeleteId].name} uses ${graph.recipes[characterDeleteId].packId}${graph.project.activeRecipeId === characterDeleteId ? ' and is currently active' : ''}. The next save creates a recovery snapshot. Other characters, project theme, packs, terrain, and exports are unchanged.`} onCancel={() => dismissOverlay(() => setCharacterDeleteId(null))} choices={[
        { label: 'Delete character permanently', action: () => { const deletedName = graph.recipes[characterDeleteId].name; const next = removeCharacter(graph, characterDeleteId); commitCharacterGraph(next, `${deletedName} removed. ${next.recipes[next.project.activeRecipeId].name} is active.`); setCharacterDeleteId(null) }, destructive: true },
      ]} />}
    </div>
  )
}

export default App
