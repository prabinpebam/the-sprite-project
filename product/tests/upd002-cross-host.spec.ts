import { _electron as electron, expect, test, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'
import { spritePackFixtureBytes } from '../src/domain/spritepack-test-fixture'

async function paintedPixels(page: Page): Promise<number> {
  return page.locator('canvas').evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('2d')
    if (!context) return 0
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] > 0) count += 1
    return count
  })
}

function embeddedPackage(archiveBytes: Uint8Array): Uint8Array {
  const entries = unzipSync(archiveBytes)
  const manifest = JSON.parse(new TextDecoder().decode(entries['archive-manifest.json']))
  expect(manifest.archiveFormatVersion).toBe(2)
  expect(manifest.embeddedPacks).toHaveLength(1)
  return entries[manifest.embeddedPacks[0].path]
}

test('TF-PACK-CROSS-HOST preserves and renders embedded exact packages web to Electron to web', async ({ page }) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-pack-cross-host-'))
  const packageBytes = await spritePackFixtureBytes()
  const electronArchive = path.join(temporaryRoot, 'electron-resaved.spriteproject')
  let desktop: Awaited<ReturnType<typeof electron.launch>> | undefined
  let desktopPage: Page | undefined
  try {
    await page.goto('/')
    await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
    const packChooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add pack' }).click()
    await (await packChooser).setFiles({ name: 'field-kit.spritepack', mimeType: 'application/zip', buffer: Buffer.from(packageBytes) })
    await page.getByRole('dialog', { name: 'Install Field Kit?' }).getByRole('button', { name: 'Install pack' }).click()
    await page.getByRole('button', { name: 'New project' }).first().click()
    await page.getByRole('textbox', { name: 'Project name' }).fill('Portable Pack Hero')
    await page.getByRole('button', { name: 'Create project' }).click()
    await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
    await page.getByRole('combobox', { name: 'Content pack' }).selectOption({ label: 'Field Kit · 1.0.0' })
    await page.getByRole('dialog', { name: 'Activate Field Kit 1.0.0?' }).getByRole('button', { name: 'Create checkpoint and activate' }).click()
    await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
    await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
    await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    const webDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download project backup' }).click()
    const webArchivePath = await (await webDownload).path()
    if (!webArchivePath) throw new Error('Web archive path unavailable.')
    const webArchiveBytes = new Uint8Array(await readFile(webArchivePath))
    expect(embeddedPackage(webArchiveBytes)).toEqual(packageBytes)

    desktop = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe'), env: { ...process.env, SPRITE_PROJECT_USER_DATA: path.join(temporaryRoot, 'electron-user-data') } })
    desktopPage = await desktop.firstWindow()
    await desktopPage.waitForLoadState('domcontentloaded')
    await desktop.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, webArchivePath)
    await desktopPage.getByRole('button', { name: 'Open .spriteproject' }).click()
    await expect(desktopPage.getByRole('heading', { name: 'Portable Pack Hero', exact: true })).toBeVisible()
    await expect.poll(() => paintedPixels(desktopPage!)).toBeGreaterThan(1_000)
    await desktop.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, electronArchive)
    await desktopPage.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    await desktopPage.getByRole('button', { name: 'Export .spriteproject' }).click()
    await expect.poll(async () => readFile(electronArchive).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
    expect(embeddedPackage(new Uint8Array(await readFile(electronArchive)))).toEqual(packageBytes)

    await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await desktop.close()
    desktop = undefined
    desktopPage = undefined

    await page.getByRole('button', { name: 'Clear all local data' }).click()
    await page.getByRole('dialog', { name: 'Clear browser workspace?' }).getByRole('button', { name: 'Clear all local data' }).click()
    const importChooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Import project backup' }).click()
    await (await importChooser).setFiles(electronArchive)
    await page.getByRole('dialog', { name: 'Import Portable Pack Hero?' }).getByRole('button', { name: 'Import project' }).click()
    await expect(page.getByRole('heading', { name: 'Portable Pack Hero', exact: true })).toBeVisible()
    await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
  } finally {
    if (desktopPage && !desktopPage.isClosed()) await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    if (desktop) await desktop.close()
    await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined)
  }
})
