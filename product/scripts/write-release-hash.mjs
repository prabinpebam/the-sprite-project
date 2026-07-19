import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import packageJson from '../package.json' with { type: 'json' }

const filename = `the-sprite-project-${packageJson.version}-windows-x64-portable.zip`
const bytes = await readFile(new URL(`../release/${filename}`, import.meta.url))
const digest = createHash('sha256').update(bytes).digest('hex')
await writeFile(new URL(`../release/${filename}.sha256`, import.meta.url), `${digest}  ${filename}\n`)