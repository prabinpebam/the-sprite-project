import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

await mkdir('build', { recursive: true })
await sharp('public/icon.svg').resize(512, 512).png().toFile('build/icon.png')