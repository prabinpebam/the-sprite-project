import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const repositoryRoot = path.resolve('..')
const output = path.resolve('dist')
const docsSource = path.join(repositoryRoot, 'docs')
const docsOutput = path.join(output, 'docs')

await rm(docsOutput, { recursive: true, force: true })
await mkdir(docsOutput, { recursive: true })
await cp(docsSource, docsOutput, { recursive: true })
console.log(`Pages artifact assembled: app=/, docs=/docs/ (${output})`)
