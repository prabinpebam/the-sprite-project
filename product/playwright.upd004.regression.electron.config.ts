import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-electron',
  testMatch: ['packaged-host.spec.ts', 'upd003-terrain-host.spec.ts'],
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-electron-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/regression-electron-results.json' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
})