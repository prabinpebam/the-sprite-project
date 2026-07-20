import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const port = Number(process.env.PORT || 4176)
const prefix = '/the-sprite-project/'
const root = path.resolve('dist')
const mediaTypes = { '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`)
  if (!url.pathname.startsWith(prefix)) {
    response.writeHead(404)
    response.end('Not found')
    return
  }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html'
  let file = path.resolve(root, ...relative.split('/'))
  if (!file.startsWith(`${root}${path.sep}`) && file !== path.join(root, 'index.html')) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }
  try {
    const info = await stat(file)
    if (info.isDirectory()) file = path.join(file, 'index.html')
    await stat(file)
  } catch {
    file = path.join(root, 'index.html')
  }
  response.setHeader('Content-Type', mediaTypes[path.extname(file)] || 'application/octet-stream')
  response.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
  createReadStream(file).pipe(response)
}).listen(port, '127.0.0.1', () => console.log(`Pages subpath preview: http://127.0.0.1:${port}${prefix}`))
