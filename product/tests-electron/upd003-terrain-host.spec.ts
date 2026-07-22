import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'

let application: ElectronApplication | undefined
let page: Page | undefined
let temporaryRoot: string | undefined

test.beforeEach(async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-project-terrain-electron-'))
  application = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe'), env: { ...process.env, SPRITE_PROJECT_USER_DATA: path.join(temporaryRoot, 'user-data') } })
  page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterEach(async ({ browserName: _browserName }, testInfo) => {
  if (page && application && !page.isClosed()) {
    const capture = await page.evaluate(() => ({
      title: document.title,
      bridgeKeys: Object.keys(window.spriteHost ?? {}).sort(),
      bridgeFrozen: Object.isFrozen(window.spriteHost),
      nodeProcessType: typeof (window as unknown as { process?: unknown }).process,
      nodeRequireType: typeof (window as unknown as { require?: unknown }).require,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      terrainHash: document.querySelector('canvas[aria-label="Generated autotile atlas"]')?.getAttribute('data-render-hash'),
      bodyText: document.body.innerText,
    }))
    await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify(capture, null, 2)), contentType: 'application/json' })
    if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
    expect(capture.bridgeKeys).toHaveLength(18)
    expect(capture.bridgeFrozen).toBe(true)
    expect(capture.nodeProcessType).toBe('undefined')
    expect(capture.nodeRequireType).toBe('undefined')
    expect(capture.overflow).toBe(false)
    await page.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await application.close()
  }
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined)
})

async function createTerrainProject(name: string) {
  if (!page) throw new Error('Electron page unavailable.')
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
  await page.getByRole('button', { name: 'Create terrain' }).click()
  await expect(page.getByRole('heading', { name: 'Project terrain' })).toBeVisible()
}

test('TF-TERRAIN-DESKTOP saves, fingerprints, exports, and archives terrain through the frozen bridge', async ({ page: _fixturePage }, testInfo) => {
  if (!page || !application || !temporaryRoot) throw new Error('Electron terrain test did not initialize.')
  const projectFolder = path.join(temporaryRoot, 'Terrain Desktop Project')
  await application.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, projectFolder)
  await createTerrainProject('Terrain Desktop')
  const characterHash = await page.locator('.sprite-canvas').getAttribute('data-render-hash')
  const terrainHash = await page.locator('canvas[aria-label="Generated autotile atlas"]').getAttribute('data-render-hash')
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  expect(await readdir(projectFolder)).toEqual(expect.arrayContaining(['archive-manifest.json', 'project.json', 'terrain.json']))
  const manifest = JSON.parse(await readFile(path.join(projectFolder, 'archive-manifest.json'), 'utf8'))
  expect(manifest).toMatchObject({ archiveFormatVersion: 3, terrainSchemaVersion: 1 })
  expect(manifest.entries.filter((entry: { path: string }) => entry.path === 'terrain.json')).toHaveLength(1)
  const terrainPath = path.join(projectFolder, 'terrain.json')
  const externalTerrain = JSON.parse(await readFile(terrainPath, 'utf8'))
  externalTerrain.name = 'External terrain edit'
  await writeFile(terrainPath, `${JSON.stringify(externalTerrain)}\n`)

  await page.getByRole('radio', { name: 'Erase' }).check()
  await page.getByRole('gridcell').first().click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByRole('dialog', { name: 'Project files changed outside this window' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await readFile(terrainPath, 'utf8')).toContain('External terrain edit')
  await page.getByRole('button', { name: 'Save project' }).click()
  await page.getByRole('dialog', { name: 'Project files changed outside this window' }).getByRole('button', { name: 'Overwrite from this window' }).click()
  await expect.poll(async () => (await readFile(terrainPath, 'utf8')).includes('Project terrain')).toBe(true)

  await page.getByRole('button', { name: 'Open terrain export' }).click()
  const genericFolder = path.join(temporaryRoot, 'terrain-generic')
  await mkdir(genericFolder)
  await application.evaluate(({ dialog }, destination) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination] }) }, genericFolder)
  await page.getByRole('button', { name: 'Download terrain package' }).click()
  await expect(page.locator('.export-status')).toContainText('5 terrain files written')
  expect((await readdir(genericFolder)).sort()).toEqual(['CREDITS.txt', 'build-manifest.json', 'credits.json', 'terrain-atlas.png', 'terrain-manifest.json'])

  const godotFolder = path.join(temporaryRoot, 'terrain-godot')
  await mkdir(godotFolder)
  await application.evaluate(({ dialog }, destination) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination] }) }, godotFolder)
  await page.getByRole('button', { name: 'Download Godot terrain package' }).click()
  await expect(page.locator('.export-status')).toContainText('7 terrain files written')
  expect(await readdir(godotFolder)).toEqual(expect.arrayContaining(['terrain-atlas.png', 'terrain_tileset.tres', 'README-GODOT-TERRAIN.md']))

  const archivePath = path.join(temporaryRoot, 'terrain-desktop.spriteproject')
  await application.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, archivePath)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await page.getByRole('button', { name: 'Export .spriteproject' }).click()
  await expect.poll(async () => readFile(archivePath).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
  const archiveEntries = unzipSync(new Uint8Array(await readFile(archivePath)))
  expect(Object.keys(archiveEntries)).toContain('terrain.json')
  expect(JSON.parse(new TextDecoder().decode(archiveEntries['archive-manifest.json'])).archiveFormatVersion).toBe(3)
  await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
  await expect(page.locator('canvas[aria-label="Generated autotile atlas"]')).toHaveAttribute('data-render-hash', terrainHash!)
  const performanceResult = await page.evaluate(async () => {
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const percentile = (values: number[], ratio: number) => [...values].sort((left, right) => left - right)[Math.ceil(values.length * ratio) - 1]
    const longTasks: number[] = []
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
    const paint = document.querySelector<HTMLInputElement>('input[aria-label="Paint"]')!
    const erase = document.querySelector<HTMLInputElement>('input[aria-label="Erase"]')!
    const cell = document.querySelector<HTMLButtonElement>('[data-terrain-cell="0"]')!
    const paintDurations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      ;(index % 2 ? paint : erase).click()
      cell.click()
      await frame()
      paintDurations.push(performance.now() - startedAt)
    }
    const input = document.querySelector<HTMLInputElement>('#terrain-color-surface')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const atlasDurations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      setter.call(input, `#${(0x300000 + index * 257).toString(16).padStart(6, '0').slice(-6)}`)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await frame()
      atlasDurations.push(performance.now() - startedAt)
    }
    return { paintP95Ms: percentile(paintDurations, 0.95), atlasP95Ms: percentile(atlasDurations, 0.95), maxLongTaskMs: Math.max(0, ...longTasks), samples: 100 }
  })
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify({ host: 'electron', thresholds: { p95Ms: 50, maxLongTaskMs: 100 }, observed: performanceResult }, null, 2)), contentType: 'application/json' })
  expect(performanceResult.paintP95Ms).toBeLessThanOrEqual(50)
  expect(performanceResult.atlasP95Ms).toBeLessThanOrEqual(50)
  expect(performanceResult.maxLongTaskMs).toBeLessThanOrEqual(100)
})
