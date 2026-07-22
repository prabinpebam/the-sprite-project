import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { migrateProjectV1ToV2 } from './migration'
import { packLockFor } from './pack-locks'
import { createProject } from './project'
import { createTerrainDocument } from './terrain'
import { buildTerrainPackage } from './terrain-export'

const godotExecutable = resolve('.tools/godot/runtime/Godot_v4.7.1-stable_win64_console.exe')

describe('Godot 4.7.1 terrain consumer', () => {
  it.skipIf(!existsSync(godotExecutable))('loads all 16 generated terrain masks with exact side peering', async () => {
    const legacy = createProject('Godot Terrain', '2026-07-21T00:00:00.000Z')
    const graph = migrateProjectV1ToV2(legacy, await packLockFor(legacy.packId))
    graph.terrain = createTerrainDocument(graph.project.theme, 'stone', graph.project.createdAt, 'terrain-1')
    const files = unzipSync((await buildTerrainPackage(graph, 'godot')).bytes)
    const root = mkdtempSync(join(tmpdir(), 'sprite-terrain-godot-'))
    try {
      writeFileSync(join(root, 'project.godot'), readFileSync(resolve('tests/godot-terrain-fixture/project.godot')))
      writeFileSync(join(root, 'validate_export.gd'), readFileSync(resolve('tests/godot-terrain-fixture/validate_export.gd')))
      for (const name of ['terrain-atlas.png', 'terrain_tileset.tres']) writeFileSync(join(root, name), files[name])
      const imported = spawnSync(godotExecutable, ['--headless', '--editor', '--path', root, '--quit'], { encoding: 'utf8' })
      expect(imported.status, `${imported.stdout}\n${imported.stderr}`).toBe(0)
      const validated = spawnSync(godotExecutable, ['--headless', '--path', root, '--script', 'validate_export.gd'], { encoding: 'utf8' })
      expect(validated.status, `${validated.stdout}\n${validated.stderr}`).toBe(0)
      expect(validated.stdout).toContain('GODOT_TERRAIN_VALIDATION_PASS sources=1 tiles=16 masks=0,1,3,5,10,15')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})