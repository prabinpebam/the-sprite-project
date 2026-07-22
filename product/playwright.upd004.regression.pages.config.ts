import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'upd002-pages-subpath.spec.ts',
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/pages-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/pages-results.json' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4176/the-sprite-project/', viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  webServer: { command: 'npm run build:pages && npm run preview:pages', url: 'http://127.0.0.1:4176/the-sprite-project/', reuseExistingServer: false },
})