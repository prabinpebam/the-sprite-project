import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-electron',
  testMatch: 'upd004-multi-character-host.spec.ts',
  outputDir: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/electron-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/electron-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-004-multi-character-projects/evidence/runs/RUN-UPD004-001/electron-report', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
})