import { build } from 'esbuild'

await Promise.all([
  build({ entryPoints: ['electron/main.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: 'dist-electron/main.mjs', external: ['electron'], sourcemap: true }),
  build({ entryPoints: ['electron/preload.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node22', outfile: 'dist-electron/preload.cjs', external: ['electron'], sourcemap: true }),
])