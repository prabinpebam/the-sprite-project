import { describe, expect, it } from 'vitest'
import { PACKS, packById, selectedAssets } from './packs'
import { createProject, creditsFor, exportBlockers, isExportReady, switchPack } from './project'
import { buildAnimationManifest } from './render'


describe('pack-driven core', () => {
  it('creates a complete, export-ready starter project', () => {
    const project = createProject('Field Test', '2026-07-19T00:00:00.000Z')

    expect(project.name).toBe('Field Test')
    expect(project.packId).toBe('wayfarer')
    expect(exportBlockers(project)).toEqual([])
    expect(isExportReady(project)).toBe(true)
    expect(selectedAssets(packById(project.packId), project.character.selections)).toHaveLength(5)
  })

  it('reports exact required slots and recovers by restoring pack defaults', () => {
    const project = createProject('Recovery')
    project.character.selections.body = null

    expect(exportBlockers(project)).toEqual(['Select a body layer.'])
    expect(isExportReady(project)).toBe(false)

    const restored = switchPack(project, project.packId)
    expect(exportBlockers(restored)).toEqual([])
  })

  it('loads a structurally independent second pack through the same contract', () => {
    const project = switchPack(createProject('Harbor Run'), 'harbor')
    const assets = selectedAssets(packById(project.packId), project.character.selections)

    expect(PACKS).toHaveLength(2)
    expect(project.packId).toBe('harbor')
    expect(assets.length).toBeGreaterThanOrEqual(5)
    expect(assets.every(item => item.id.startsWith('harbor.'))).toBe(true)
    expect(exportBlockers(project)).toEqual([])
  })

  it('aggregates exact selected provenance without unselected assets', () => {
    const project = createProject('Credits')
    const records = creditsFor(project)

    expect(records).toHaveLength(1)
    expect(records[0].chosenLicense).toBe('CC0-1.0')
    expect(records[0].assetIds).toHaveLength(5)
    expect(records[0].assetIds).not.toContain('wayfarer.hair.braid')
  })

  it('describes idle and walk for every direction with stable frame regions', () => {
    const manifest = buildAnimationManifest()

    expect(Object.keys(manifest.animations)).toHaveLength(8)
    expect(manifest.animations.idle_south).toHaveLength(1)
    expect(manifest.animations.walk_north).toHaveLength(4)
    expect(manifest.animations.walk_north[3]).toMatchObject({ x: 192, y: 448, width: 64, height: 64 })
  })
})
