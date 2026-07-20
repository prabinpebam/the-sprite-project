import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['upd002-pack-flows.spec.ts', 'upd002-cross-host.spec.ts'],
  outputDir: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/playwright-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
})
