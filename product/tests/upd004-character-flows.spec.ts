import { expect, test, type Page } from '@playwright/test'

const anomalies = new Map<Page, { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }>()

async function createProject(page: Page) {
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Cast Project')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
}

function characterRow(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

test.beforeEach(async ({ page }) => {
  const record = { consoleErrors: [] as string[], pageErrors: [] as string[], failedRequests: [] as string[] }
  anomalies.set(page, record)
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()) })
  page.on('pageerror', error => record.pageErrors.push(error.message))
  page.on('requestfailed', request => record.failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
  await page.goto('/')
})

test.afterEach(async ({ page }, testInfo) => {
  const record = anomalies.get(page)!
  const capture = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    activeRows: [...document.querySelectorAll('[aria-current="true"]')].map(item => item.textContent?.replace(/\s+/g, ' ').trim()),
    characterRows: [...document.querySelectorAll('[role="listitem"]')].map(item => item.textContent?.replace(/\s+/g, ' ').trim()),
    canvases: [...document.querySelectorAll('canvas[data-render-hash]')].map(item => ({ label: item.getAttribute('aria-label'), hash: item.getAttribute('data-render-hash') })),
  }))
  await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify({ ...capture, ...record }, null, 2)), contentType: 'application/json' })
  if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
  expect(record.consoleErrors).toEqual([])
  expect(record.pageErrors).toEqual([])
  expect(record.failedRequests).toEqual([])
  expect(capture.overflow).toBe(false)
})

test('TF-CHARACTER-CREATE-SWITCH-MANAGE independently saves and recovers a project cast', async ({ page }) => {
  await createProject(page)
  await expect(page.getByRole('list', { name: 'Project characters' }).getByRole('listitem')).toHaveCount(1)
  await expect(characterRow(page, 'Hero')).toHaveAttribute('aria-current', 'true')

  await page.getByRole('button', { name: 'Create character' }).click()
  const nameField = page.getByRole('textbox', { name: 'Character name' })
  await nameField.fill('hero')
  await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
  await expect(page.getByText('Character already named Hero')).toBeVisible()
  await expect(nameField).toHaveAttribute('aria-invalid', 'true')
  await expect(nameField).toHaveValue('hero')
  await nameField.fill('Scout')
  await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
  await expect(characterRow(page, 'Scout')).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('listitem')).toHaveCount(2)

  await characterRow(page, 'Scout').getByRole('button', { name: 'Edit active character' }).click()
  await expect(page.getByRole('status', { name: 'Active character' })).toContainText('Scout')
  await page.getByRole('tab', { name: /headwear/i }).click()
  await page.locator('.asset-list input[type="radio"]').first().check()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Pause animation' }).click()

  await page.locator('.workflow-nav').getByRole('button', { name: 'Project', exact: true }).click()
  await characterRow(page, 'Hero').getByRole('button', { name: 'Open character' }).click()
  await expect(characterRow(page, 'Hero')).toHaveAttribute('aria-current', 'true')
  await characterRow(page, 'Hero').getByRole('button', { name: 'Edit active character' }).click()
  await page.getByRole('tab', { name: /headwear/i }).click()
  await expect(page.locator('.asset-list input[type="radio"]:checked')).toHaveCount(0)
  await page.locator('.workflow-nav').getByRole('button', { name: 'Project', exact: true }).click()
  await page.getByRole('button', { name: 'Duplicate Hero' }).click()
  await expect(nameField).toHaveValue('Hero copy')
  await page.getByRole('button', { name: 'Duplicate character', exact: true }).click()
  await expect(characterRow(page, 'Hero copy')).toHaveAttribute('aria-current', 'true')
  await page.getByRole('button', { name: 'Rename Hero copy' }).click()
  await nameField.fill('Guard')
  await page.getByRole('button', { name: 'Save character name' }).click()
  await expect(characterRow(page, 'Guard')).toHaveAttribute('aria-current', 'true')

  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Guard' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete Guard?' })
  await expect(deleteDialog).toContainText('currently active')
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Delete Guard' })).toBeFocused()
  await page.getByRole('button', { name: 'Delete Guard' }).click()
  await page.getByRole('button', { name: 'Delete character permanently' }).click()
  await expect(characterRow(page, 'Scout')).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(characterRow(page, 'Scout')).toHaveAttribute('aria-current', 'true')
  await characterRow(page, 'Scout').getByRole('button', { name: 'Edit active character' }).click()
  await page.getByRole('tab', { name: /headwear/i }).click()
  await expect(page.locator('.asset-list input[type="radio"]:checked')).toHaveCount(1)

  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await page.locator('.snapshot-list > div').first().getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('dialog', { name: /Restore revision/ }).getByRole('button', { name: 'Restore recovery point' }).click()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Project', exact: true }).click()
  await expect(characterRow(page, 'Guard')).toBeVisible()
  await expect(characterRow(page, 'Guard')).toHaveAttribute('aria-current', 'true')
})

test('QS-CHARACTER-REFLOW keeps collection controls usable at 320px', async ({ page }) => {
  await createProject(page)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.getByRole('button', { name: 'Create character' }).click()
  await page.getByRole('textbox', { name: 'Character name' }).fill('Scout')
  await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(characterRow(page, 'Scout').getByRole('button', { name: 'Edit active character' })).toBeVisible()
})

test('TF-CHARACTER-RETURN manages, reopens, and exports a character offline', async ({ page, context }) => {
  await createProject(page)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Create character' }).click()
  await page.getByRole('textbox', { name: 'Character name' }).fill('Offline Scout')
  await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.reload()
  await expect(characterRow(page, 'Offline Scout')).toHaveAttribute('aria-current', 'true')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Export', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download generic package' }).click()
  await download
  await context.setOffline(false)
})

test('QS-CHARACTER-CAPACITY-PERFORMANCE enforces 16 characters and host thresholds', async ({ page }, testInfo) => {
  await createProject(page)
  for (let index = 2; index <= 16; index += 1) {
    await page.getByRole('button', { name: 'Create character' }).click()
    await page.getByRole('textbox', { name: 'Character name' }).fill(`Character ${index}`)
    await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()
  }
  await expect(page.getByRole('listitem')).toHaveCount(16)
  await expect(page.getByRole('button', { name: 'Create character' })).toBeDisabled()
  await expect(page.getByText('Maximum 16 characters per project')).toBeVisible()

  const switchResult = await page.evaluate(async () => {
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const durations: number[] = []
    const longTasks: number[] = []
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === 'Open character')
      if (!button) throw new Error('Inactive character button unavailable.')
      button.click()
      await frame()
      durations.push(performance.now() - startedAt)
    }
    const sorted = [...durations].sort((left, right) => left - right)
    return { p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], maxLongTaskMs: Math.max(0, ...longTasks), samples: durations.length }
  })
  const saveStartedAt = performance.now()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('listitem')).toHaveCount(16)
  const saveReopenMs = performance.now() - saveStartedAt
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify({ host: 'chromium', thresholds: { switchP95Ms: 50, saveReopenMs: 2_000, maxLongTaskMs: 100 }, observed: { ...switchResult, saveReopenMs } }, null, 2)), contentType: 'application/json' })
  expect(switchResult.p95Ms).toBeLessThanOrEqual(50)
  expect(switchResult.maxLongTaskMs).toBeLessThanOrEqual(100)
  expect(saveReopenMs).toBeLessThanOrEqual(2_000)
})