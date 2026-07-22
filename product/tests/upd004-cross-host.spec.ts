import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'

function payloadHex(bytes: Uint8Array) {
  const entries = unzipSync(bytes)
  return Object.fromEntries(Object.entries(entries).filter(([name]) => name !== 'archive-manifest.json').map(([name, content]) => [name, Buffer.from(content).toString('hex')]))
}

function characterRow(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

test('TF-CHARACTER-CROSS-HOST preserves three characters, active identity, exports, and terrain web to Electron to web', async ({ page }) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-cast-cross-host-'))
  const electronArchive = path.join(temporaryRoot, 'electron-cast.spriteproject')
  let desktop: Awaited<ReturnType<typeof electron.launch>> | undefined
  let desktopPage: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>> | undefined
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'New project' }).first().click()
    await page.getByRole('textbox', { name: 'Project name' }).fill('Cross Host Cast')
    await page.getByRole('button', { name: 'Create project' }).click()
    for (const name of ['Scout', 'Mage']) {
      await page.getByRole('button', { name: 'Create character' }).click()
      await page.getByRole('textbox', { name: 'Character name' }).fill(name)
      await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
    }
    await expect(characterRow(page, 'Mage')).toHaveAttribute('aria-current', 'true')
    await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
    await page.getByRole('button', { name: 'Create terrain' }).click()
    const terrainHash = await page.locator('canvas[aria-label="Generated autotile atlas"]').getAttribute('data-render-hash')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
    await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    const webDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download project backup' }).click()
    const webArchivePath = await (await webDownload).path()
    if (!webArchivePath) throw new Error('Web cast archive path unavailable.')
    const webArchive = new Uint8Array(await readFile(webArchivePath))
    const webEntries = unzipSync(webArchive)
    expect(Object.keys(webEntries).filter(name => name.startsWith('recipes/'))).toHaveLength(3)

    desktop = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe'), env: { ...process.env, SPRITE_PROJECT_USER_DATA: path.join(temporaryRoot, 'electron-user-data') } })
    desktopPage = await desktop.firstWindow()
    await desktopPage.waitForLoadState('domcontentloaded')
    await desktop.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, webArchivePath)
    await desktopPage.getByRole('button', { name: 'Open .spriteproject' }).click()
    await expect(desktopPage.getByRole('heading', { name: 'Characters' })).toBeVisible()
    await expect(desktopPage.getByRole('listitem')).toHaveCount(3)
    await expect(characterRow(desktopPage, 'Mage')).toHaveAttribute('aria-current', 'true')
    await desktopPage.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
    await expect(desktopPage.locator('canvas[aria-label="Generated autotile atlas"]')).toHaveAttribute('data-render-hash', terrainHash!)

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
    await page.getByRole('dialog', { name: 'Import Cross Host Cast?' }).getByRole('button', { name: 'Import project' }).click()
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(3)
    await expect(characterRow(page, 'Mage')).toHaveAttribute('aria-current', 'true')
    await page.locator('.workflow-nav').getByRole('button', { name: 'Export', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Export Mage' })).toBeVisible()
    await page.locator('.workflow-nav').getByRole('button', { name: 'Project', exact: true }).click()
    await characterRow(page, 'Hero').getByRole('button', { name: 'Open character' }).click()
    await page.locator('.workflow-nav').getByRole('button', { name: 'Export', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Export Hero' })).toBeVisible()
  } finally {
    if (desktopPage && !desktopPage.isClosed()) await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    if (desktop) await desktop.close()
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})