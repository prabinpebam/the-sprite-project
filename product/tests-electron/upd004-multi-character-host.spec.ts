import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

let application: ElectronApplication | undefined
let page: Page | undefined
let temporaryRoot: string | undefined

test.beforeEach(async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sprite-project-cast-electron-'))
  application = await electron.launch({ executablePath: path.resolve('release/win-unpacked/The Sprite Project.exe'), env: { ...process.env, SPRITE_PROJECT_USER_DATA: path.join(temporaryRoot, 'user-data') } })
  page = await application.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterEach(async ({ browserName: _browserName }, testInfo) => {
  if (page && application && !page.isClosed()) {
    const capture = await page.evaluate(() => ({
      title: document.title,
      bridgeKeys: Object.keys(window.spriteHost ?? {}).sort(),
      bridgeFrozen: Object.isFrozen(window.spriteHost),
      nodeProcessType: typeof (window as unknown as { process?: unknown }).process,
      nodeRequireType: typeof (window as unknown as { require?: unknown }).require,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      activeRows: [...document.querySelectorAll('[aria-current="true"]')].map(item => item.textContent?.replace(/\s+/g, ' ').trim()),
    }))
    await testInfo.attach('capture.json', { body: Buffer.from(JSON.stringify(capture, null, 2)), contentType: 'application/json' })
    if (testInfo.status === testInfo.expectedStatus) await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
    expect(capture.bridgeKeys).toHaveLength(18)
    expect(capture.bridgeFrozen).toBe(true)
    expect(capture.nodeProcessType).toBe('undefined')
    expect(capture.nodeRequireType).toBe('undefined')
    expect(capture.overflow).toBe(false)
    await page.evaluate(() => { document.body.dataset.spriteCloseApproved = 'true' })
    await application.close()
  }
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined)
})

function characterRow(currentPage: Page, name: string) {
  return currentPage.getByRole('listitem').filter({ hasText: name })
}

test('TF-CHARACTER-DESKTOP saves separate recipes, detects edits, and removes stale files', async ({ page: _fixturePage }, testInfo) => {
  if (!page || !application || !temporaryRoot) throw new Error('Electron cast test did not initialize.')
  const projectFolder = path.join(temporaryRoot, 'Cast Desktop Project')
  await application.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }) }, projectFolder)

  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Cast Desktop')
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.getByRole('button', { name: 'Create character' }).click()
  await page.getByRole('textbox', { name: 'Character name' }).fill('Scout')
  await page.getByRole('dialog', { name: 'Create character' }).getByRole('button', { name: 'Create character' }).click()

  const performanceResult = await page.evaluate(async () => {
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const durations: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const startedAt = performance.now()
      const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === 'Open character')
      if (!button) throw new Error('Inactive character button unavailable.')
      button.click()
      await frame()
      durations.push(performance.now() - startedAt)
    }
    const sorted = [...durations].sort((left, right) => left - right)
    return { p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], samples: durations.length }
  })
  await testInfo.attach('performance.json', { body: Buffer.from(JSON.stringify({ host: 'electron', threshold: { switchP95Ms: 50 }, observed: performanceResult }, null, 2)), contentType: 'application/json' })
  expect(performanceResult.p95Ms).toBeLessThanOrEqual(50)

  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  const project = JSON.parse(await readFile(path.join(projectFolder, 'project.json'), 'utf8')) as { recipeIds: string[]; activeRecipeId: string }
  expect(project.recipeIds).toHaveLength(2)
  const recipeFiles = (await readdir(path.join(projectFolder, 'recipes'))).sort()
  expect(recipeFiles).toEqual(project.recipeIds.map(id => `${id}.json`).sort())

  const externalPath = path.join(projectFolder, 'recipes', `${project.activeRecipeId}.json`)
  const externalRecipe = JSON.parse(await readFile(externalPath, 'utf8'))
  externalRecipe.name = 'External recipe edit'
  await writeFile(externalPath, `${JSON.stringify(externalRecipe)}\n`)
  const inactiveName = project.activeRecipeId === project.recipeIds[0] ? 'Scout' : 'Hero'
  await characterRow(page, inactiveName).getByRole('button', { name: 'Open character' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByRole('dialog', { name: 'Project files changed outside this window' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await readFile(externalPath, 'utf8')).toContain('External recipe edit')
  await page.getByRole('button', { name: 'Save project' }).click()
  await page.getByRole('dialog', { name: 'Project files changed outside this window' }).getByRole('button', { name: 'Overwrite from this window' }).click()
  await expect.poll(async () => (await readFile(externalPath, 'utf8')).includes('External recipe edit')).toBe(false)

  await page.locator('.workflow-nav').getByRole('button', { name: 'Project', exact: true }).click()
  const scoutRow = characterRow(page, 'Scout')
  await scoutRow.getByRole('button', { name: 'Delete Scout' }).click()
  await page.getByRole('button', { name: 'Delete character permanently' }).click()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()
  const savedProject = JSON.parse(await readFile(path.join(projectFolder, 'project.json'), 'utf8')) as { recipeIds: string[] }
  expect(savedProject.recipeIds).toHaveLength(1)
  expect(await readdir(path.join(projectFolder, 'recipes'))).toEqual([`${savedProject.recipeIds[0]}.json`])
})