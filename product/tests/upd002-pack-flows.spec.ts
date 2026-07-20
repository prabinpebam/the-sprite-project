import { expect, test, type Page } from '@playwright/test'
import { largeSpritePackFixtureBytes, spritePackFixtureBytes, spritePackFixturePng } from '../src/domain/spritepack-test-fixture'

async function openPacks(page: Page): Promise<void> {
  await page.locator('.workflow-nav').getByRole('button', { name: 'Packs', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Packs', exact: true })).toBeVisible()
}

async function createProject(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

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

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('TF-PACK-INSTALL-LIBRARY-ACTIVATE installs exact content and protects an active lock', async ({ page, context }) => {
  await openPacks(page)
  const packageBytes = await spritePackFixtureBytes()
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add pack' }).click()
  await (await chooserEvent).setFiles({ name: 'field-kit.spritepack', mimeType: 'application/zip', buffer: Buffer.from(packageBytes) })
  const review = page.getByRole('dialog', { name: 'Install Field Kit?' })
  await expect(review).toContainText('io.example.field-kit')
  await expect(review).toContainText('CC0-1.0')
  await review.getByRole('button', { name: 'Install pack' }).click()

  const installed = page.locator('.pack-version-list > div').filter({ hasText: 'Field Kit · 1.0.0' })
  await expect(installed).toContainText('installed-local')
  await installed.locator('.pack-version-summary').click()
  const detail = page.locator('.pack-detail')
  await expect(detail).toContainText('Field coat')
  await expect(detail).toContainText('Test Artist · CC0-1.0')
  await expect(detail).toContainText('No local project dependencies')

  await createProject(page, 'Installed Pack Hero')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('combobox', { name: 'Content pack' }).selectOption({ label: 'Field Kit · 1.0.0' })
  const activation = page.getByRole('dialog', { name: 'Activate Field Kit 1.0.0?' })
  await expect(activation).toContainText('checkpointed')
  await activation.getByRole('button', { name: 'Create checkpoint and activate' }).click()
  await expect(page.getByRole('combobox', { name: 'Content pack' })).toHaveValue(/io\.example\.field-kit/)
  await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })

  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Installed Pack Hero', exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Installed Pack Hero', exact: true })).toBeVisible()
  await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
  await context.setOffline(false)
  await openPacks(page)
  const reloaded = page.locator('.pack-version-list > div').filter({ hasText: 'Field Kit · 1.0.0' })
  await reloaded.getByRole('checkbox', { name: 'Enabled' }).uncheck()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Content pack' })).toHaveValue(/io\.example\.field-kit/)
  await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
  await openPacks(page)
  await page.getByRole('button', { name: 'Remove Field Kit 1.0.0' }).click()
  const blockedRemoval = page.getByRole('dialog', { name: 'Field Kit is in use' })
  await expect(blockedRemoval).toContainText('Active project')
  await blockedRemoval.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')).toContainText('Field Kit · 1.0.0')
})

test('QS-PACK-REFLOW keeps pack authoring usable at constrained 200%-equivalent layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 640, height: 450 })
  await openPacks(page)
  await page.getByRole('button', { name: 'Create pack' }).click()
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add layer sheet' }).click()
  await (await chooserEvent).setFiles({ name: 'reflow.png', mimeType: 'image/png', buffer: Buffer.from(spritePackFixturePng()) })
  await expect(page.getByRole('heading', { name: 'Asset configuration' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const binding = page.getByRole('combobox', { name: 'Binding for #123456' })
  await binding.focus()
  await binding.selectOption('fixed')
  await expect(binding).toHaveValue('fixed')
  await page.setViewportSize({ width: 320, height: 800 })
  await expect(page.getByRole('heading', { name: 'Asset configuration' })).toBeVisible()
  const narrowLayout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll<HTMLElement>('body *')].map(element => ({ element, rect: element.getBoundingClientRect() })).filter(item => item.rect.right > document.documentElement.clientWidth + 1).slice(0, 12).map(item => ({ tag: item.element.tagName, className: item.element.className, text: item.element.textContent?.trim().slice(0, 60), left: item.rect.left, right: item.rect.right, width: item.rect.width })),
  }))
  expect(narrowLayout.fits, JSON.stringify(narrowLayout, null, 2)).toBe(true)
})

test('TF-PACK-INVALID rejects before mutation and exports an actionable report', async ({ page }) => {
  await openPacks(page)
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add pack' }).click()
  await (await chooserEvent).setFiles({ name: 'hostile.spritepack', mimeType: 'application/zip', buffer: Buffer.from('not a zip') })
  const error = page.getByRole('alert')
  await expect(error).toContainText('pack-invalid')
  const reportEvent = page.waitForEvent('download')
  await error.getByRole('button', { name: 'Download report' }).click()
  const reportPath = await (await reportEvent).path()
  if (!reportPath) throw new Error('Validation report path unavailable.')
  const report = await (await import('node:fs/promises')).readFile(reportPath, 'utf8')
  expect(report).toContain('Repository mutation: none')
  expect(report).toContain('Stage: pack:container')
  await expect(page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')).toContainText('No local packs installed')
})

test('TF-PACK-UPDATE installs side by side, previews impact, activates, and rolls back', async ({ page }) => {
  const install = async (version: string) => {
    await openPacks(page)
    const chooserEvent = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add pack' }).click()
    await (await chooserEvent).setFiles({ name: `field-kit-${version}.spritepack`, mimeType: 'application/zip', buffer: Buffer.from(await spritePackFixtureBytes(version)) })
    await page.getByRole('dialog', { name: 'Install Field Kit?' }).getByRole('button', { name: 'Install pack' }).click()
  }
  await install('1.0.0')
  await install('1.1.0')
  await expect(page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')).toContainText('2 local')
  await createProject(page, 'Versioned Pack Hero')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  const selector = page.getByRole('combobox', { name: 'Content pack' })
  await selector.selectOption({ label: 'Field Kit · 1.0.0' })
  await page.getByRole('dialog', { name: 'Activate Field Kit 1.0.0?' }).getByRole('button', { name: 'Create checkpoint and activate' }).click()
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
  await selector.selectOption({ label: 'Field Kit · 1.1.0' })
  const impact = page.getByRole('dialog', { name: 'Activate Field Kit 1.1.0?' })
  await expect(impact).toContainText('1 selected asset IDs retained')
  await expect(impact).toContainText('rendered pixels and credits are expected to change')
  await impact.getByRole('button', { name: 'Create checkpoint and activate' }).click()
  await expect(selector).toHaveValue(/1\.1\.0/)
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  const checkpoint = page.locator('.snapshot-list > div').filter({ hasText: 'pack replacement' }).first()
  await expect(checkpoint).toBeVisible()
  await checkpoint.getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('dialog', { name: /Restore revision/ }).getByRole('button', { name: 'Restore recovery point' }).click()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Content pack' })).toHaveValue(/1\.0\.0/)
})

test('TF-PACK-MISSING-RECOVERY blocks substitution, creates a copy, and locates the exact pack', async ({ page }) => {
  const packageBytes = await spritePackFixtureBytes()
  await openPacks(page)
  const packChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add pack' }).click()
  await (await packChooser).setFiles({ name: 'field-kit.spritepack', mimeType: 'application/zip', buffer: Buffer.from(packageBytes) })
  await page.getByRole('dialog', { name: 'Install Field Kit?' }).getByRole('button', { name: 'Install pack' }).click()
  await createProject(page, 'Missing Pack Hero')
  await page.locator('.workflow-nav').getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('combobox', { name: 'Content pack' }).selectOption({ label: 'Field Kit · 1.0.0' })
  await page.getByRole('dialog', { name: 'Activate Field Kit 1.0.0?' }).getByRole('button', { name: 'Create checkpoint and activate' }).click()
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 4_000 })
  await page.evaluate(async () => {
    const request = indexedDB.open('the-sprite-project-workspace-v1')
    const database = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    const transaction = database.transaction('packVersions', 'readwrite')
    transaction.objectStore('packVersions').clear()
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error) })
    database.close()
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Exact pack unavailable' })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Use Wayfarer 1.0.0 in a copy' }).click()
  const replacement = page.getByRole('dialog', { name: 'Create a Wayfarer replacement copy?' })
  await expect(replacement).toContainText('original exact lock')
  await replacement.getByRole('button', { name: 'Create replacement copy' }).click()
  await expect(page.getByRole('heading', { name: 'Missing Pack Hero (replacement copy)', exact: true })).toBeVisible()
  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await page.locator('.project-list > div').filter({ hasText: 'Missing Pack Hero' }).filter({ hasNotText: 'replacement copy' }).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Exact pack unavailable' })).toBeVisible()
  const exactChooser = page.waitForEvent('filechooser')
  await page.getByText('Locate exact pack', { exact: true }).click()
  await (await exactChooser).setFiles({ name: 'field-kit.spritepack', mimeType: 'application/zip', buffer: Buffer.from(packageBytes) })
  await expect(page.getByRole('heading', { name: 'Missing Pack Hero', exact: true })).toBeVisible()
  await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
})

test('TF-PACK-AUTHOR-RECOVERY creates, autosaves, reopens, recovers, and self-installs a pack', async ({ page }) => {
  await openPacks(page)
  await page.getByRole('button', { name: 'Create pack' }).click()
  await expect(page.getByRole('heading', { name: 'Untitled pack' })).toBeVisible()

  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add layer sheet' }).click()
  await (await chooserEvent).setFiles({ name: 'field-coat.png', mimeType: 'image/png', buffer: Buffer.from(spritePackFixturePng()) })
  await expect(page.getByRole('heading', { name: 'Asset configuration' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Binding for #123456' }).selectOption('fixed')
  await page.getByRole('textbox', { name: 'Author' }).fill('Pack Author')
  await page.getByRole('textbox', { name: 'Source title' }).fill('Original field coat')
  await page.getByRole('textbox', { name: 'HTTPS source URL' }).fill('https://example.com/original-field-coat')
  await expect(page.getByLabel('Draft runtime preview')).toBeVisible()
  await expect.poll(() => paintedPixels(page)).toBeGreaterThan(1_000)
  await expect(page.getByText('Pack is ready to export.')).toBeVisible()
  await expect(page.getByText(/Saved revision/)).toBeVisible({ timeout: 4_000 })

  await page.reload()
  await openPacks(page)
  await page.locator('.pack-version-list > button').filter({ hasText: 'Untitled pack' }).click()
  await expect(page.getByRole('heading', { name: 'Untitled pack' })).toBeVisible()
  await expect(page.getByText('Pack is ready to export.')).toBeVisible()
  const firstPackageEvent = page.waitForEvent('download', download => download.suggestedFilename().endsWith('.spritepack'))
  await page.getByRole('button', { name: 'Export .spritepack' }).click()
  const firstPackagePath = await (await firstPackageEvent).path()
  const secondPackageEvent = page.waitForEvent('download', download => download.suggestedFilename().endsWith('.spritepack'))
  await page.getByRole('button', { name: 'Export .spritepack' }).click()
  const secondPackagePath = await (await secondPackageEvent).path()
  if (!firstPackagePath || !secondPackagePath) throw new Error('Deterministic pack download path unavailable.')
  const fileSystem = await import('node:fs/promises')
  expect(await fileSystem.readFile(secondPackagePath)).toEqual(await fileSystem.readFile(firstPackagePath))
  const recoveryEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recovery' }).click()
  expect((await recoveryEvent).suggestedFilename()).toMatch(/draft-recovery\.zip$/)

  await page.getByRole('button', { name: 'Install test copy' }).click()
  await page.getByRole('button', { name: 'Back to packs' }).click()
  const installedSection = page.getByRole('heading', { name: 'Installed versions' }).locator('xpath=ancestor::section[1]')
  await expect(installedSection).toContainText('Untitled pack · 0.1.0')
  await expect(installedSection).toContainText('authored-local')
})

test('TF-PACK-DRAFT-RECOVERY preserves stale-tab edits and saves a separate copy', async ({ page, context }) => {
  await openPacks(page)
  await page.getByRole('button', { name: 'Create pack' }).click()
  const second = await context.newPage()
  await second.goto('/')
  await openPacks(second)
  await second.locator('.pack-version-list > button').filter({ hasText: 'Untitled pack' }).click()

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('First tab draft')
  await expect(page.getByText('Saved revision 1')).toBeVisible({ timeout: 4_000 })
  await second.getByRole('textbox', { name: 'Description', exact: true }).fill('Stale tab work that must survive')
  const recovery = second.getByRole('dialog', { name: 'Recover draft save' })
  await expect(recovery).toContainText('draft-conflict')
  await recovery.getByRole('button', { name: 'Save copy' }).click()
  await expect(second.getByRole('heading', { name: 'Untitled pack (copy)' })).toBeVisible()
  await expect(second.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('Stale tab work that must survive')
  await second.close()
})

test('QS-PACK-MAX-PERFORMANCE validates a near-maximum pack without blocking UI', async ({ page }, testInfo) => {
  test.setTimeout(30_000)
  const packageBytes = await largeSpritePackFixtureBytes()
  await openPacks(page)
  await page.evaluate(() => {
    const state = { startedAt: 0, completedAt: 0, statuses: [] as { at: number; text: string }[], longTasks: [] as number[] }
    ;(window as unknown as { __packPerformance: typeof state }).__packPerformance = state
    document.addEventListener('change', event => {
      const input = event.target as HTMLInputElement | null
      if (input?.type === 'file' && input.accept.includes('spritepack')) state.startedAt = performance.now()
    }, true)
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver(list => state.longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
    }
    new MutationObserver(() => {
      const text = [...document.querySelectorAll('[role="status"]')].map(element => element.textContent?.replace(/\s+/g, ' ').trim() ?? '').find(value => value.includes('Validating local pack'))
      if (text && state.statuses.at(-1)?.text !== text) state.statuses.push({ at: performance.now(), text })
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  const fixturePath = testInfo.outputPath('large-benchmark.spritepack')
  const fileSystem = await import('node:fs/promises')
  await fileSystem.mkdir((await import('node:path')).dirname(fixturePath), { recursive: true })
  await fileSystem.writeFile(fixturePath, packageBytes)
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add pack' }).click()
  await (await chooserEvent).setFiles(fixturePath)
  await fileSystem.rm(fixturePath, { force: true })
  await expect(page.getByRole('dialog', { name: 'Install Large Benchmark Pack?' })).toBeVisible({ timeout: 10_000 })
  const observed = await page.evaluate(() => {
    const state = (window as unknown as { __packPerformance: { startedAt: number; completedAt: number; statuses: { at: number; text: string }[]; longTasks: number[] } }).__packPerformance
    state.completedAt = performance.now()
    const points = [state.startedAt, ...state.statuses.map(status => status.at), state.completedAt]
    const gaps = points.slice(1).map((point, index) => point - points[index])
    return {
      firstStatusMs: (state.statuses[0]?.at ?? state.completedAt) - state.startedAt,
      maxStatusGapMs: Math.max(...gaps),
      totalMs: state.completedAt - state.startedAt,
      maxLongTaskMs: Math.max(0, ...state.longTasks),
      statusUpdates: state.statuses,
    }
  })
  const report = { host: 'web', compressedBytes: packageBytes.length, thresholds: { firstStatusMs: 100, maxStatusGapMs: 500, totalMs: 10_000, maxLongTaskMs: 100 }, observed }
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify(report, null, 2)), contentType: 'application/json' })
  expect(observed.firstStatusMs).toBeLessThanOrEqual(100)
  expect(observed.maxStatusGapMs).toBeLessThanOrEqual(500)
  expect(observed.totalMs).toBeLessThanOrEqual(10_000)
  expect(observed.maxLongTaskMs).toBeLessThanOrEqual(100)
})
