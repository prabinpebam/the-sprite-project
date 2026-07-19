import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'

async function payloads(filePath: string) {
  const entries = unzipSync(new Uint8Array(await readFile(filePath)))
  return Object.fromEntries(Object.entries(entries)
    .filter(([name]) => name !== 'archive-manifest.json')
    .map(([name, bytes]) => [name, Buffer.from(bytes).toString('hex')]))
}

test('TF-CROSS-HOST-WEB-TO-DESKTOP and DESKTOP-TO-WEB preserve payloads and render', async ({ page }) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-project-cross-host-'))
  const electronArchive = path.join(temporaryRoot, 'electron-resaved.spriteproject')
  let desktop: Awaited<ReturnType<typeof electron.launch>> | undefined
  let desktopPage: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>> | undefined
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'New project' }).first().click()
    await page.getByRole('textbox', { name: 'Project name' }).fill('Cross Host Hero')
    await page.getByRole('button', { name: 'Create project' }).click()
    const webHash = await page.locator('canvas').getAttribute('data-render-hash')
    await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download project backup' }).click()
    const webArchive = await (await downloadEvent).path()
    if (!webArchive) throw new Error('Web archive path is unavailable.')

    desktop = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe') })
    desktopPage = await desktop.firstWindow()
    await desktopPage.waitForLoadState('domcontentloaded')
    await desktop.evaluate(({ dialog }, sourcePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] })
    }, webArchive)
    await desktopPage.getByRole('button', { name: 'Open .spriteproject' }).click()
    await expect(desktopPage.getByRole('heading', { name: 'Cross Host Hero', exact: true })).toBeVisible()
    await expect(desktopPage.locator('canvas')).toHaveAttribute('data-render-hash', webHash!)

    await desktop.evaluate(({ dialog }, destination) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination })
    }, electronArchive)
    await desktopPage.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
    await desktopPage.getByRole('button', { name: 'Export .spriteproject' }).click()
    await expect.poll(async () => readFile(electronArchive).then(bytes => bytes.length, () => 0)).toBeGreaterThan(500)
    expect(await payloads(electronArchive)).toEqual(await payloads(webArchive))

    await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await desktop.close()
    desktop = undefined
    desktopPage = undefined

    await page.getByRole('button', { name: 'Clear all local data' }).click()
    await page.getByRole('dialog', { name: 'Clear browser workspace?' }).getByRole('button', { name: 'Clear all local data' }).click()
    const chooserEvent = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Import project backup' }).click()
    await (await chooserEvent).setFiles(electronArchive)
    await page.getByRole('dialog', { name: 'Import Cross Host Hero?' }).getByRole('button', { name: 'Import project' }).click()
    await expect(page.getByRole('heading', { name: 'Cross Host Hero', exact: true })).toBeVisible()
    await expect(page.locator('canvas')).toHaveAttribute('data-render-hash', webHash!)
  } finally {
    if (desktopPage && !desktopPage.isClosed()) await desktopPage.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    if (desktop) await desktop.close()
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
