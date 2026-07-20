import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { AlertTriangle, Box, CheckCircle2, Download, FileArchive, Package, Plus, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { downloadBytes } from '../domain/export'
import { writeDraftRecovery } from '../domain/draft-recovery'
import { LICENSE_PROFILES, SUPPORTED_LICENSES, type SupportedLicense } from '../domain/license-profiles'
import { registerSheetPng, runtimePackFromInstalled } from '../domain/pack-runtime'
import { PACKS, registerRuntimePack, unregisterRuntimePack } from '../domain/packs'
import type { HexRgb, InstalledPackVersion, PackDraftAssetV1, PackDraftV1, PackProvenanceV1, SourceColorBinding } from '../domain/pack-types'
import type { PackLockRef } from '../domain/types'
import { analyzeHumanoidSheetPng, type HumanoidSheetAnalysis } from '../domain/png-profile'
import { writeSpritePack, type ReadSpritePackResult } from '../domain/spritepack'
import { readSpritePackResponsive, type PackValidationProgress } from '../domain/pack-validation-client'
import { TOKEN_IDS, type SlotId, type TokenId } from '../domain/types'
import { WorkspaceRepository } from '../web/repository'
import type { InstalledPackSummary } from '../host/bridge'
import { SpriteCanvas } from './SpriteCanvas'
import { presetById } from '../domain/themes'
import type { AnimationId, ContentPack, Direction, SpriteProject, ThemeTokens } from '../domain/types'
import { ProductError } from '../domain/errors'

interface PackWorkspaceProps {
  repository: WorkspaceRepository
  onAnnouncement: (message: string) => void
  onLibraryChange?: () => void
  protectedLock?: PackLockRef | null
  onOpenProject?: (projectId: string) => void
  onOpenStorage?: () => void
}

type Mode = 'library' | 'author'

function identity(version: InstalledPackVersion): string {
  return `${version.packId}@${version.version}#${version.packageSha256}`
}

function download(bytes: Uint8Array, filename: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.sprite-project.pack+zip' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function PackWorkspace({ repository, onAnnouncement, onLibraryChange, protectedLock, onOpenProject, onOpenStorage }: PackWorkspaceProps) {
  const [mode, setMode] = useState<Mode>('library')
  const [versions, setVersions] = useState<InstalledPackVersion[]>([])
  const [drafts, setDrafts] = useState<PackDraftV1[]>([])
  const [pending, setPending] = useState<{ fileName: string; result: ReadSpritePackResult } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorReport, setErrorReport] = useState<string | null>(null)
  const [draft, setDraft] = useState<PackDraftV1 | null>(null)
  const [assets, setAssets] = useState<PackDraftAssetV1[]>([])
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)
  const [sourceColors, setSourceColors] = useState<{ hex: string; count: number }[]>([])
  const [assetAnalyses, setAssetAnalyses] = useState<Record<string, HumanoidSheetAnalysis>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [desktopSummaries, setDesktopSummaries] = useState<Record<string, InstalledPackSummary>>({})
  const [detailVersion, setDetailVersion] = useState<InstalledPackVersion | null>(null)
  const [detailDependencies, setDetailDependencies] = useState<string[]>([])
  const [busyPackIdentity, setBusyPackIdentity] = useState<string | null>(null)
  const [previewAnimation, setPreviewAnimation] = useState<AnimationId>('walk')
  const [previewDirection, setPreviewDirection] = useState<Direction>('south')
  const [previewTheme, setPreviewTheme] = useState<ThemeTokens>(() => ({ ...presetById('hearth').tokens }))
  const [removeCandidate, setRemoveCandidate] = useState<InstalledPackVersion | null>(null)
  const [removeDependencies, setRemoveDependencies] = useState<{ id: string; name: string }[]>([])
  const [draftFailure, setDraftFailure] = useState<{ code: string; message: string } | null>(null)
  const [packFilter, setPackFilter] = useState('')
  const [dependencyCounts, setDependencyCounts] = useState<Record<string, number>>({})
  const [validationProgress, setValidationProgress] = useState<PackValidationProgress | null>(null)
  const packInput = useRef<HTMLInputElement>(null)
  const sheetInput = useRef<HTMLInputElement>(null)
  const identitySection = useRef<HTMLElement>(null)
  const assetSection = useRef<HTMLElement>(null)

  const activeAsset = assets.find(asset => asset.assetId === activeAssetId) ?? null
  const previewPack: ContentPack | null = activeAsset && draft ? {
    id: `draft-preview.${draft.id}`,
    version: draft.version,
    name: draft.name,
    description: draft.description,
    defaults: { body: null, hair: null, headwear: null, torso: null, legs: null, feet: null, [activeAsset.slot]: activeAsset.assetId },
    origin: 'authored-local',
    assets: [{
      id: activeAsset.assetId,
      name: activeAsset.name,
      slot: activeAsset.slot,
      description: activeAsset.description,
      parts: [],
      coverage: ['idle', 'walk'],
      provenance: activeAsset.provenance ? {
        author: activeAsset.provenance.author,
        source: activeAsset.provenance.source,
        sourceUrl: activeAsset.provenance.sourceUrl,
        license: activeAsset.provenance.chosenLicense,
        chosenLicense: activeAsset.provenance.chosenLicense,
        attributionText: activeAsset.provenance.attributionText,
      } : { author: 'Draft author', source: 'Unpublished draft', sourceUrl: 'https://localhost.invalid', license: 'Unspecified', chosenLicense: 'Unspecified' },
      sheet: { pngSha256: activeAsset.sourceBlobSha256, sourceColorBindings: activeAsset.sourceColorBindings },
    }],
  } : null
  const previewProject: SpriteProject | null = previewPack && activeAsset && draft ? {
    schemaVersion: 1,
    id: `draft-preview-${draft.id}`,
    name: draft.name,
    packId: previewPack.id,
    themePresetId: 'hearth',
    theme: previewTheme,
    character: { id: `draft-character-${draft.id}`, name: activeAsset.name, packId: previewPack.id, selections: { ...previewPack.defaults }, overrides: {} },
    preview: { animation: previewAnimation, direction: previewDirection, speed: 1, zoom: 4, playing: true },
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  } : null
  const normalizedPackFilter = packFilter.trim().toLocaleLowerCase()
  const matchesPackFilter = (values: string[]) => !normalizedPackFilter || values.some(value => value.toLocaleLowerCase().includes(normalizedPackFilter))
  const filteredVersions = versions.filter(version => matchesPackFilter([version.pack.name, version.packId, version.version, version.origin, version.packageSha256]))
  const projectedSources = PACKS.filter(pack => (!pack.origin || pack.origin === 'bundled' || pack.origin === 'embedded-project') && matchesPackFilter([pack.name, pack.id, pack.version, pack.origin ?? 'bundled']))

  const loadVersions = async () => {
    let installed: InstalledPackVersion[]
    let summaryMap: Record<string, InstalledPackSummary> = {}
    if (window.spriteHost) {
      const listed = await window.spriteHost.listInstalledPacks()
      if (!listed.ok) throw new Error(listed.error.message)
      const summaries: Record<string, InstalledPackSummary> = {}
      installed = await Promise.all(listed.value.map(async summary => {
        const parsed = await readSpritePackResponsive(summary.packageBytes)
        const key = `${summary.packId}@${summary.version}#${summary.packageSha256}`
        summaries[key] = { ...summary, packageBytes: parsed.bytes }
        return {
          packId: summary.packId,
          version: summary.version,
          packageSha256: summary.packageSha256,
          packDocumentSha256: summary.packDocumentSha256,
          origin: summary.origin,
          enabled: summary.enabled,
          installedAt: summary.installedAt,
          packageBytes: parsed.bytes,
          pack: parsed.pack,
          provenance: parsed.provenance,
        }
      }))
      setDesktopSummaries(summaries)
      summaryMap = summaries
    } else installed = await repository.listInstalledPacks()
    setVersions(installed)
    if (window.spriteHost) setDependencyCounts(Object.fromEntries(installed.map(version => [identity(version), summaryMap[identity(version)]?.dependencyCount ?? 0])))
    else {
      const projects = await repository.listProjects()
      setDependencyCounts(Object.fromEntries(installed.map(version => [identity(version), projects.filter(project => project.packLocks.some(lock => lock.packId === version.packId && lock.version === version.version && lock.sha256 === version.packDocumentSha256)).length])))
    }
    for (const version of installed) {
      for (const asset of version.pack.assets) {
        if (asset.source.kind !== 'sheet-v1') continue
        const bytes = await repository.readPackBlob(asset.source.pngSha256)
        if (bytes) await registerSheetPng(asset.source.pngSha256, bytes)
      }
      registerRuntimePack(runtimePackFromInstalled(version))
    }
  }

  const loadDrafts = async () => setDrafts(await repository.listPackDrafts())

  const initializeWorkspace = useEffectEvent(async () => {
    await Promise.all([loadVersions(), loadDrafts()])
  })

  useEffect(() => {
    void initializeWorkspace()
  }, [])

  const saveDraft = async (candidate: PackDraftV1, candidateAssets: PackDraftAssetV1[]) => {
    setSaving(true)
    try {
      const saved = await repository.savePackDraft(candidate, candidateAssets, candidate.revision)
      setDraft(saved)
      setDirty(false)
      await loadDrafts()
      onAnnouncement(`Pack draft saved at revision ${saved.revision}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Draft save failed.')
      setDraftFailure({ code: caught instanceof ProductError ? caught.code : 'io-failed', message: caught instanceof Error ? caught.message : 'Draft save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const persistDraft = useEffectEvent(saveDraft)

  useEffect(() => {
    if (!draft || !dirty || saving) return
    const timer = setTimeout(() => void persistDraft(draft, assets), 750)
    return () => clearTimeout(timer)
  }, [assets, dirty, draft, saving])

  const mutateDraft = (patch: Partial<PackDraftV1>) => {
    setDraft(current => current ? { ...current, ...patch } : current)
    setDirty(true)
  }

  const mutateAsset = (patch: Partial<PackDraftAssetV1>) => {
    if (!activeAssetId) return
    setAssets(current => current.map(asset => asset.assetId === activeAssetId ? { ...asset, ...patch } : asset))
    setDirty(true)
  }

  const inspectPack = async (file: File) => {
    setError(null)
    setErrorReport(null)
    setValidationProgress({ stage: 'queued', elapsedMs: 0 })
    try {
      const result = await readSpritePackResponsive(new Uint8Array(await file.arrayBuffer()), setValidationProgress)
      setPending({ fileName: file.name, result })
      onAnnouncement(`${file.name} validated. Review before installation.`)
    } catch (caught) {
      const code = caught && typeof caught === 'object' && 'code' in caught ? ` (${String(caught.code)})` : ''
      setError(`${caught instanceof Error ? caught.message : 'Pack validation failed.'}${code}`)
      const operation = caught && typeof caught === 'object' && 'operation' in caught ? String(caught.operation) : 'pack:read'
      const details = caught && typeof caught === 'object' && 'details' in caught ? JSON.stringify(caught.details, null, 2) : '{}'
      setErrorReport(`Pack validation failed\nFile: ${file.name}\nCode: ${code.replace(/[() ]/g, '') || 'pack-invalid'}\nStage: ${operation}\nMessage: ${caught instanceof Error ? caught.message : 'Pack validation failed.'}\nDetails: ${details}\nRepository mutation: none\n`)
    } finally {
      setValidationProgress(null)
    }
  }

  const choosePackForInspection = async () => {
    if (!window.spriteHost) {
      packInput.current?.click()
      return
    }
    const location = await window.spriteHost.choosePackFile('open')
    if (!location.ok || !location.value) return
    setValidationProgress({ stage: 'queued', elapsedMs: 0 })
    const bridgeStarted = performance.now()
    const bridgeProgress = globalThis.setInterval(() => setValidationProgress({ stage: 'queued', elapsedMs: performance.now() - bridgeStarted }), 400)
    const read = await window.spriteHost.readPack(location.value.grantId)
    globalThis.clearInterval(bridgeProgress)
    if (!read.ok) {
      setValidationProgress(null)
      setError(read.ok ? 'Pack read failed.' : read.error.message)
      return
    }
    try {
      const result = await readSpritePackResponsive(read.value.bytes, setValidationProgress)
      setPending({ fileName: read.value.location.displayPath.split(/[\\/]/).at(-1) ?? 'pack.spritepack', result })
      onAnnouncement('Pack validated by the desktop host. Review before installation.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pack validation failed.')
    } finally {
      setValidationProgress(null)
    }
  }

  const installPending = async () => {
    if (!pending) return
    try {
      let installed: InstalledPackVersion
      if (window.spriteHost) {
        const indexRevision = Math.max(0, ...Object.values(desktopSummaries).map(item => item.indexRevision))
        const result = await window.spriteHost.installPack({ bytes: pending.result.bytes, enabled: true, expectedIndexRevision: indexRevision })
        if (!result.ok) throw new Error(result.error.message)
        const parsed = await readSpritePackResponsive(result.value.packageBytes)
        installed = { packId: result.value.packId, version: result.value.version, packageSha256: result.value.packageSha256, packDocumentSha256: result.value.packDocumentSha256, origin: result.value.origin, enabled: result.value.enabled, installedAt: result.value.installedAt, packageBytes: parsed.bytes, pack: parsed.pack, provenance: parsed.provenance }
      } else installed = await repository.installPack(pending.result.bytes)
      for (const [hash, bytes] of Object.entries(pending.result.pngs)) await registerSheetPng(hash, bytes)
      registerRuntimePack(runtimePackFromInstalled(installed))
      setPending(null)
      await loadVersions()
      onLibraryChange?.()
      onAnnouncement(`${installed.pack.name} ${installed.version} installed with checksum ${installed.packageSha256.slice(0, 12)}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pack installation failed.')
    }
  }

  const downloadErrorReport = () => {
    if (!errorReport) return
    const bytes = new TextEncoder().encode(errorReport)
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'spritepack-validation-report.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const toggleVersion = async (version: InstalledPackVersion) => {
    const targetEnabled = !version.enabled
    setBusyPackIdentity(identity(version))
    setVersions(current => current.map(item => identity(item) === identity(version) ? { ...item, enabled: targetEnabled } : item))
    try {
      let next: InstalledPackVersion
      if (window.spriteHost) {
        const summary = desktopSummaries[identity(version)]
        if (!summary) throw new Error('Desktop pack summary is unavailable.')
        const result = await window.spriteHost.installPack({ bytes: summary.packageBytes, enabled: targetEnabled, expectedIndexRevision: summary.indexRevision })
        if (!result.ok) throw new Error(result.error.message)
        const parsed = await readSpritePackResponsive(result.value.packageBytes)
        next = { packId: result.value.packId, version: result.value.version, packageSha256: result.value.packageSha256, packDocumentSha256: result.value.packDocumentSha256, origin: result.value.origin, enabled: result.value.enabled, installedAt: result.value.installedAt, packageBytes: parsed.bytes, pack: parsed.pack, provenance: parsed.provenance }
      } else next = await repository.setPackEnabled(version, targetEnabled)
      setVersions(current => current.map(item => identity(item) === identity(next) ? next : item))
      for (const asset of next.pack.assets) {
        if (asset.source.kind !== 'sheet-v1') continue
        const bytes = await repository.readPackBlob(asset.source.pngSha256)
        if (bytes) await registerSheetPng(asset.source.pngSha256, bytes)
      }
      registerRuntimePack(runtimePackFromInstalled(next))
      await loadVersions()
      onLibraryChange?.()
      onAnnouncement(`${next.pack.name} is ${next.enabled ? 'enabled' : 'disabled'} for new selections.`)
    } catch (caught) {
      setVersions(current => current.map(item => identity(item) === identity(version) ? version : item))
      setError(caught instanceof Error ? caught.message : 'Pack enablement update failed.')
    } finally {
      setBusyPackIdentity(null)
    }
  }

  const removeVersion = async (version: InstalledPackVersion) => {
    setBusyPackIdentity(identity(version))
    try {
      if (protectedLock && protectedLock.packId === version.packId && protectedLock.version === version.version && protectedLock.sha256 === version.packDocumentSha256) throw new Error('Pack version is used by the active project. Switch or close that project before removal.')
      if (window.spriteHost) {
        const summary = desktopSummaries[identity(version)]
        if (!summary) throw new Error('Desktop pack summary is unavailable.')
        const removed = await window.spriteHost.removePack({ packId: summary.packId, version: summary.version, packageSha256: summary.packageSha256, expectedIndexRevision: summary.indexRevision, dependencySummaryToken: summary.dependencySummaryToken })
        if (!removed.ok) throw new Error(removed.error.message)
      } else await repository.removePack(version)
      unregisterRuntimePack(version.packId, version.version)
      if (detailVersion && identity(detailVersion) === identity(version)) setDetailVersion(null)
      await loadVersions()
      onLibraryChange?.()
      onAnnouncement(`${version.pack.name} ${version.version} removed.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pack removal failed.')
    } finally {
      setBusyPackIdentity(null)
    }
  }

  const prepareRemove = async (version: InstalledPackVersion) => {
    const dependencies: { id: string; name: string }[] = []
    if (protectedLock && protectedLock.packId === version.packId && protectedLock.version === version.version && protectedLock.sha256 === version.packDocumentSha256) dependencies.push({ id: 'active', name: 'Active project' })
    if (window.spriteHost) {
      const count = desktopSummaries[identity(version)]?.dependencyCount ?? 0
      for (let index = 0; index < count; index += 1) dependencies.push({ id: `desktop-${index}`, name: `Recent desktop project ${index + 1}` })
    } else {
      const projects = await repository.listProjects()
      for (const project of projects) if (project.packLocks.some(lock => lock.packId === version.packId && lock.version === version.version && lock.sha256 === version.packDocumentSha256) && !dependencies.some(item => item.id === project.id)) dependencies.push({ id: project.id, name: project.name })
    }
    setRemoveDependencies(dependencies)
    setRemoveCandidate(version)
  }

  const showVersionDetail = async (version: InstalledPackVersion) => {
    setDetailVersion(version)
    if (window.spriteHost) {
      const count = desktopSummaries[identity(version)]?.dependencyCount ?? 0
      setDetailDependencies(count ? [`${count} recent desktop project${count === 1 ? '' : 's'}`] : [])
    } else {
      const projects = await repository.listProjects()
      setDetailDependencies(projects.filter(project => project.packLocks.some(lock => lock.packId === version.packId && lock.version === version.version && lock.sha256 === version.packDocumentSha256)).map(project => project.name))
    }
  }

  const createDraft = async () => {
    const created = await repository.createPackDraft()
    setDraft(created)
    setAssets([])
    setActiveAssetId(null)
    setSourceColors([])
    setAssetAnalyses({})
    setMode('author')
    await loadDrafts()
  }

  const openDraft = async (id: string) => {
    const loaded = await repository.loadPackDraft(id)
    if (!loaded) return
    setDraft(loaded.draft)
    setAssets(loaded.assets)
    setActiveAssetId(loaded.draft.activeAssetId)
    setMode('author')
    const analyses: Record<string, HumanoidSheetAnalysis> = {}
    for (const asset of loaded.assets) {
      const bytes = await repository.readPackBlob(asset.sourceBlobSha256)
      if (bytes) analyses[asset.assetId] = analyzeHumanoidSheetPng(bytes)
    }
    setAssetAnalyses(analyses)
    if (loaded.draft.activeAssetId) setSourceColors(analyses[loaded.draft.activeAssetId]?.opaqueColors ?? [])
  }

  const loadAssetColors = async (asset: PackDraftAssetV1 | null) => {
    if (!asset) {
      setSourceColors([])
      return
    }
    const bytes = await repository.readPackBlob(asset.sourceBlobSha256)
    if (!bytes) return
    await registerSheetPng(asset.sourceBlobSha256, bytes)
    const analysis = analyzeHumanoidSheetPng(bytes)
    setAssetAnalyses(current => ({ ...current, [asset.assetId]: analysis }))
    setSourceColors(analysis.opaqueColors)
  }

  const importSheet = async (file: File) => {
    if (!draft) return
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const analysis = analyzeHumanoidSheetPng(bytes)
      const hash = await repository.storePackDraftSource(bytes)
      if (assets.some(asset => asset.sourceBlobSha256 === hash)) throw new ProductError({ code: 'pack-conflict', message: 'This exact PNG is already present in the draft.', operation: 'draft:import', recoverable: true, details: { sha256: hash } })
      await registerSheetPng(hash, bytes)
      const colors = analysis.opaqueColors
      if (colors.length > 256) throw new Error('Layer sheet contains more than 256 non-transparent RGB colors.')
      const stem = file.name.toLowerCase().replace(/\.png$/i, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'asset'
      let assetId = `${draft.packId}.${stem}`.slice(0, 64)
      let suffix = 2
      while (assets.some(asset => asset.assetId === assetId)) assetId = `${draft.packId}.${stem}.${suffix++}`.slice(0, 64)
      const asset: PackDraftAssetV1 = {
        draftId: draft.id,
        assetId,
        sourceBlobSha256: hash,
        name: file.name.replace(/\.png$/i, ''),
        slot: 'torso',
        description: '',
        sourceColorBindings: {},
        provenance: null,
      }
      setAssets(current => [...current, asset])
      setActiveAssetId(assetId)
      setDraft(current => current ? { ...current, assetIds: [...current.assetIds, assetId], activeAssetId: assetId } : current)
      setSourceColors(colors)
      setAssetAnalyses(current => ({ ...current, [assetId]: analysis }))
      setDirty(true)
      onAnnouncement(`${file.name} added to the draft.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Layer sheet import failed.')
    }
  }

  const setColorBinding = (hex: string, binding: SourceColorBinding) => {
    if (!activeAsset) return
    mutateAsset({ sourceColorBindings: { ...activeAsset.sourceColorBindings, [hex]: binding } })
  }

  const draftBlockers = (): string[] => {
    if (!draft) return ['No draft open.']
    const blockers: string[] = []
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(draft.packId) || draft.packId.length < 3) blockers.push('Enter a canonical pack ID.')
    if (!/^\d+\.\d+\.\d+/.test(draft.version)) blockers.push('Enter a semantic version.')
    if (!assets.length) blockers.push('Add at least one layer sheet.')
    for (const asset of assets) {
      const analysis = assetAnalyses[asset.assetId]
      if (!analysis) blockers.push(`${asset.name}: source inspection is unavailable.`)
      else {
        const colors = analysis.opaqueColors.map(item => item.hex)
        const mappings = Object.keys(asset.sourceColorBindings)
        if (colors.some(color => !mappings.includes(color)) || mappings.some(color => !colors.includes(color as `#${string}`))) blockers.push(`${asset.name}: classify every source color.`)
        if (analysis.emptyCells.length) blockers.push(`${asset.name}: ${analysis.emptyCells.length} required animation cells are empty.`)
      }
      if (!asset.provenance) blockers.push(`${asset.name}: complete source and license.`)
      if (asset.provenance && (!asset.provenance.author.trim() || !asset.provenance.source.trim() || !asset.provenance.sourceUrl.startsWith('https://'))) blockers.push(`${asset.name}: enter author, source title, and an HTTPS source URL.`)
      if (asset.provenance && LICENSE_PROFILES[asset.provenance.chosenLicense].attributionRequired && !asset.provenance.attributionText) blockers.push(`${asset.name}: attribution text is required.`)
    }
    return blockers
  }

  const navigateToBlocker = (blocker: string) => {
    const matchingAsset = assets.find(asset => blocker.startsWith(`${asset.name}:`))
    if (matchingAsset) {
      setActiveAssetId(matchingAsset.assetId)
      mutateDraft({ activeAssetId: matchingAsset.assetId })
      void loadAssetColors(matchingAsset)
      requestAnimationFrame(() => {
        assetSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        assetSection.current?.querySelector<HTMLElement>('input:not([readonly]),select')?.focus()
      })
      return
    }
    identitySection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    identitySection.current?.querySelector<HTMLElement>('input:not([readonly]),textarea')?.focus()
  }

  const buildDraftContents = async () => {
    if (!draft) throw new Error('No draft open.')
    const blockers = draftBlockers()
    if (blockers.length) throw new Error(blockers.join(' '))
    const pngs: Record<string, Uint8Array> = {}
    const provenance: Record<string, PackProvenanceV1> = {}
    for (const asset of assets) {
      const bytes = await repository.readPackBlob(asset.sourceBlobSha256)
      if (!bytes || !asset.provenance) throw new Error(`${asset.name} source or provenance is unavailable.`)
      pngs[asset.sourceBlobSha256] = bytes
      provenance[asset.provenance.id] = asset.provenance
    }
    const defaults: Record<SlotId, string | null> = { body: null, hair: null, headwear: null, torso: null, legs: null, feet: null }
    for (const asset of assets) if (!defaults[asset.slot]) defaults[asset.slot] = asset.assetId
    return {
      pack: {
        packSchemaVersion: 2 as const,
        id: draft.packId,
        version: draft.version,
        name: draft.name,
        description: draft.description,
        subjectProfile: 'humanoid-lpc-64' as const,
        assets: assets.map(asset => ({
          schemaVersion: 2 as const,
          id: asset.assetId,
          name: asset.name,
          slot: asset.slot,
          description: asset.description,
          source: { kind: 'sheet-v1' as const, pngSha256: asset.sourceBlobSha256, sheetPath: `assets/${asset.sourceBlobSha256}.png`, width: 256 as const, height: 512 as const, sourceColorBindings: asset.sourceColorBindings },
          coverage: ['idle', 'walk'] as ['idle', 'walk'],
          provenanceId: asset.provenance!.id,
        })),
        defaults,
      },
      provenance,
      pngs,
    }
  }

  const exportDraft = async (install: boolean) => {
    try {
      const bytes = await writeSpritePack(await buildDraftContents())
      if (install) {
        let installed: InstalledPackVersion
        if (window.spriteHost) {
          const indexRevision = Math.max(0, ...Object.values(desktopSummaries).map(item => item.indexRevision))
          const result = await window.spriteHost.installPack({ bytes, enabled: true, expectedIndexRevision: indexRevision, origin: 'authored-local' })
          if (!result.ok) throw new Error(result.error.message)
          const parsed = await readSpritePackResponsive(result.value.packageBytes)
          installed = { packId: result.value.packId, version: result.value.version, packageSha256: result.value.packageSha256, packDocumentSha256: result.value.packDocumentSha256, origin: result.value.origin, enabled: result.value.enabled, installedAt: result.value.installedAt, packageBytes: parsed.bytes, pack: parsed.pack, provenance: parsed.provenance }
        } else installed = await repository.installPack(bytes, 'authored-local')
        for (const [hash, png] of Object.entries((await readSpritePackResponsive(bytes)).pngs)) await registerSheetPng(hash, png)
        registerRuntimePack(runtimePackFromInstalled(installed))
        await loadVersions()
        onLibraryChange?.()
        onAnnouncement(`${installed.pack.name} installed as an authored test copy.`)
      } else {
        if (window.spriteHost) {
          const location = await window.spriteHost.choosePackFile('save')
          if (!location.ok || !location.value) return
          const parsed = await readSpritePackResponsive(Uint8Array.from(bytes))
          const written = await window.spriteHost.writePack({ destinationGrantId: location.value.grantId, bytes, expectedPackageSha256: parsed.packageSha256 })
          if (!written.ok) throw new Error(written.error.message)
        } else download(bytes, `${draft?.packId ?? 'pack'}-${draft?.version ?? '0.1.0'}.spritepack`)
        downloadBytes(new TextEncoder().encode(`Pack validation passed\nAssets: ${assets.length}\n`), `${draft?.packId ?? 'pack'}.validation.txt`)
        onAnnouncement('Deterministic pack and validation report exported.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pack export failed.')
    }
  }

  const exportRecovery = async () => {
    if (!draft) return
    try {
      const pngs: Record<string, Uint8Array> = {}
      for (const asset of assets) {
        const bytes = await repository.readPackBlob(asset.sourceBlobSha256)
        if (bytes) pngs[asset.sourceBlobSha256] = bytes
      }
      const blockers = draftBlockers()
      const bytes = await writeDraftRecovery({ draft, assets, pngs, validationReport: blockers.length ? blockers.join('\n') : 'No blocking validation issues.' })
      downloadBytes(bytes, `${draft.packId || 'pack'}-draft-recovery.zip`)
      onAnnouncement('Draft recovery exported with original PNG bytes and checksums.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Draft recovery export failed.')
    }
  }

  const reloadCommittedDraft = async () => {
    if (!draft) return
    await openDraft(draft.id)
    setDraftFailure(null)
    setError(null)
  }

  const overwriteDraftRevision = async () => {
    if (!draft) return
    const current = await repository.loadPackDraft(draft.id)
    if (!current) return
    setDraft({ ...draft, revision: current.draft.revision })
    setDraftFailure(null)
    await saveDraft({ ...draft, revision: current.draft.revision }, assets)
  }

  const saveDraftCopy = async () => {
    if (!draft) return
    const created = await repository.createPackDraft(`${draft.name} (copy)`)
    const copiedAssets = assets.map(asset => ({ ...asset, draftId: created.id }))
    const copied = await repository.savePackDraft({ ...created, name: `${draft.name} (copy)`, description: draft.description, version: draft.version, assetIds: copiedAssets.map(asset => asset.assetId), activeAssetId: copiedAssets.some(asset => asset.assetId === activeAssetId) ? activeAssetId : null }, copiedAssets, 0)
    setDraft(copied)
    setAssets(copiedAssets)
    setDraftFailure(null)
    setError(null)
    setDirty(false)
    await loadDrafts()
    onAnnouncement(`${copied.name} saved as a separate draft.`)
  }

  const removeActiveDraftAsset = () => {
    if (!draft || !activeAssetId) return
    const remaining = assets.filter(asset => asset.assetId !== activeAssetId)
    const nextActive = remaining[0]?.assetId ?? null
    setAssets(remaining)
    setActiveAssetId(nextActive)
    setDraft({ ...draft, assetIds: remaining.map(asset => asset.assetId), activeAssetId: nextActive })
    setDraftFailure(null)
    setDirty(true)
  }

  if (mode === 'author' && draft) {
    const blockers = draftBlockers()
    return (
      <section className="view pack-author" aria-labelledby="pack-author-heading">
        <div className="view-heading">
          <div><p className="eyebrow">Packs / Author</p><h1 id="pack-author-heading">{draft.name}</h1></div>
          <div className="action-row"><span className={`save-state ${dirty ? 'dirty' : ''}`}>{saving ? 'Saving…' : dirty ? 'Unsaved' : `Saved revision ${draft.revision}`}</span><button className="button secondary" type="button" onClick={() => setMode('library')}>Back to packs</button></div>
        </div>
        {error && <div className="pack-error" role="alert"><AlertTriangle /><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError(null)}><X /></button></div>}
        {draftFailure && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="draft-failure-title"><div className="dialog-heading"><div><p className="eyebrow">Draft remains unsaved · {draftFailure.code}</p><h2 id="draft-failure-title">Recover draft save</h2></div></div><p>{draftFailure.message} The last committed revision and original PNG bytes remain intact.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setDraftFailure(null)}>Cancel</button><button className="button secondary" onClick={() => { setDraftFailure(null); if (draft) void saveDraft(draft, assets) }}>Retry save</button><button className="button secondary" onClick={() => void reloadCommittedDraft()}>Reload committed revision</button>{draftFailure.code === 'draft-conflict' && <button className="button secondary" onClick={() => void overwriteDraftRevision()}>Overwrite current revision</button>}<button className="button secondary" onClick={() => void saveDraftCopy()}>Save copy</button>{activeAssetId && <button className="button secondary" onClick={removeActiveDraftAsset}>Remove active asset</button>}<button className="button primary" onClick={() => void exportRecovery()}>Download recovery</button></div></div></div>}
        <div className="pack-author-layout">
          <aside className="pack-author-rail" aria-label="Pack authoring sections">
            <button className="active" type="button">1 <span>Identity</span></button>
            <button type="button">2 <span>Assets</span><strong>{assets.length}</strong></button>
            <button type="button">3 <span>Validate & export</span><strong>{blockers.length}</strong></button>
          </aside>
          <div className="pack-author-main">
            <section ref={identitySection} className="pack-form-section" aria-labelledby="pack-identity-heading">
              <h2 id="pack-identity-heading">Pack identity</h2>
              <div className="pack-form-grid">
                <label className="field"><span>Name</span><input value={draft.name} onChange={event => mutateDraft({ name: event.target.value })} /></label>
                <label className="field"><span>Canonical pack ID</span><input value={draft.packId} onChange={event => mutateDraft({ packId: event.target.value.toLowerCase() })} /></label>
                <label className="field"><span>Version</span><input value={draft.version} onChange={event => mutateDraft({ version: event.target.value })} /></label>
                <label className="field"><span>Subject profile</span><input value="Humanoid LPC 64" readOnly /></label>
                <label className="field pack-form-wide"><span>Description</span><textarea value={draft.description} onChange={event => mutateDraft({ description: event.target.value })} /></label>
              </div>
            </section>
            <section className="pack-form-section" aria-labelledby="pack-assets-heading">
              <div className="panel-heading"><div><p className="eyebrow">Runtime content</p><h2 id="pack-assets-heading">Layer sheets</h2></div><button className="button secondary" type="button" onClick={() => sheetInput.current?.click()}><Plus /> Add layer sheet</button></div>
              <input ref={sheetInput} className="sr-only" type="file" accept="image/png,.png" onChange={event => { const file = event.target.files?.[0]; if (file) void importSheet(file); event.target.value = '' }} />
              <div className="pack-asset-list">{assets.map(asset => <button key={asset.assetId} type="button" className={asset.assetId === activeAssetId ? 'active' : ''} onClick={() => { setActiveAssetId(asset.assetId); mutateDraft({ activeAssetId: asset.assetId }); void loadAssetColors(asset) }}><Box /><span><strong>{asset.name}</strong><small>{asset.slot} · {Object.keys(asset.sourceColorBindings).length} mappings</small></span>{asset.provenance ? <CheckCircle2 /> : <AlertTriangle />}</button>)}</div>
            </section>
            {activeAsset && <section ref={assetSection} className="pack-form-section" aria-labelledby="pack-asset-config-heading">
              <h2 id="pack-asset-config-heading">Asset configuration</h2>
              <div className="pack-form-grid">
                <label className="field"><span>Asset name</span><input value={activeAsset.name} onChange={event => mutateAsset({ name: event.target.value })} /></label>
                <label className="field"><span>Asset ID</span><input value={activeAsset.assetId} readOnly /></label>
                <label className="field"><span>Slot</span><select value={activeAsset.slot} onChange={event => mutateAsset({ slot: event.target.value as SlotId })}>{['body', 'hair', 'headwear', 'torso', 'legs', 'feet'].map(slot => <option key={slot}>{slot}</option>)}</select></label>
                <label className="field"><span>Coverage</span><input value="Idle + walk · four directions" readOnly /></label>
                <label className="field pack-form-wide"><span>Description</span><input value={activeAsset.description} onChange={event => mutateAsset({ description: event.target.value })} /></label>
              </div>
              <h3>Source color bindings</h3>
              <div className="color-binding-table" role="table" aria-label="Source color bindings">
                {sourceColors.map(color => {
                  const sourceColor = color.hex as HexRgb
                  const binding = activeAsset.sourceColorBindings[sourceColor]
                  return <div key={sourceColor} role="row"><span className="color-swatch" style={{ background: sourceColor }} /><code>{sourceColor}</code><small>{color.count} px</small><select aria-label={`Binding for ${sourceColor}`} value={binding?.kind ?? ''} onChange={event => setColorBinding(sourceColor, event.target.value === 'fixed' ? { kind: 'fixed' } : { kind: 'token', token: event.target.value as TokenId, shade: 0 })}><option value="">Choose…</option><option value="fixed">Fixed color</option>{TOKEN_IDS.map(token => <option key={token} value={token}>{token}</option>)}</select></div>
                })}
              </div>
              <h3>Source and license</h3>
              <div className="pack-form-grid">
                <label className="field"><span>Author</span><input value={activeAsset.provenance?.author ?? ''} onChange={event => mutateAsset({ provenance: { ...(activeAsset.provenance ?? defaultProvenance(activeAsset.assetId)), author: event.target.value } })} /></label>
                <label className="field"><span>Source title</span><input value={activeAsset.provenance?.source ?? ''} onChange={event => mutateAsset({ provenance: { ...(activeAsset.provenance ?? defaultProvenance(activeAsset.assetId)), source: event.target.value } })} /></label>
                <label className="field pack-form-wide"><span>HTTPS source URL</span><input value={activeAsset.provenance?.sourceUrl ?? ''} onChange={event => mutateAsset({ provenance: { ...(activeAsset.provenance ?? defaultProvenance(activeAsset.assetId)), sourceUrl: event.target.value } })} /></label>
                <label className="field"><span>Chosen license</span><select value={activeAsset.provenance?.chosenLicense ?? 'CC0-1.0'} onChange={event => { const license = event.target.value as SupportedLicense; mutateAsset({ provenance: { ...(activeAsset.provenance ?? defaultProvenance(activeAsset.assetId)), offeredLicenses: [license], chosenLicense: license, attributionText: LICENSE_PROFILES[license].attributionRequired ? activeAsset.provenance?.attributionText ?? '' : null } }) }}>{SUPPORTED_LICENSES.map(license => <option key={license}>{license}</option>)}</select></label>
                <label className="field"><span>Attribution text</span><input value={activeAsset.provenance?.attributionText ?? ''} onChange={event => mutateAsset({ provenance: { ...(activeAsset.provenance ?? defaultProvenance(activeAsset.assetId)), attributionText: event.target.value || null } })} /></label>
              </div>
              <p className="legal-note"><ShieldCheck /> The Sprite Project records the metadata you provide. It does not provide legal advice or verify ownership.</p>
              {previewPack && previewProject && <div className="pack-runtime-preview" aria-label="Draft runtime preview">
                <div className="panel-heading"><div><p className="eyebrow">Shared runtime</p><h3>Animation preview</h3></div><span>idle + walk · four directions</span></div>
                <div className="pack-runtime-preview__layout">
                  <SpriteCanvas project={previewProject} pack={previewPack} />
                  <div className="pack-runtime-preview__controls">
                    <label className="field"><span>Animation</span><select value={previewAnimation} onChange={event => setPreviewAnimation(event.target.value as AnimationId)}><option value="idle">idle</option><option value="walk">walk</option></select></label>
                    <label className="field"><span>Direction</span><select value={previewDirection} onChange={event => setPreviewDirection(event.target.value as Direction)}>{['south', 'west', 'east', 'north'].map(direction => <option key={direction}>{direction}</option>)}</select></label>
                    <div className="pack-preview-tokens">{TOKEN_IDS.map(token => <label key={token}><span>{token}</span><input type="color" aria-label={`Preview ${token} color`} value={previewTheme[token]} onChange={event => setPreviewTheme(current => ({ ...current, [token]: event.target.value }))} /></label>)}</div>
                    <dl className="summary-list"><dt>Coverage</dt><dd>{assetAnalyses[activeAsset.assetId]?.emptyCells.length ? `${assetAnalyses[activeAsset.assetId].emptyCells.length} empty cells` : 'Complete required cells'}</dd><dt>Credit</dt><dd>{activeAsset.provenance ? `${activeAsset.provenance.author} · ${activeAsset.provenance.chosenLicense}` : 'Complete source and license metadata'}</dd></dl>
                  </div>
                </div>
              </div>}
            </section>}
            <section className="pack-form-section" aria-labelledby="pack-validation-heading">
              <h2 id="pack-validation-heading">Validate & export</h2>
              {blockers.length ? <ul className="validation-list">{blockers.map(blocker => <li key={blocker}><button type="button" onClick={() => navigateToBlocker(blocker)}><AlertTriangle /><span>{blocker}</span></button></li>)}</ul> : <div className="pack-success"><CheckCircle2 /><strong>Pack is ready to export.</strong></div>}
              <div className="action-row"><button className="button primary" disabled={blockers.length > 0} onClick={() => void exportDraft(false)}><Download /> Export .spritepack</button><button className="button secondary" disabled={blockers.length > 0} onClick={() => void exportDraft(true)}><Package /> Install test copy</button><button className="button quiet" onClick={() => void exportRecovery()}><FileArchive /> Download recovery</button><button className="button quiet" onClick={() => void saveDraft(draft, assets)}><Save /> Save now</button></div>
            </section>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="view pack-library" aria-labelledby="packs-heading">
      <div className="view-heading"><div><p className="eyebrow">Local content ecosystem</p><h1 id="packs-heading">Packs</h1></div><div className="action-row"><button className="button secondary" onClick={() => void choosePackForInspection()}><Upload /> Add pack</button><button className="button primary" onClick={() => void createDraft()}><Plus /> Create pack</button></div></div>
      <input ref={packInput} className="sr-only" type="file" accept=".spritepack,application/zip" onChange={event => { const file = event.target.files?.[0]; if (file) void inspectPack(file); event.target.value = '' }} />
      {validationProgress && <div className="status-strip" role="status" aria-live="polite"><Package /><div><strong>Validating local pack</strong><span>{validationProgress.stage} · {(validationProgress.elapsedMs / 1000).toFixed(1)} s</span></div></div>}
      {error && <div className="pack-error" role="alert"><AlertTriangle /><span>{error}</span>{errorReport && <><button className="button quiet" onClick={() => void choosePackForInspection()}>Choose another file</button><button className="button quiet" onClick={downloadErrorReport}>Download report</button></>}<button className="icon-button" aria-label="Dismiss error" onClick={() => { setError(null); setErrorReport(null) }}><X /></button></div>}
      <div className="pack-metrics"><div><strong>{versions.length + projectedSources.length}</strong><span>available versions</span></div><div><strong>{versions.filter(item => item.enabled).length}</strong><span>local enabled</span></div><div><strong>{drafts.length}</strong><span>authoring drafts</span></div><div><strong>{versions.reduce((sum, item) => sum + item.packageBytes.length, 0) / 1024 < 1 ? '<1' : Math.round(versions.reduce((sum, item) => sum + item.packageBytes.length, 0) / 1024)}</strong><span>KiB local content</span></div></div>
      <label className="field pack-filter"><span>Filter packs</span><input type="search" value={packFilter} onChange={event => setPackFilter(event.target.value)} placeholder="Name, ID, version, checksum, or origin" /></label>
      <section className="storage-section" aria-labelledby="installed-packs-heading"><div className="panel-heading"><div><p className="eyebrow">Offline local library</p><h2 id="installed-packs-heading">Installed versions</h2></div><span>{filteredVersions.length} of {versions.length} local</span></div>{filteredVersions.length ? <div className="pack-version-list">{filteredVersions.map(version => <div key={identity(version)}><Package /><button className="pack-version-summary" type="button" onClick={() => void showVersionDetail(version)}><strong>{version.pack.name} · {version.version}</strong><span>{version.packId} · {version.packageSha256.slice(0, 12)}…</span><small>{version.pack.assets.length} assets · {version.origin} · {version.packageBytes.length} bytes · {dependencyCounts[identity(version)] ?? 0} dependent projects</small></button><label className="pack-enable"><input type="checkbox" checked={version.enabled} disabled={busyPackIdentity === identity(version)} onChange={() => void toggleVersion(version)} /> Enabled</label><button className="icon-button" disabled={busyPackIdentity === identity(version)} aria-label={`Remove ${version.pack.name} ${version.version}`} onClick={() => void prepareRemove(version)}><Trash2 /></button></div>)}</div> : <p className="empty-state">{versions.length ? 'No installed versions match this filter.' : 'No local packs installed. Bundled Wayfarer and Harbor remain available.'}</p>}</section>
      <section className="storage-section" aria-labelledby="pack-sources-heading"><div className="panel-heading"><div><p className="eyebrow">Read-only sources</p><h2 id="pack-sources-heading">Bundled and project-scoped</h2></div><span>{projectedSources.length} visible</span></div>{projectedSources.length ? <div className="pack-version-list">{projectedSources.map(pack => <div key={`${pack.origin ?? 'bundled'}:${pack.id}:${pack.version}:${pack.packageSha256 ?? ''}`}><Package /><div><strong>{pack.name} · {pack.version}</strong><span>{pack.id}</span><small>{pack.assets.length} assets · {pack.origin ?? 'bundled'} · {pack.origin === 'embedded-project' ? 'available only to the active project' : 'ships with the application'}</small></div><span className="readiness-pill ready"><CheckCircle2 /> Ready offline</span></div>)}</div> : <p className="empty-state">No bundled or project-scoped sources match this filter.</p>}</section>
      {detailVersion && <section className="storage-section pack-detail" aria-labelledby="pack-detail-heading"><div className="panel-heading"><div><p className="eyebrow">Exact installed version</p><h2 id="pack-detail-heading">{detailVersion.pack.name} {detailVersion.version}</h2></div><span className="readiness-pill ready"><CheckCircle2 /> Ready offline</span><button className="icon-button" aria-label="Close pack detail" onClick={() => setDetailVersion(null)}><X /></button></div><dl className="summary-list"><dt>Pack ID</dt><dd>{detailVersion.packId}</dd><dt>Package checksum</dt><dd>{detailVersion.packageSha256}</dd><dt>Pack document</dt><dd>{detailVersion.packDocumentSha256}</dd><dt>Local completeness</dt><dd>Package, provenance, and {detailVersion.pack.assets.filter(asset => asset.source.kind === 'sheet-v1').length} referenced PNG checksums validated</dd><dt>Profile</dt><dd>Humanoid LPC 64 · idle + walk · four directions</dd><dt>Dependencies</dt><dd>{detailDependencies.length ? detailDependencies.join(', ') : 'No local project dependencies'}</dd></dl><div className="pack-detail-assets">{detailVersion.pack.assets.map(asset => { const source = detailVersion.provenance[asset.provenanceId]; return <article key={asset.id}><div><strong>{asset.name}</strong><span>{asset.slot} · {Object.keys(asset.source.kind === 'sheet-v1' ? asset.source.sourceColorBindings : {}).length} source mappings</span></div><small>{source.author} · {source.chosenLicense} · {source.source}</small></article> })}</div></section>}
      <section className="storage-section" aria-labelledby="pack-drafts-heading"><div className="panel-heading"><div><p className="eyebrow">Authored locally</p><h2 id="pack-drafts-heading">Drafts</h2></div><span>{drafts.length} drafts</span></div>{drafts.length ? <div className="pack-version-list">{drafts.map(item => <button key={item.id} type="button" onClick={() => void openDraft(item.id)}><FileArchive /><div><strong>{item.name}</strong><span>{item.packId} · {item.version}</span><small>Revision {item.revision} · {item.assetIds.length} assets</small></div></button>)}</div> : <p className="empty-state">Create a pack to turn compatible 256×512 PNG layer sheets into reusable local content.</p>}</section>
      {pending && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pack-install-title"><div className="dialog-heading"><div><p className="eyebrow">Validated local package</p><h2 id="pack-install-title">Install {pending.result.pack.name}?</h2></div></div><dl className="summary-list"><dt>File</dt><dd>{pending.fileName}</dd><dt>Identity</dt><dd>{pending.result.pack.id} · {pending.result.pack.version}</dd><dt>Checksum</dt><dd>{pending.result.packageSha256}</dd><dt>Profile</dt><dd>Humanoid LPC 64</dd><dt>Coverage</dt><dd>Complete idle + walk · south, west, east, north</dd><dt>Assets</dt><dd>{pending.result.pack.assets.length}</dd><dt>Token bindings</dt><dd>{pending.result.pack.assets.reduce((sum, asset) => sum + (asset.source.kind === 'sheet-v1' ? Object.values(asset.source.sourceColorBindings).filter(binding => binding.kind === 'token').length : 0), 0)} semantic mappings</dd><dt>Licenses</dt><dd>{[...new Set(Object.values(pending.result.provenance).map(item => item.chosenLicense))].join(', ')}</dd><dt>Expanded</dt><dd>{pending.result.manifest.entries.reduce((sum, entry) => sum + entry.size, 0)} bytes</dd><dt>Duplicate state</dt><dd>{versions.some(item => item.packId === pending.result.pack.id && item.version === pending.result.pack.version && item.packageSha256 === pending.result.packageSha256) ? 'Exact package already installed; install is idempotent' : versions.some(item => item.packId === pending.result.pack.id && item.version === pending.result.pack.version) ? 'Conflicting bytes; install will be rejected' : 'New exact version'}</dd></dl><p className="legal-note">This is validated local data, not trusted executable content.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setPending(null)}>Cancel</button><button className="button primary" onClick={() => void installPending()}>Install pack</button></div></div></div>}
      {removeCandidate && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pack-remove-title"><div className="dialog-heading"><div><p className="eyebrow">{removeDependencies.length ? 'Removal blocked' : 'Confirm local removal'}</p><h2 id="pack-remove-title">{removeDependencies.length ? `${removeCandidate.pack.name} is in use` : `Remove ${removeCandidate.pack.name} ${removeCandidate.version}?`}</h2></div></div><dl className="summary-list"><dt>Identity</dt><dd>{removeCandidate.packId} · {removeCandidate.version}</dd><dt>Checksum</dt><dd>{removeCandidate.packageSha256}</dd><dt>Package bytes</dt><dd>{removeCandidate.packageBytes.length}</dd><dt>Dependencies</dt><dd>{removeDependencies.length ? removeDependencies.map(item => item.name).join(', ') : 'None'}</dd></dl>{removeDependencies.length ? <p className="legal-note"><AlertTriangle /> Exact locked projects must retain this version. No bytes have been removed.</p> : <p className="legal-note">Only this exact installed version is removed. Shared content remains while referenced elsewhere.</p>}<div className="dialog-actions"><button className="button secondary" onClick={() => setRemoveCandidate(null)}>Cancel</button>{removeDependencies.some(item => item.id !== 'active' && !item.id.startsWith('desktop-')) && <button className="button secondary" onClick={() => { const target = removeDependencies.find(item => item.id !== 'active' && !item.id.startsWith('desktop-')); if (target) onOpenProject?.(target.id); setRemoveCandidate(null) }}>Open dependent project</button>}{removeDependencies.length > 0 && <button className="button secondary" onClick={() => { onOpenStorage?.(); setRemoveCandidate(null) }}>Export project backup</button>}{removeDependencies.length === 0 && <button className="button primary destructive" onClick={() => { const candidate = removeCandidate; setRemoveCandidate(null); void removeVersion(candidate) }}>Remove exact version</button>}</div></div></div>}
    </section>
  )
}

function defaultProvenance(assetId: string): PackProvenanceV1 {
  return {
    schemaVersion: 1,
    id: `${assetId}.source`.slice(0, 64),
    author: '',
    source: '',
    sourceUrl: 'https://',
    offeredLicenses: ['CC0-1.0'],
    chosenLicense: 'CC0-1.0',
    attributionText: null,
    authorRightsConfirmed: true,
  }
}
