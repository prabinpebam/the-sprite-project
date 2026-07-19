import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-electron',
  outputDir: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/electron-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/electron-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-001-dual-host-mvp/evidence/runs/RUN-UPD001-001/electron-report', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
})