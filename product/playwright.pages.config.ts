import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'upd002-pages-subpath.spec.ts',
  outputDir: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/pages-local-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/pages-local-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/pages-local-report', open: 'never' }],
  ],
  use: { baseURL: 'http://127.0.0.1:4176', ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build:pages && npm run preview:pages', url: 'http://127.0.0.1:4176/the-sprite-project/', reuseExistingServer: false },
})
