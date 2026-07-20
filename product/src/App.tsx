import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { unzipSync } from 'fflate'
import {
  AlertTriangle, Box, Check, CheckCircle2, Download, FileArchive, FolderOpen,
  Gamepad2, HardDrive, History, Info, Layers3, Palette, Pause, Pencil, Play, Plus, RotateCcw,
  Save, ShieldCheck, Sparkles, Trash2, Upload, X,
} from 'lucide-react'
import './App.css'
import { SpriteCanvas } from './components/SpriteCanvas'
import { readProjectArchive, writeProjectArchive, type ReadArchiveResult } from './domain/archive'
import { buildPackage, downloadBytes } from './domain/export'
import { ProductError } from './domain/errors'
import { packLockFor } from './domain/pack-locks'
import { assetsForSlot, packById, PACKS } from './domain/packs'
import {
  creditsFor, exportBlockers, isExportReady, resolvedTheme,
  switchPack, touch,
} from './domain/project'
import { applyLegacyProjection, copyProjectGraph, createProjectGraph, legacyProjection } from './domain/project-v2'
import { isValidHex, presetById, THEME_PRESETS, TOKEN_DESCRIPTIONS, TOKEN_LABELS } from './domain/themes'
import {
  DIRECTIONS, REQUIRED_SLOTS, SLOT_IDS, TOKEN_IDS,
  type AnimationId, type Direction, type ProjectGraphV2, type SlotId, type SpriteProject, type SpriteProjectV2, type TokenId,
} from './domain/types'
import { classifyStoragePressure, type DisposableDataPreview, type SnapshotRecord, type StoragePressure, WorkspaceRepository } from './web/repository'
import type { ApprovedLocation, HostInfo, ProjectFingerprint, RecentProject } from './host/bridge'

type ViewId = 'project' | 'compose' | 'theme' | 'preview' | 'storage' | 'export'
type DialogMode = 'new' | 'rename' | null

const NAV_ITEMS = [
  { id: 'project' as const, label: 'Project', icon: FolderOpen },
  { id: 'compose' as const, label: 'Compose', icon: Layers3 },
  { id: 'theme' as const, label: 'Theme', icon: Palette },
  { id: 'preview' as const, label: 'Preview', icon: Play },
  { id: 'storage' as const, label: 'Storage', icon: HardDrive },
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
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveConflict, setSaveConflict] = useState<ProjectGraphV2 | null>(null)
  const [importConflict, setImportConflict] = useState<ProjectGraphV2 | null>(null)
  const [importPending, setImportPending] = useState<{ archive: ReadArchiveResult; fileName: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<SpriteProjectV2 | null>(null)
  const [snapshotCandidate, setSnapshotCandidate] = useState<SnapshotRecord | null>(null)
  const [migrationRecovery, setMigrationRecovery] = useState<string | null>(null)
  const [storagePressure, setStoragePressure] = useState<StoragePressure>('healthy')
  const [disposablePreview, setDisposablePreview] = useState<DisposableDataPreview | null>(null)
  const [announcement, setAnnouncement] = useState('Opening local workspace.')
  const [exportStatus, setExportStatus] = useState('No package generated in this session.')
  const [storageStatus, setStorageStatus] = useState('Checking browser storage.')
  const [online, setOnline] = useState(navigator.onLine)
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null)
  const [desktopLocation, setDesktopLocation] = useState<ApprovedLocation | null>(null)
  const [desktopFingerprint, setDesktopFingerprint] = useState<ProjectFingerprint | null>(null)
  const [desktopRecents, setDesktopRecents] = useState<RecentProject[]>([])
  const [desktopConflict, setDesktopConflict] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [colorDrafts, setColorDrafts] = useState<Partial<Record<TokenId, string>>>({})
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

  const pack = project ? packById(project.packId) : null
  const blockers = project ? exportBlockers(project) : []
  const ready = project ? isExportReady(project) : false
  const selectedAsset = project && pack
    ? pack.assets.find(item => item.id === project.character.selections[selectedSlot]) ?? null
    : null

  const refreshProjects = async () => setProjects(await repository.listProjects())

  const openProject = async (projectId: string) => {
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
    if (!project || !graph) return
    const next = switchPack(project, project.packId)
    setGraph(applyLegacyProjection(graph, next, await packLockFor(next.packId)))
    editVersion.current += 1
    setLoadError(null)
    setDirty(true)
    setView('project')
    setAnnouncement('Safe project restored with compatible pack defaults.')
  }

  const handlePackChange = async (packId: string) => {
    if (!project || !graph) return
    const nextPack = packById(packId)
    const next = switchPack(project, packId)
    setGraph(applyLegacyProjection(graph, next, await packLockFor(packId)))
    editVersion.current += 1
    setSelectedSlot('body')
    setDirty(true)
    setAnnouncement(`${nextPack.name} selected. Incompatible selections were replaced with pack defaults.`)
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
    const bytes = await writeProjectArchive(graph)
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
        setImportConflict(imported)
        return
      }
      await repository.createGraph(imported)
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
    const current = await repository.loadGraph(importConflict.project.id)
    if (!current) return
    const replaced = await repository.saveGraph({ ...importConflict, project: { ...importConflict.project, revision: current.project.revision } }, current.project.revision, 'archive replace')
    setGraph(replaced)
    setImportConflict(null)
    setDirty(false)
    setView('project')
    await refreshProjects()
    setAnnouncement('Existing project replaced; prior work is available as a recovery checkpoint.')
  }

  const copyImportedProject = async () => {
    if (!importConflict) return
    const copy = copyProjectGraph(importConflict, `${importConflict.project.name} (imported copy)`)
    await repository.createGraph(copy)
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
    setGraph(response.value.graph)
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
    const response = await window.spriteHost.saveProject({ destinationGrantId: destination.grantId, graph, expectedFingerprint: destination.grantId === desktopLocation?.grantId ? desktopFingerprint : null, overwriteExternal })
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
    const response = await window.spriteHost.writeArchive({ destinationGrantId: chosen.value.grantId, graph })
    setAnnouncement(response.ok ? `Portable archive written to ${response.value.location.displayPath}.` : `${response.error.message} (${response.error.code})`)
  }

  const openRecentDesktopProject = async (recentId: string) => {
    const response = await window.spriteHost?.openRecentProject(recentId)
    if (!response) return
    if (!response.ok) {
      setAnnouncement(`${response.error.message} (${response.error.code})`)
      return
    }
    setGraph(response.value.graph)
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
      const result = await buildPackage(project, target)
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

  useEffect(() => {
    let active = true
    void (async () => {
      if (window.spriteHost) {
        const [host, recent] = await Promise.all([window.spriteHost.getHostInfo(), window.spriteHost.listRecentProjects()])
        if (!active) return
        if (host.ok) setHostInfo(host.value)
        if (recent.ok) setDesktopRecents(recent.value)
        setAnnouncement('Portable desktop workspace ready. Open a project or create a new one.')
        setLoading(false)
        return
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
          <button className="button secondary" type="button" onClick={() => void restoreSafeProject()}><RotateCcw /> Restore safe project</button>
        </div>
      </section>
    )

    if (view === 'compose') {
      const options = assetsForSlot(pack, selectedSlot)
      const optional = !REQUIRED_SLOTS.includes(selectedSlot as never)
      return (
        <section className="view" aria-labelledby="compose-heading">
          <div className="view-heading"><div><p className="eyebrow">Recipe</p><h1 id="compose-heading">Compose</h1></div></div>
          <label className="field compact"><span>Content pack</span><select value={pack.id} onChange={event => void handlePackChange(event.target.value)}>{PACKS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select><small>{pack.description}</small></label>
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
          {NAV_ITEMS.map(item => { const Icon = item.icon; return <button key={item.id} type="button" disabled={!project} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><Icon /><span>{item.label}</span></button> })}
          <div className="nav-progress" aria-label="Workflow progress">{NAV_ITEMS.map(item => <i key={item.id} className={project && (item.id !== 'export' || ready) ? 'complete' : ''} />)}</div>
        </nav>
        <main className="workspace">
          {!project ? (
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
      <input ref={importInput} className="sr-only" type="file" accept=".spriteproject,application/zip" aria-label="Choose project backup" onChange={event => {
        const file = event.target.files?.[0]
        if (file) void importArchive(file)
        event.target.value = ''
      }} />
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      {dialogMode && <ProjectDialog mode={dialogMode} initialName={dialogMode === 'rename' ? project?.name ?? '' : ''} onCancel={closeDialog} onSubmit={submitProjectDialog} />}
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
    </div>
  )
}

export default App
