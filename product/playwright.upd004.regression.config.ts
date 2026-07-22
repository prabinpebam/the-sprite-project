import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['mvp-flows.spec.ts', 'upd001-web-flows.spec.ts', 'upd002-pack-flows.spec.ts', 'upd002-cross-host.spec.ts', 'upd003-terrain-flows.spec.ts'],
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-web-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-web-results.json' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
})