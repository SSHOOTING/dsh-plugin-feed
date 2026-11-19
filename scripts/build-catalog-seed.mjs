import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_CATALOG_URL } from '../src/catalog.js'

const output = fileURLToPath(new URL('../data/catalog.seed.json.gz', import.meta.url))
const input = process.argv[2]
const url = process.argv[3] ?? DEFAULT_CATALOG_URL

let raw
if (typeof input === 'string' && input.trim() !== '') {
  const bytes = readFileSync(resolve(input))
  raw = input.endsWith('.gz')
    ? gunzipSync(bytes).toString('utf8')
    : bytes.toString('utf8')
} else {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dsh-plugin-feed-seed-builder/0.1' },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`catalog HTTP ${response.status}`)
  raw = await response.text()
}

const parsed = JSON.parse(raw)
if (!Array.isArray(parsed?.plugins) || parsed.plugins.length < 100) {
  throw new Error('catalog does not look valid: expected at least 100 plugins')
}
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, gzipSync(Buffer.from(JSON.stringify(parsed), 'utf8'), { level: 9 }))
console.log(`wrote ${output}: ${parsed.plugins.length} plugins, ${readFileSync(output).byteLength} bytes`)
