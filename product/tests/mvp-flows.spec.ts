import { expect, test, type Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

const anomalies = new Map<Page, { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }>()

async function createProject(page: Page, name = 'Field Notes') {
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /Hero, walk, facing south/ })).toBeVisible()
}

async function openView(page: Page, name: 'Project' | 'Compose' | 'Theme' | 'Preview' | 'Export') {
  await page.locator('.workflow-nav').getByRole('button', { name, exact: true }).click()
  await expect(page.locator('.workflow-nav').getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page')
}

async function canvasHash(page: Page) {
  return page.locator('canvas').getAttribute('data-render-hash')
}

async function assertCanvasPainted(page: Page) {
  const painted = await page.locator('canvas').evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('2d')
    if (!context) return 0
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) count += 1
    return count
  })
  expect(painted).toBeGreaterThan(150)
}

async function assertHitTarget(locator: ReturnType<Page['getByRole']>) {
  await expect(locator).toBeVisible()
  await expect(locator).toBeEnabled()
  expect(await locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return hit === element || element.contains(hit)
  })).toBe(true)
}

async function zipEntries(download: Awaited<ReturnType<Page['waitForEvent']>>) {
  const filePath = await download.path()
  if (!filePath) throw new Error('Browser did not expose the downloaded file path.')
  return unzipSync(new Uint8Array(await readFile(filePath)))
}

async function tabTo(page: Page, accessibleName: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await page.keyboard.press('Tab')
    const name = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      return active?.getAttribute('aria-label') || active?.textContent?.replace(/\s+/g, ' ').trim() || ''
    })
    if (name.includes(accessibleName)) return
  }
  throw new Error(`Could not reach ${accessibleName} with Tab.`)
}

test.beforeEach(async ({ page }) => {
  const record = { consoleErrors: [] as string[], pageErrors: [] as string[], failedRequests: [] as string[] }
  anomalies.set(page, record)
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()) })
  page.on('pageerror', error => record.pageErrors.push(error.message))
  page.on('requestfailed', request => record.failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`))
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.afterEach(async ({ page }, testInfo) => {
  const record = anomalies.get(page)!
  const capture = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    headings: [...document.querySelectorAll('h1,h2')].map(item => item.textContent?.trim()),
    controls: [...document.querySelectorAll('button,input,select')].map(item => ({
      tag: item.tagName.toLowerCase(),
      name: item.getAttribute('aria-label') || item.textContent?.replace(/\s+/g, ' ').trim(),
      disabled: (item as HTMLButtonElement).disabled,
    })),
    canvas: [...document.querySelectorAll('canvas')].map(item => ({
      label: item.getAttribute('aria-label'), hash: item.getAttribute('data-render-hash'), frame: item.getAttribute('data-frame'),
    })),
  }))
  await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify({ ...capture, ...record }, null, 2)), contentType: 'application/json' })
  if (testInfo.status === testInfo.expectedStatus) {
    await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
  }
  expect(record.consoleErrors, 'console errors').toEqual([])
  expect(record.pageErrors, 'uncaught page errors').toEqual([])
  expect(record.failedRequests, 'failed requests').toEqual([])
  expect(capture.overflow, 'horizontal page overflow').toBe(false)
})

test('TF-FIRST-PROJECT creates and cancels through the actual dialog', async ({ page }) => {
  const newProject = page.getByRole('button', { name: 'New project' }).first()
  await assertHitTarget(newProject)
  await newProject.click()
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  await expect(newProject).toBeFocused()
  await newProject.click()
  const name = page.getByRole('textbox', { name: 'Project name' })
  await name.fill('   ')
  await expect(page.getByRole('button', { name: 'Create project' })).toBeDisabled()
  await name.fill('Field Notes')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { name: 'Field Notes', exact: true })).toBeVisible()
  await assertCanvasPainted(page)
})

test('TF-COMPOSE changes pack, slot, and visible pixels', async ({ page }) => {
  await createProject(page)
  const before = await canvasHash(page)
  await openView(page, 'Compose')
  await expect(page.getByRole('combobox', { name: 'Content pack' })).toHaveValue('wayfarer')
  await page.getByRole('tab', { name: /body/i }).click()
  await page.getByRole('radio', { name: /Lean build/ }).check()
  await expect(page.getByRole('radio', { name: /Lean build/ })).toBeChecked()
  await expect.poll(() => canvasHash(page)).not.toBe(before)
  await expect(page.getByRole('status', { name: 'Composition status' })).toContainText('Complete recipe')
})

test('TF-EDIT-COMPOSITION clears, replaces, and inspects provenance', async ({ page }) => {
  await createProject(page)
  await openView(page, 'Compose')
  await page.getByRole('tab', { name: /headwear/i }).click()
  await page.getByRole('radio', { name: /Trail band/ }).check()
  await expect(page.getByLabel('Asset details')).toContainText('Trail band')
  await expect(page.getByLabel('Asset details')).toContainText('CC0-1.0')
  await page.getByRole('button', { name: 'Clear optional slot' }).click()
  await expect(page.getByLabel('Asset details')).toContainText('No layer selected')
  await page.getByRole('radio', { name: /Traveler hood/ }).check()
  await expect(page.getByLabel('Asset details')).toContainText('idle · walk')
  await expect(page.getByRole('status', { name: 'Composition status' })).toContainText('Complete recipe')
})

test('TF-THEME applies, validates, overrides, and resets semantic tokens', async ({ page }) => {
  await createProject(page)
  const before = await canvasHash(page)
  await openView(page, 'Theme')
  await page.getByRole('radio', { name: /Tideline/ }).check()
  await expect.poll(() => canvasHash(page)).not.toBe(before)
  const input = page.getByRole('textbox', { name: 'Primary cloth hex color' })
  await input.fill('bad')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Use #RRGGBB')).toBeVisible()
  await input.fill('#123456')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  const row = page.locator('.token-row').filter({ hasText: 'Primary cloth' })
  await row.getByRole('checkbox', { name: 'Override for this character' }).check()
  await input.fill('#654321')
  await row.getByRole('button', { name: 'Reset Primary cloth override' }).click()
  await expect(row.getByRole('checkbox')).not.toBeChecked()
  await expect(input).toHaveValue('#123456')
})

test('TF-PREVIEW controls animation, direction, pause, speed, and zoom', async ({ page }) => {
  await createProject(page)
  await openView(page, 'Preview')
  await page.getByRole('radio', { name: 'idle', exact: true }).check()
  await expect(page.getByRole('img')).toHaveAttribute('aria-label', /idle/)
  await page.getByRole('radio', { name: 'walk', exact: true }).check()
  for (const direction of ['north', 'east', 'south', 'west']) {
    await page.getByRole('radio', { name: direction, exact: true }).check()
    await expect(page.getByRole('img')).toHaveAttribute('aria-label', new RegExp(direction))
  }
  const pause = page.getByRole('button', { name: 'Pause animation' })
  await pause.click()
  const frame = await page.locator('canvas').getAttribute('data-frame')
  await page.waitForTimeout(260)
  await expect(page.locator('canvas')).toHaveAttribute('data-frame', frame!)
  await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible()
  await page.getByRole('slider', { name: 'Playback speed' }).fill('2')
  await expect(page.getByText('2.0x')).toBeVisible()
  await page.getByRole('slider', { name: 'Preview zoom' }).fill('6')
  await expect(page.getByRole('slider', { name: 'Preview zoom' }).locator('..')).toContainText('6x')
})

test('TF-SAVE-REOPEN restores the exact recipe and supports rename', async ({ page }) => {
  await createProject(page, 'Persisted Field')
  await openView(page, 'Compose')
  await page.getByRole('tab', { name: /body/i }).click()
  const initialHash = await canvasHash(page)
  await page.getByRole('radio', { name: /Lean build/ }).check()
  await expect.poll(() => canvasHash(page)).not.toBe(initialHash)
  const hash = await canvasHash(page)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Persisted Field', exact: true })).toBeVisible()
  await expect.poll(() => canvasHash(page)).toBe(hash)
  await page.getByRole('button', { name: 'Rename project' }).click()
  const name = page.getByRole('textbox', { name: 'Project name' })
  await name.fill('Renamed Field')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('heading', { name: 'Renamed Field', exact: true })).toBeVisible()
  await expect.poll(() => canvasHash(page)).toBe(hash)
})

test('TF-EXPORT-GENERIC downloads and validates the portable contract', async ({ page }) => {
  await createProject(page, 'Generic Hero')
  await openView(page, 'Export')
  await expect(page.getByRole('status', { name: 'Export readiness' })).toContainText('Ready')
  const button = page.getByRole('button', { name: 'Download generic package' })
  await assertHitTarget(button)
  const event = page.waitForEvent('download')
  await button.click()
  const download = await event
  expect(download.suggestedFilename()).toBe('generic-hero-generic.zip')
  const entries = await zipEntries(download)
  expect(Object.keys(entries).sort()).toEqual(['CREDITS.txt', 'animations.json', 'build-manifest.json', 'credits.json', 'spritesheet.png'].sort())
  const animations = JSON.parse(new TextDecoder().decode(entries['animations.json']))
  expect(Object.keys(animations.animations)).toHaveLength(8)
  expect(entries['spritesheet.png'].length).toBeGreaterThan(500)
})

test('TF-EXPORT-GODOT downloads matching Godot 4 resources', async ({ page }) => {
  await createProject(page, 'Godot Hero')
  await openView(page, 'Export')
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Godot package' }).click()
  const entries = await zipEntries(await event)
  expect(Object.keys(entries)).toEqual(expect.arrayContaining(['character_sprite_frames.tres', 'README-GODOT.md', 'spritesheet.png']))
  const resource = new TextDecoder().decode(entries['character_sprite_frames.tres'])
  expect(resource).toContain('[gd_resource type="SpriteFrames"')
  expect(resource).toContain('name": &"walk_south"')
  expect(resource).toContain('region = Rect2(192, 256, 64, 64)')
  expect(new TextDecoder().decode(entries['README-GODOT.md'])).toContain('no manual slicing is required')
  const fixture = fileURLToPath(new URL('./godot-fixture/', import.meta.url))
  await mkdir(fixture, { recursive: true })
  await Promise.all(Object.entries(entries).map(([name, bytes]) => writeFile(`${fixture}/${name}`, bytes)))
})

test('TF-INSPECT-CREDITS tracks only currently selected sources', async ({ page }) => {
  await createProject(page)
  await openView(page, 'Export')
  const credits = page.getByLabel('Credits preview')
  await expect(credits).toContainText('Wayfarer Original Demonstration Pack')
  await expect(credits).toContainText('5 selected layers')
  await openView(page, 'Compose')
  await page.getByRole('tab', { name: /headwear/i }).click()
  await page.getByRole('radio', { name: /Trail band/ }).check()
  await openView(page, 'Export')
  await expect(credits).toContainText('6 selected layers')
  await expect(credits).toContainText('Trail band')
})

test('TF-RECOVER blocks incomplete export and restores safe defaults', async ({ page }) => {
  await createProject(page)
  await openView(page, 'Compose')
  await page.getByRole('tab', { name: /body/i }).click()
  await page.getByRole('button', { name: 'Clear required slot' }).click()
  await openView(page, 'Export')
  await expect(page.getByRole('status', { name: 'Export readiness' })).toContainText('Select a body layer')
  await expect(page.getByRole('button', { name: 'Download generic package' })).toBeDisabled()
  await openView(page, 'Project')
  await page.getByRole('button', { name: 'Restore safe project' }).click()
  await expect(page.getByRole('status', { name: 'Composition status' })).toContainText('Complete recipe')
  await openView(page, 'Export')
  await expect(page.getByRole('button', { name: 'Download generic package' })).toBeEnabled()
})

test('TF-SECOND-PACK uses the same workflow and export contract', async ({ page }) => {
  await createProject(page, 'Harbor Hero')
  const firstHash = await canvasHash(page)
  await openView(page, 'Compose')
  await page.getByRole('combobox', { name: 'Content pack' }).selectOption('harbor')
  await expect(page.getByRole('combobox')).toHaveValue('harbor')
  await expect.poll(() => canvasHash(page)).not.toBe(firstHash)
  await expect(page.getByLabel('Asset details')).toContainText('Harbor Watch')
  await openView(page, 'Export')
  await expect(page.getByRole('status', { name: 'Export readiness' })).toContainText('Ready')
  await expect(page.getByLabel('Credits preview')).toContainText('Harbor Watch Original Demonstration Pack')
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download generic package' }).click()
  const entries = await zipEntries(await event)
  expect(Object.keys(entries)).toContain('animations.json')
})

test('TF-KEYBOARD-JOURNEY completes the core route without pointer interaction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await tabTo(page, 'New project')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Keyboard Hero')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Keyboard Hero', exact: true })).toBeVisible()
  for (const destination of ['Compose', 'Theme', 'Preview', 'Export']) {
    await tabTo(page, destination)
    await page.keyboard.press('Enter')
    await expect(page.locator('.workflow-nav').getByRole('button', { name: destination, exact: true })).toHaveAttribute('aria-current', 'page')
  }
  const exportButton = page.getByRole('button', { name: 'Download generic package' })
  await exportButton.focus()
  await expect(exportButton).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
