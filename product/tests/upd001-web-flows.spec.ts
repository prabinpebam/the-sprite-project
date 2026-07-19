import { expect, test, type Page } from '@playwright/test'
import { createProject } from '../src/domain/project'

const anomalies = new Map<Page, { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; crossOriginRequests: string[] }>()

async function createWebProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

async function openView(page: Page, name: 'Project' | 'Compose' | 'Theme' | 'Preview' | 'Storage' | 'Export') {
  await page.locator('.workflow-nav').getByRole('button', { name, exact: true }).click()
  await expect(page.locator('.workflow-nav').getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page')
}

test.beforeEach(async ({ page }) => {
  const record = { consoleErrors: [] as string[], pageErrors: [] as string[], failedRequests: [] as string[], crossOriginRequests: [] as string[] }
  anomalies.set(page, record)
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()) })
  page.on('pageerror', error => record.pageErrors.push(error.message))
  page.on('requestfailed', request => record.failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.protocol !== 'data:' && url.origin !== 'http://127.0.0.1:4174') record.crossOriginRequests.push(`${request.method()} ${request.url()}`)
  })
})

test.afterEach(async ({ page }, testInfo) => {
  const record = anomalies.get(page)!
  const capture = await page.evaluate(anomalies => ({
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText,
    viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canvasHashes: [...document.querySelectorAll('canvas')].map(canvas => canvas.getAttribute('data-render-hash')),
    ...anomalies,
  }), record)
  await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify(capture, null, 2)), contentType: 'application/json' })
  if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
  expect(record.consoleErrors).toEqual([])
  expect(record.pageErrors).toEqual([])
  expect(record.failedRequests).toEqual([])
  expect(record.crossOriginRequests).toEqual([])
  expect(capture.overflow).toBe(false)
})

test('TF-WEB-PROJECT-LIBRARY and TF-WEB-AUTOSAVE-REOPEN persist multiple projects', async ({ page }) => {
  await page.goto('/')
  await createWebProject(page, 'Alpha Project')
  await openView(page, 'Compose')
  await page.getByRole('tab', { name: /body/i }).click()
  await page.getByRole('radio', { name: /Lean build/ }).check()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
  const hash = await page.locator('canvas').getAttribute('data-render-hash')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Alpha Project', exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-hash', hash!)

  await createWebProject(page, 'Beta Project')
  await openView(page, 'Storage')
  await expect(page.getByRole('heading', { name: 'Projects' }).locator('../..')).toContainText('2 local')
  const alpha = page.locator('.project-list > div').filter({ hasText: 'Alpha Project' })
  await alpha.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Alpha Project', exact: true })).toBeVisible()
})

test('TF-WEB-BACKUP-RESTORE clears storage and restores a verified archive', async ({ page }) => {
  await page.goto('/')
  await createWebProject(page, 'Backup Hero')
  await openView(page, 'Storage')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download project backup' }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('backup-hero.spriteproject')
  const archivePath = await download.path()
  if (!archivePath) throw new Error('Archive download path is unavailable.')

  await page.getByRole('button', { name: 'Clear all local data' }).click()
  await page.getByRole('dialog', { name: 'Clear browser workspace?' }).getByRole('button', { name: 'Clear all local data' }).click()
  await expect(page.getByRole('heading', { name: 'No project open' })).toBeVisible()

  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import project backup' }).click()
  const chooser = await chooserEvent
  await chooser.setFiles(archivePath)
  await page.getByRole('dialog', { name: 'Import Backup Hero?' }).getByRole('button', { name: 'Import project' }).click()
  await expect(page.getByRole('heading', { name: 'Backup Hero', exact: true })).toBeVisible()
  await openView(page, 'Storage')
  await expect(page.getByText('1 local')).toBeVisible()
})

test('TF-WEB-SNAPSHOT-RESTORE restores a selected recovery point', async ({ page }) => {
  await page.goto('/')
  await createWebProject(page, 'Snapshot Hero')
  await page.getByRole('button', { name: 'Rename project' }).click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('First Edit')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Rename project' }).click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Second Edit')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await openView(page, 'Storage')
  await expect(page.locator('.snapshot-list > div')).toHaveCount(2)
  await page.locator('.snapshot-list > div').filter({ hasText: 'Revision 0' }).getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('dialog', { name: 'Restore revision 0?' }).getByRole('button', { name: 'Restore recovery point' }).click()
  await openView(page, 'Project')
  await expect(page.getByRole('heading', { name: 'Snapshot Hero', exact: true })).toBeVisible()
})

test('TF-WEB-SAVE-CONFLICT writes nothing stale and can save a copy', async ({ page, context }) => {
  await page.goto('/')
  await createWebProject(page, 'Shared Revision')
  const second = await context.newPage()
  const secondErrors: string[] = []
  second.on('console', message => { if (message.type() === 'error') secondErrors.push(message.text()) })
  await second.goto('/')
  await expect(second.getByRole('heading', { name: 'Shared Revision', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Rename project' }).click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('First Tab')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  await second.getByRole('button', { name: 'Rename project' }).click()
  await second.getByRole('textbox', { name: 'Project name' }).fill('Stale Tab')
  await second.getByRole('button', { name: 'Save name' }).click()
  await second.getByRole('button', { name: 'Save project' }).click()
  const conflict = second.getByRole('dialog', { name: 'Newer project revision found' })
  await expect(conflict).toBeVisible()
  await conflict.getByRole('button', { name: 'Save as copy' }).click()
  await expect(second.getByRole('heading', { name: 'Stale Tab (conflict copy)', exact: true })).toBeVisible()
  expect(secondErrors).toEqual([])
  await second.close()
})

test('TF-WEB-LEGACY-MIGRATION migrates once and preserves semantic output', async ({ page }) => {
  const legacy = createProject('Legacy Hero', '2026-07-19T00:00:00.000Z')
  legacy.id = 'legacy-project-id'
  legacy.character.id = 'legacy-character-id'
  await page.addInitScript(({ value }) => localStorage.setItem('the-sprite-project:mvp:project:v1', value), { value: JSON.stringify(legacy) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Legacy Hero', exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-hash', /^[a-f0-9]{8}$/)
  expect(await page.evaluate(() => localStorage.getItem('the-sprite-project:mvp:project:v1'))).toBeNull()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Legacy Hero', exact: true })).toBeVisible()
})

test('TF-WEB-OFFLINE reloads the installed shell and local project without network', async ({ page, context }) => {
  await page.goto('/')
  await createWebProject(page, 'Offline Hero')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Offline Hero', exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Offline Hero', exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-hash', /^[a-f0-9]{8}$/)
  await openView(page, 'Storage')
  await expect(page.getByText('Ready offline: every exact pack lock is bundled.')).toBeVisible()
  await openView(page, 'Export')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download generic package' }).click()
  expect((await downloadEvent).suggestedFilename()).toBe('offline-hero-generic.zip')
  await context.setOffline(false)
})

test('TF-WEB-LEGACY-MIGRATION exposes Retry, recovery download, and continue on failure', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('the-sprite-project:mvp:project:v1', '{invalid legacy bytes'))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Project recovery required' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry migration' })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recovery data' }).click()
  const recovery = await downloadEvent
  expect(recovery.suggestedFilename()).toBe('sprite-project-legacy-recovery.json')
  const recoveryPath = await recovery.path()
  if (!recoveryPath) throw new Error('Recovery download path unavailable.')
  expect((await import('node:fs/promises')).readFile(recoveryPath, 'utf8')).resolves.toBe('{invalid legacy bytes')
  await page.getByRole('button', { name: 'Continue without opening project' }).click()
  await expect(page.getByRole('heading', { name: 'No project open' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('the-sprite-project:mvp:project:v1'))).toBe('{invalid legacy bytes')
})

test('TF-WEB-PROJECT-LIBRARY requires the exact name before deleting a project', async ({ page }) => {
  await page.goto('/')
  await createWebProject(page, 'Delete Me')
  await openView(page, 'Storage')
  await page.getByRole('button', { name: 'Delete Delete Me' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete Delete Me?' })
  const confirm = dialog.getByRole('button', { name: 'Delete project' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Project name' }).fill('wrong')
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Project name' }).fill('Delete Me')
  await confirm.click()
  await expect(page.getByRole('heading', { name: 'No project open' })).toBeVisible()
})

test('TF-WEB-STORAGE-PRESSURE previews safe cleanup and keeps backup available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'estimate', { configurable: true, value: async () => ({ usage: 95, quota: 100 }) })
    Object.defineProperty(navigator.storage, 'persisted', { configurable: true, value: async () => false })
  })
  await page.goto('/')
  await createWebProject(page, 'Quota Hero')
  await openView(page, 'Storage')
  await expect(page.getByRole('status').filter({ hasText: 'Critical:' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download project backup' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear disposable data' }).click()
  const dialog = page.getByRole('dialog', { name: 'Clear disposable data?' })
  await expect(dialog).toContainText('Current projects, referenced packs, user imports, migration recovery')
  await dialog.getByRole('button', { name: 'Clear disposable data' }).click()
  await expect(page.locator('.project-list')).toContainText('Quota Hero')
})

test('TF-WEB-BACKUP-RESTORE inspects and resolves an existing-ID import conflict', async ({ page }) => {
  await page.goto('/')
  await createWebProject(page, 'Conflict Import')
  await openView(page, 'Storage')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download project backup' }).click()
  const archivePath = await (await downloadEvent).path()
  if (!archivePath) throw new Error('Archive path unavailable.')
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import project backup' }).click()
  await (await chooserEvent).setFiles(archivePath)
  const summary = page.getByRole('dialog', { name: 'Import Conflict Import?' })
  await expect(summary).toContainText('verified')
  await summary.getByRole('button', { name: 'Import project' }).click()
  const conflict = page.getByRole('dialog', { name: 'Project already exists' })
  await conflict.getByRole('button', { name: 'Import as new project' }).click()
  await expect(page.getByRole('heading', { name: 'Conflict Import (imported copy)', exact: true })).toBeVisible()
  await openView(page, 'Storage')
  await expect(page.getByText('2 local')).toBeVisible()
})

test('QS-006 keeps recovery controls keyboard-operable at constrained 200%-equivalent reflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 640, height: 450 })
  await page.goto('/')
  await createWebProject(page, 'Accessible Hero')
  await openView(page, 'Storage')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const deleteButton = page.getByRole('button', { name: 'Delete Accessible Hero' })
  await deleteButton.focus()
  await page.keyboard.press('Enter')
  const nameInput = page.getByRole('dialog', { name: 'Delete Accessible Hero?' }).getByRole('textbox', { name: 'Project name' })
  await expect(nameInput).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(deleteButton).toBeFocused()
  const motion = await page.locator('.app-shell').evaluate(element => getComputedStyle(element).animationDuration)
  expect(motion === '0s' || Number.parseFloat(motion) <= 0.01).toBe(true)
})
