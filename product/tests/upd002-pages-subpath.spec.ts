import { expect, test } from '@playwright/test'
import { completeSpritePackFixtureBytes } from '../src/domain/spritepack-test-fixture'

test('QS-PAGES-SUBPATH installs, restarts offline, and exports at repository scope', async ({ page, context }, testInfo) => {
  const failedRequests: string[] = []
  const outOfScopeRequests: string[] = []
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.origin === 'http://127.0.0.1:4176' && !url.pathname.startsWith('/the-sprite-project/')) outOfScopeRequests.push(request.url())
  })

  await page.goto('/the-sprite-project/')
  await expect(page).toHaveTitle('The Sprite Project')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add pack' }).click()
  await (await chooserEvent).setFiles({ name: 'complete-kit.spritepack', mimeType: 'application/zip', buffer: Buffer.from(await completeSpritePackFixtureBytes()) })
  await page.getByRole('dialog', { name: 'Install Complete Kit?' }).getByRole('button', { name: 'Install pack' }).click()
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Pages Pack Hero')
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('combobox', { name: 'Content pack' }).selectOption({ label: 'Complete Kit · 1.0.0' })
  await page.getByRole('dialog', { name: 'Activate Complete Kit 1.0.0?' }).getByRole('button', { name: 'Create checkpoint and activate' }).click()
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pages Pack Hero', exact: true })).toBeVisible()
  const serviceWorker = await page.evaluate(() => ({ controlled: Boolean(navigator.serviceWorker.controller), scriptURL: navigator.serviceWorker.controller?.scriptURL ?? '' }))
  expect(serviceWorker.controlled).toBe(true)
  expect(new URL(serviceWorker.scriptURL).pathname).toBe('/the-sprite-project/sw.js')

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pages Pack Hero', exact: true })).toBeVisible()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Export', exact: true }).click()
  const genericDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download generic package' }).click()
  expect((await genericDownload).suggestedFilename()).toBe('pages-pack-hero-generic.zip')
  await context.setOffline(false)

  await page.goto('/the-sprite-project/docs/')
  await expect(page).toHaveTitle('Overview - The Sprite Project')
  const capture = { serviceWorker, failedRequests, outOfScopeRequests, url: page.url() }
  await testInfo.attach('pages-subpath.json', { body: Buffer.from(JSON.stringify(capture, null, 2)), contentType: 'application/json' })
  expect(failedRequests).toEqual([])
  expect(outOfScopeRequests).toEqual([])
})
