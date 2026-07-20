import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-electron',
  testMatch: 'packaged-host.spec.ts',
  grep: /(TF-DESKTOP-PACK-|QS-DESKTOP-PACK-)/,
  outputDir: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/electron-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/electron-results.json' }],
    ['html', { outputFolder: '../delivery/updates/UPD-002-local-content-pack-ecosystem/evidence/runs/RUN-UPD002-001/electron-report', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
})
