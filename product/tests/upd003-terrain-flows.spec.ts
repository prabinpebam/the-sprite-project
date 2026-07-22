import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { unzipSync } from 'fflate'

const anomalies = new Map<Page, { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }>()

async function createProject(page: Page, name = 'Terrain Field Test') {
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

async function openTerrain(page: Page) {
  await page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true }).click()
  await expect(page.locator('.workflow-nav').getByRole('button', { name: 'Terrain', exact: true })).toHaveAttribute('aria-current', 'page')
}

async function createTerrain(page: Page) {
  await openTerrain(page)
  await page.getByRole('button', { name: 'Create terrain' }).click()
  await expect(page.getByRole('heading', { name: 'Project terrain', exact: true })).toBeVisible()
  await expect(page.getByRole('gridcell')).toHaveCount(96)
}

async function canvasPaint(page: Page, label: string) {
  const canvasLocator = label === 'Terrain preview map' ? page.locator('canvas.terrain-map-canvas') : page.locator(`canvas[aria-label="${label}"]`)
  return canvasLocator.evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('2d')
    if (!context) return { opaque: 0, colors: 0 }
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let opaque = 0
    const colors = new Set<string>()
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] > 0) {
        opaque += 1
        colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${pixels[offset + 3]}`)
      }
    }
    return { opaque, colors: colors.size }
  })
}

async function downloadEntries(page: Page, buttonName: string) {
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: buttonName }).click()
  const download = await event
  const path = await download.path()
  if (!path) throw new Error('Downloaded terrain package path unavailable.')
  return { download, entries: unzipSync(new Uint8Array(await readFile(path))) }
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
    headings: [...document.querySelectorAll('h1,h2')].map(item => item.textContent?.trim()),
    status: [...document.querySelectorAll('[role="status"]')].map(item => item.textContent?.replace(/\s+/g, ' ').trim()),
    terrainCells: [...document.querySelectorAll('[data-terrain-cell]')].map(item => ({ index: item.getAttribute('data-terrain-cell'), label: item.getAttribute('aria-label'), pressed: item.getAttribute('aria-pressed') })),
    canvases: [...document.querySelectorAll('canvas')].map(item => ({ label: item.getAttribute('aria-label'), hash: item.getAttribute('data-render-hash'), width: item.width, height: item.height, rect: item.getBoundingClientRect().toJSON() })),
  }))
  await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify({ ...capture, ...record }, null, 2)), contentType: 'application/json' })
  if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
  expect(record.consoleErrors, 'console errors').toEqual([])
  expect(record.pageErrors, 'uncaught page errors').toEqual([])
  expect(record.failedRequests, 'failed requests').toEqual([])
  expect(capture.overflow, 'horizontal page overflow').toBe(false)
})

test('TF-TERRAIN-FIRST-PAINT-THEME creates, paints, themes, saves, and reopens exact terrain', async ({ page }) => {
  await createProject(page)
  const characterHash = await page.locator('.sprite-canvas').getAttribute('data-render-hash')
  await createTerrain(page)
  const atlas = page.locator('canvas[aria-label="Generated autotile atlas"]')
  await expect(atlas).toHaveAttribute('data-render-hash', /^[a-f0-9]{8}$/)
  expect(await canvasPaint(page, 'Generated autotile atlas')).toMatchObject({ opaque: 128 * 128 })
  expect((await canvasPaint(page, 'Generated autotile atlas')).colors).toBeGreaterThan(3)
  expect((await canvasPaint(page, 'Terrain preview map')).opaque).toBe(384 * 256)
  await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)

  const firstCell = page.getByRole('gridcell').first()
  await page.getByRole('radio', { name: 'Erase' }).check()
  await firstCell.focus()
  await page.keyboard.press('Space')
  await expect(firstCell).toHaveAttribute('aria-pressed', 'false')
  await expect(firstCell).toHaveAttribute('aria-label', /empty/)
  await firstCell.press('ArrowRight')
  await expect(page.getByRole('gridcell').nth(1)).toBeFocused()

  const hashBeforeMaterial = await atlas.getAttribute('data-render-hash')
  await page.getByRole('radio', { name: /Sand/ }).check()
  await expect.poll(() => atlas.getAttribute('data-render-hash')).not.toBe(hashBeforeMaterial)
  const surface = page.getByRole('textbox', { name: 'Surface terrain hex color' })
  await surface.fill('invalid')
  await expect(surface).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Use #RRGGBB')).toBeVisible()
  await surface.fill('#123456')
  await expect(surface).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('button', { name: 'Reset terrain theme' }).click()
  await expect(surface).not.toHaveValue('#123456')
  await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)

  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  const terrainHash = await atlas.getAttribute('data-render-hash')
  await page.reload()
  await openTerrain(page)
  await expect(page.locator('canvas[aria-label="Generated autotile atlas"]')).toHaveAttribute('data-render-hash', terrainHash!)
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)
})

test('TF-TERRAIN-EXPORT produces complete deterministic generic and Godot packages', async ({ page }) => {
  await createProject(page, 'Terrain Delivery')
  await createTerrain(page)
  await page.getByRole('button', { name: 'Open terrain export' }).click()
  await expect(page.getByRole('heading', { name: 'Terrain export' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Terrain export readiness' })).toContainText('Ready')

  const generic = await downloadEntries(page, 'Download terrain package')
  expect(generic.download.suggestedFilename()).toBe('terrain-delivery-terrain-generic.zip')
  expect(Object.keys(generic.entries).sort()).toEqual(['CREDITS.txt', 'build-manifest.json', 'credits.json', 'terrain-atlas.png', 'terrain-manifest.json'])
  const manifest = JSON.parse(new TextDecoder().decode(generic.entries['terrain-manifest.json']))
  expect(manifest.masks).toHaveLength(16)
  expect(manifest.masks[15]).toMatchObject({ north: true, east: true, south: true, west: true, x: 96, y: 96 })

  const godot = await downloadEntries(page, 'Download Godot terrain package')
  expect(Object.keys(godot.entries)).toEqual(expect.arrayContaining(['terrain-atlas.png', 'terrain_tileset.tres', 'README-GODOT-TERRAIN.md']))
  expect(godot.entries['terrain-atlas.png']).toEqual(generic.entries['terrain-atlas.png'])
  const resource = new TextDecoder().decode(godot.entries['terrain_tileset.tres'])
  expect(resource).toContain('terrain_set_0/mode = 2')
  expect(resource).toContain('3:3/0/terrains_peering_bit/top_side = 0')
  expect(new TextDecoder().decode(godot.entries['README-GODOT-TERRAIN.md'])).toContain('no peering-bit reconstruction is required')
})

test('TF-TERRAIN-REMOVE-RESTORE snapshots removal and restores terrain without character drift', async ({ page }) => {
  await createProject(page, 'Terrain Recovery')
  const characterHash = await page.locator('.sprite-canvas').getAttribute('data-render-hash')
  await createTerrain(page)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  const remove = page.getByRole('button', { name: 'Remove terrain' })
  await remove.click()
  const dialog = page.getByRole('dialog', { name: 'Remove terrain from this project?' })
  await expect(dialog).toContainText('Character recipe, packs, theme, and character exports are unaffected')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(remove).toBeFocused()
  await remove.click()
  await dialog.getByRole('button', { name: 'Remove terrain document' }).click()
  await expect(page.getByRole('button', { name: 'Create terrain' })).toBeVisible()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  await page.locator('.workflow-nav').getByRole('button', { name: 'Storage', exact: true }).click()
  const snapshot = page.locator('.snapshot-list > div').first()
  await snapshot.getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('dialog', { name: /Restore revision/ }).getByRole('button', { name: 'Restore recovery point' }).click()
  await openTerrain(page)
  await expect(page.getByRole('heading', { name: 'Project terrain' })).toBeVisible()
  await expect(page.locator('.sprite-canvas')).toHaveAttribute('data-render-hash', characterHash!)
})

test('QS-TERRAIN-OFFLINE-REFLOW keeps paint and both exports usable offline at constrained layouts', async ({ page, context }) => {
  await createProject(page, 'Offline Terrain')
  await createTerrain(page)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await openTerrain(page)
  await page.setViewportSize({ width: 640, height: 450 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('radio', { name: 'Erase' }).check()
  await page.getByRole('gridcell').first().click()
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-pressed', 'false')
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const atlas = page.locator('canvas[aria-label="Generated autotile atlas"]')
  await expect(atlas).toBeVisible()
  await atlas.scrollIntoViewIfNeeded()
  expect(await atlas.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return Boolean(hit && (hit === element || element.contains(hit)))
  })).toBe(true)
  await page.getByRole('button', { name: 'Open terrain export' }).click()
  await downloadEntries(page, 'Download terrain package')
  await downloadEntries(page, 'Download Godot terrain package')
  await context.setOffline(false)
})

test('QS-TERRAIN-PERFORMANCE keeps visible paint and atlas updates below the host threshold', async ({ page }, testInfo) => {
  await createProject(page, 'Terrain Performance')
  await createTerrain(page)
  const observed = await page.evaluate(async () => {
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const percentile = (values: number[], ratio: number) => [...values].sort((left, right) => left - right)[Math.ceil(values.length * ratio) - 1]
    const longTasks: number[] = []
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
    const paint = document.querySelector<HTMLInputElement>('input[aria-label="Paint"]')!
    const erase = document.querySelector<HTMLInputElement>('input[aria-label="Erase"]')!
    const cell = document.querySelector<HTMLButtonElement>('[data-terrain-cell="0"]')!
    const paintDurations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      ;(index % 2 ? paint : erase).click()
      cell.click()
      await frame()
      paintDurations.push(performance.now() - startedAt)
    }
    const input = document.querySelector<HTMLInputElement>('#terrain-color-surface')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const atlasDurations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      setter.call(input, `#${(0x200000 + index * 257).toString(16).padStart(6, '0').slice(-6)}`)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await frame()
      atlasDurations.push(performance.now() - startedAt)
    }
    return {
      paintP95Ms: percentile(paintDurations, 0.95),
      atlasP95Ms: percentile(atlasDurations, 0.95),
      maxLongTaskMs: Math.max(0, ...longTasks),
      samples: 100,
    }
  })
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify({ host: 'chromium', thresholds: { p95Ms: 50, maxLongTaskMs: 100 }, observed }, null, 2)), contentType: 'application/json' })
  expect(observed.paintP95Ms).toBeLessThanOrEqual(50)
  expect(observed.atlasP95Ms).toBeLessThanOrEqual(50)
  expect(observed.maxLongTaskMs).toBeLessThanOrEqual(100)
})
