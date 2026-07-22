import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'upd003-cross-host.spec.ts',
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-cross-host-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-cross-host-results.json' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4183', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4183', url: 'http://127.0.0.1:4183', reuseExistingServer: false },
})