import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: 'upd002-pages-subpath.spec.ts',
  outputDir: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/playwright-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
})
