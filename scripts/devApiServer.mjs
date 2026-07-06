// Minimal local stand-in for Vercel's serverless function runtime, used only
// for `npm run dev:api`. In production, Vercel serves everything under /api
// directly — this script exists so /api/*.js can be exercised locally
// without requiring a Vercel account/login. Each handler is a plain
// (req, res) function, same shape Vercel expects.
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

process.loadEnvFile(path.resolve(import.meta.dirname, '../.env.local'))

const PORT = process.env.DEV_API_PORT || 3001
const API_DIR = path.resolve(import.meta.dirname, '../api')

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (!url.pathname.startsWith('/api/')) {
    res.writeHead(404).end('Not found')
    return
  }

  const routeName = url.pathname.slice('/api/'.length)
  const filePath = path.join(API_DIR, `${routeName}.js`)

  let handlerModule
  try {
    handlerModule = await import(pathToFileURL(filePath).href)
  } catch (e) {
    res.writeHead(404).end(`No handler for ${url.pathname}: ${e.message}`)
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString('utf8')
  if (rawBody) {
    try {
      req.body = JSON.parse(rawBody)
    } catch {
      res.writeHead(400).end('Invalid JSON body')
      return
    }
  }

  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  }

  try {
    await handlerModule.default(req, res)
  } catch (e) {
    console.error(e)
    res.writeHead(500).end(JSON.stringify({ error: e.message }))
  }
})

server.listen(PORT, () => {
  console.log(`Local API dev server (stand-in for Vercel functions) on http://localhost:${PORT}`)
})
