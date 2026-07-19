import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

let application: ElectronApplication | undefined
let page: Page | undefined
let temporaryRoot: string | undefined

test.beforeEach(async () => {
  application = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe') })
  page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-project-electron-'))
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
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true })
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
    'chooseExportDirectory', 'chooseProjectFile', 'chooseProjectFolder', 'forgetRecentProject',
    'getHostInfo', 'inspectArchive', 'listRecentProjects', 'openRecentProject', 'readProject',
    'saveProject', 'writeArchive', 'writeExport',
  ])
  expect(bridge.frozen).toBe(true)
  expect(bridge.processType).toBe('undefined')
  expect(bridge.requireType).toBe('undefined')
  expect(bridge.host).toMatchObject({ ok: true, value: { host: 'electron', portable: true, platform: 'win32', architecture: 'x64' } })

  await expect(page.getByText('Portable desktop workspace', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open project folder' })).toBeVisible()
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