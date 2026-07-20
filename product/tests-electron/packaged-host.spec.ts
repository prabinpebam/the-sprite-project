import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { largeSpritePackFixtureBytes, spritePackFixtureBytes, spritePackFixturePng } from '../src/domain/spritepack-test-fixture'
import { readSpritePack } from '../src/domain/spritepack'

let application: ElectronApplication | undefined
let page: Page | undefined
let temporaryRoot: string | undefined

test.beforeEach(async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-project-electron-'))
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
      bodyText: document.body.innerText,
      viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }))
    await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify(capture, null, 2)), contentType: 'application/json' })
    if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
    await page.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await application.close()
  }
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EBUSY')) throw error
  })
})

async function createDesktopProject(name: string) {
  if (!page) throw new Error('Packaged Electron window did not open.')
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

test('TF-DESKTOP-PORTABLE-LAUNCH exposes a secure visible host and creates a project', async () => {
  if (!page) throw new Error('Packaged Electron window did not open.')
  const bridge = await page.evaluate(async () => ({
    keys: Object.keys(window.spriteHost ?? {}).sort(),
    frozen: Object.isFrozen(window.spriteHost),
    host: await window.spriteHost?.getHostInfo(),
    processType: typeof (window as unknown as { process?: unknown }).process,
    requireType: typeof (window as unknown as { require?: unknown }).require,
  }))
  expect(bridge.keys).toEqual([
    'chooseExportDirectory', 'choosePackFile', 'chooseProjectFile', 'chooseProjectFolder', 'forgetRecentProject',
    'getHostInfo', 'inspectArchive', 'installPack', 'listInstalledPacks', 'listRecentProjects', 'openRecentProject',
    'readPack', 'readProject', 'removePack', 'saveProject', 'writeArchive', 'writeExport', 'writePack',
  ])
  expect(bridge.frozen).toBe(true)
  expect(bridge.processType).toBe('undefined')
  expect(bridge.requireType).toBe('undefined')
  expect(bridge.host).toMatchObject({ ok: true, value: { host: 'electron', portable: true, platform: 'win32', architecture: 'x64' } })

  const titlebar = page.getByLabel('Application title bar')
  await expect(titlebar).toContainText('The Sprite Project')
  await expect(titlebar).toContainText('Desktop workspace')
  await expect(titlebar).toContainText('Portable · 0.1.0')
  const titlebarGeometry = await titlebar.evaluate(element => {
    const titlebarBounds = element.getBoundingClientRect()
    const identityBounds = element.firstElementChild?.getBoundingClientRect()
    return {
      top: titlebarBounds.top,
      height: titlebarBounds.height,
      identityRight: identityBounds?.right ?? 0,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
  expect(titlebarGeometry).toMatchObject({ top: 0, height: 44 })
  expect(titlebarGeometry.identityRight).toBeLessThan(titlebarGeometry.viewportWidth - 138)
  await expect(page.getByRole('button', { name: 'Open project folder' })).toBeVisible()
  expect(await page.getByRole('button', { name: 'New project' }).first().evaluate(element => getComputedStyle(element).borderRadius)).toBe('8px')
  await createDesktopProject('Desktop Field Test')
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-hash', /^[a-f0-9]{8}$/)
})

test('TF-DESKTOP-PROJECT-FOLDER saves, detects external changes, and writes outputs', async () => {
  if (!page || !application || !temporaryRoot) throw new Error('Packaged Electron test did not initialize.')
  const projectFolder = path.join(temporaryRoot, 'Desktop Hero Project')
  await application.evaluate(({ dialog }, destination) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination })
  }, projectFolder)
  await createDesktopProject('Desktop Hero')
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  expect((await readdir(projectFolder)).sort()).toEqual(expect.arrayContaining(['README.txt', 'archive-manifest.json', 'packs.lock.json', 'project.json', 'provenance', 'recipes']))
  const projectPath = path.join(projectFolder, 'project.json')
  const originalProject = await readFile(projectPath)
  const external = JSON.parse(originalProject.toString())
  external.name = 'External edit'
  await writeFile(projectPath, `${JSON.stringify(external)}\n`)

  await page.getByRole('button', { name: 'Rename project' }).click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Window edit')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByRole('dialog', { name: 'Project files changed outside this window' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await readFile(projectPath)).toString()).toContain('External edit')
  await page.getByRole('button', { name: 'Save project' }).click()
  await page.getByRole('dialog', { name: 'Project files changed outside this window' }).getByRole('button', { name: 'Overwrite from this window' }).click()
  await expect.poll(async () => (await readFile(projectPath, 'utf8')).includes('Window edit')).toBe(true)
  expect(await readdir(path.join(temporaryRoot, '.sprite-recovery', 'Desktop Hero Project'))).not.toHaveLength(0)

  const relocatedFolder = path.join(temporaryRoot, 'Relocated Project')
  await application.evaluate(({ dialog }, destination) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination })
  }, relocatedFolder)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await page.getByRole('button', { name: 'Save As' }).click()
  await expect.poll(async () => readFile(path.join(relocatedFolder, 'project.json')).then(() => true, () => false)).toBe(true)

  const exportFolder = path.join(temporaryRoot, 'generic-export')
  await mkdir(exportFolder)
  await application.evaluate(({ dialog }, destination) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination] })
  }, exportFolder)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Download generic package' }).click()
  await expect(page.locator('.export-status')).toContainText('files written')
  expect((await readdir(exportFolder)).sort()).toEqual(['CREDITS.txt', 'animations.json', 'build-manifest.json', 'credits.json', 'spritesheet.png'].sort())

  const godotFolder = path.join(temporaryRoot, 'godot-export')
  await mkdir(godotFolder)
  await application.evaluate(({ dialog }, destination) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination] })
  }, godotFolder)
  await page.getByRole('button', { name: 'Download Godot package' }).click()
  await expect(page.locator('.export-status')).toContainText('7 files written')
  expect(await readdir(godotFolder)).toEqual(expect.arrayContaining(['character_sprite_frames.tres', 'README-GODOT.md', 'spritesheet.png']))

  const notDirectory = path.join(temporaryRoot, 'not-a-directory')
  await writeFile(notDirectory, 'file')
  await application.evaluate(({ dialog }, destination) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination] })
  }, notDirectory)
  await page.getByRole('button', { name: 'Download generic package' }).click()
  await expect(page.locator('.export-status')).toContainText('io-failed')

  const archivePath = path.join(temporaryRoot, 'desktop-hero.spriteproject')
  await application.evaluate(({ dialog }, destination) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination })
  }, archivePath)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await page.getByRole('button', { name: 'Export .spriteproject' }).click()
  await expect.poll(async () => readFile(archivePath).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
})

test('TF-DESKTOP-UNSAVED-CLOSE requires Save, Discard, or Cancel', async () => {
  if (!page || !application) throw new Error('Packaged Electron test did not initialize.')
  await createDesktopProject('Unsaved Desktop Hero')
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  const dialog = page.getByRole('dialog', { name: 'Save changes before closing?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Unsaved Desktop Hero', exact: true })).toBeVisible()

  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Discard' }).click()
  await expect.poll(() => application?.windows().length ?? 0).toBe(0)
  application = undefined
  page = undefined
})

test('TF-DESKTOP-UNSAVED-CLOSE saves successfully before closing', async () => {
  if (!page || !application || !temporaryRoot) throw new Error('Packaged Electron test did not initialize.')
  const destination = path.join(temporaryRoot, 'Close Save Project')
  await application.evaluate(({ dialog }, projectPath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: projectPath })
  }, destination)
  await createDesktopProject('Close Save Hero')
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await page.getByRole('dialog', { name: 'Save changes before closing?' }).getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => application?.windows().length ?? 0).toBe(0)
  expect(JSON.parse(await readFile(path.join(destination, 'project.json'), 'utf8')).name).toBe('Close Save Hero')
  application = undefined
  page = undefined
})

test('TF-DESKTOP-PACK-LIFECYCLE validates, installs, disables, and removes through main', async () => {
  if (!page || !application || !temporaryRoot) throw new Error('Packaged Electron test did not initialize.')
  const packPath = path.join(temporaryRoot, 'field-kit.spritepack')
  await writeFile(packPath, await spritePackFixtureBytes())
  await application.evaluate(({ dialog }, source) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] })
  }, packPath)

  await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
  await page.getByRole('button', { name: 'Add pack' }).click()
  const review = page.getByRole('dialog', { name: 'Install Field Kit?' })
  await expect(review).toContainText('io.example.field-kit')
  await review.getByRole('button', { name: 'Install pack' }).click()
  const installed = page.locator('.pack-version-list > div').filter({ hasText: 'Field Kit · 1.0.0' })
  await expect(installed).toContainText('installed-local')
  await installed.locator('.pack-version-summary').click()
  await expect(page.locator('.pack-detail')).toContainText('Test Artist · CC0-1.0')
  await installed.getByRole('checkbox', { name: 'Enabled' }).uncheck()
  await expect(installed.getByRole('checkbox', { name: 'Enabled' })).not.toBeChecked()
  await installed.getByRole('button', { name: 'Remove Field Kit 1.0.0' }).click()
  await page.getByRole('dialog', { name: 'Remove Field Kit 1.0.0?' }).getByRole('button', { name: 'Remove exact version' }).click()
  await expect(page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')).toContainText('No local packs installed')
})

test('TF-DESKTOP-PACK-AUTHOR writes and self-installs through the secure bridge', async () => {
  if (!page || !application || !temporaryRoot) throw new Error('Packaged Electron test did not initialize.')
  const output = path.join(temporaryRoot, 'authored.spritepack')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
  await page.getByRole('button', { name: 'Create pack' }).click()
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add layer sheet' }).click()
  await (await chooserEvent).setFiles({ name: 'authored.png', mimeType: 'image/png', buffer: Buffer.from(spritePackFixturePng()) })
  await page.getByRole('combobox', { name: 'Binding for #123456' }).selectOption('fixed')
  await page.getByRole('textbox', { name: 'Author' }).fill('Desktop Author')
  await page.getByRole('textbox', { name: 'Source title' }).fill('Original desktop art')
  await page.getByRole('textbox', { name: 'HTTPS source URL' }).fill('https://example.com/desktop-art')
  await expect(page.getByLabel('Draft runtime preview')).toBeVisible()
  await expect(page.getByText('Pack is ready to export.')).toBeVisible()
  await application.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, output)
  await page.getByRole('button', { name: 'Export .spritepack' }).click()
  await expect.poll(async () => readFile(output).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
  expect((await readSpritePack(new Uint8Array(await readFile(output)))).pack.name).toBe('Untitled pack')
  await page.getByRole('button', { name: 'Install test copy' }).click()
  await page.getByRole('button', { name: 'Back to packs' }).click()
  await expect(page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')).toContainText('authored-local')
})

test('QS-DESKTOP-PACK-MAX-PERFORMANCE validates a near-maximum pack without blocking window', async ({ page: _fixturePage }, testInfo) => {
  test.setTimeout(30_000)
  if (!page || !application || !temporaryRoot) throw new Error('Packaged Electron test did not initialize.')
  const packageBytes = await largeSpritePackFixtureBytes()
  const packPath = path.join(temporaryRoot, 'large-benchmark.spritepack')
  await writeFile(packPath, packageBytes)
  await application.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, packPath)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
  await page.evaluate(() => {
    const state = { startedAt: 0, completedAt: 0, statuses: [] as { at: number; text: string }[], longTasks: [] as number[] }
    ;(window as unknown as { __packPerformance: typeof state }).__packPerformance = state
    document.addEventListener('click', event => {
      const button = (event.target as Element | null)?.closest('button')
      if (button?.textContent?.includes('Add pack')) state.startedAt = performance.now()
    }, true)
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver(list => state.longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
    }
    new MutationObserver(() => {
      const text = [...document.querySelectorAll('[role="status"]')].map(element => element.textContent?.replace(/\s+/g, ' ').trim() ?? '').find(value => value.includes('Validating local pack'))
      if (text && state.statuses.at(-1)?.text !== text) state.statuses.push({ at: performance.now(), text })
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  await page.getByRole('button', { name: 'Add pack' }).click()
  await expect(page.getByRole('dialog', { name: 'Install Large Benchmark Pack?' })).toBeVisible({ timeout: 10_000 })
  const observed = await page.evaluate(() => {
    const state = (window as unknown as { __packPerformance: { startedAt: number; completedAt: number; statuses: { at: number; text: string }[]; longTasks: number[] } }).__packPerformance
    state.completedAt = performance.now()
    const points = [state.startedAt, ...state.statuses.map(status => status.at), state.completedAt]
    const gaps = points.slice(1).map((point, index) => point - points[index])
    return { firstStatusMs: (state.statuses[0]?.at ?? state.completedAt) - state.startedAt, maxStatusGapMs: Math.max(...gaps), totalMs: state.completedAt - state.startedAt, maxLongTaskMs: Math.max(0, ...state.longTasks), statusUpdates: state.statuses }
  })
  const report = { host: 'electron', compressedBytes: packageBytes.length, thresholds: { firstStatusMs: 100, maxStatusGapMs: 500, totalMs: 10_000, maxLongTaskMs: 100 }, observed }
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify(report, null, 2)), contentType: 'application/json' })
  expect(observed.firstStatusMs).toBeLessThanOrEqual(100)
  expect(observed.maxStatusGapMs).toBeLessThanOrEqual(500)
  expect(observed.totalMs).toBeLessThanOrEqual(10_000)
  expect(observed.maxLongTaskMs).toBeLessThanOrEqual(100)
})