import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'upd004-cross-host.spec.ts',
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/cross-host-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/cross-host-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/cross-host-report', open: 'never' }],
  ],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4181', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4181', url: 'http://127.0.0.1:4181', reuseExistingServer: false },
})