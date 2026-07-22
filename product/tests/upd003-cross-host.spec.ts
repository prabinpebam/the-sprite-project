import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'

function payloadHex(bytes: Uint8Array) {
  const entries = unzipSync(bytes)
  return Object.fromEntries(Object.entries(entries).filter(([name]) => name !== 'archive-manifest.json').map(([name, content]) => [name, Buffer.from(content).toString('hex')]))
}

test('TF-TERRAIN-CROSS-HOST preserves archive v3, terrain pixels, map, character, and credits web to Electron to web', async ({ page }) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-terrain-cross-host-'))
  const electronArchive = path.join(temporaryRoot, 'electron-terrain.spriteproject')
  let desktop: Awaited<ReturnType<typeof electron.launch>> | undefined
  let desktopPage: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>> | undefined
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'New project' }).first().click()
    await page.getByRole('textbox', { name: 'Project name' }).fill('Cross Host Terrain')
    await page.getByRole('button', { name: 'Create project' }).click()
    const characterHash = await page.locator('.sprite-canvas').getAttribute('data-render-hash')
    await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
    await page.getByRole('button', { name: 'Create terrain' }).click()
    await page.getByRole('radio', { name: /Stone/ }).check()
    await page.getByRole('radio', { name: 'Erase' }).check()
    await page.getByRole('gridcell').first().click()
    const terrainHash = await page.locator('canvas[aria-label="Generated autotile atlas"]').getAttribute('data-render-hash')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
    await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    const webDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download project backup' }).click()
    const webArchivePath = await (await webDownload).path()
    if (!webArchivePath) throw new Error('Web terrain archive path unavailable.')
    const webArchive = new Uint8Array(await readFile(webArchivePath))
    const webEntries = unzipSync(webArchive)
    expect(JSON.parse(new TextDecoder().decode(webEntries['archive-manifest.json']))).toMatchObject({ archiveFormatVersion: 3, terrainSchemaVersion: 1 })

    desktop = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe'), env: { ...process.env, SPRITE_PROJECT_USER_DATA: path.join(temporaryRoot, 'electron-user-data') } })
    desktopPage = await desktop.firstWindow()
    await desktopPage.waitForLoadState('domcontentloaded')
    await desktop.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, webArchivePath)
    await desktopPage.getByRole('button', { name: 'Open .spriteproject' }).click()
    await expect(desktopPage.getByRole('heading', { name: 'Cross Host Terrain', exact: true })).toBeVisible()
    await expect(desktopPage.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)
    await desktopPage.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
    await expect(desktopPage.locator('canvas[aria-label="Generated autotile atlas"]')).toHaveAttribute('data-render-hash', terrainHash!)
    await expect(desktopPage.getByRole('gridcell').first()).toHaveAttribute('aria-pressed', 'false')
    await expect(desktopPage.getByRole('radio', { name: /Stone/ })).toBeChecked()

    await desktop.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, electronArchive)
    await desktopPage.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    await desktopPage.getByRole('button', { name: 'Export .spriteproject' }).click()
    await expect.poll(async () => readFile(electronArchive).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
    const electronBytes = new Uint8Array(await readFile(electronArchive))
    expect(payloadHex(electronBytes)).toEqual(payloadHex(webArchive))

    await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await desktop.close()
    desktop = undefined
    desktopPage = undefined

    await page.getByRole('button', { name: 'Clear all local data' }).click()
    await page.getByRole('dialog', { name: 'Clear browser workspace?' }).getByRole('button', { name: 'Clear all local data' }).click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Import project backup' }).click()
    await (await chooser).setFiles(electronArchive)
    await page.getByRole('dialog', { name: 'Import Cross Host Terrain?' }).getByRole('button', { name: 'Import project' }).click()
    await expect(page.getByRole('heading', { name: 'Cross Host Terrain', exact: true })).toBeVisible()
    await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)
    await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
    await expect(page.locator('canvas[aria-label="Generated autotile atlas"]')).toHaveAttribute('data-render-hash', terrainHash!)
    await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Open terrain export' }).click()
    await expect(page.getByLabel('Terrain credits')).toContainText('Stone Procedural Terrain')
  } finally {
    if (desktopPage && !desktopPage.isClosed()) await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    if (desktop) await desktop.close()
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
