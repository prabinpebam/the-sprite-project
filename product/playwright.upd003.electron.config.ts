import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-electron',
  testMatch: 'upd003-terrain-host.spec.ts',
  outputDir: '../delivery/updates/UPD-003-terrain-environment-producer/evidence/runs/RUN-UPD003-001/electron-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-003-terrain-environment-producer/evidence/runs/RUN-UPD003-001/electron-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-003-terrain-environment-producer/evidence/runs/RUN-UPD003-001/electron-report', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
})
