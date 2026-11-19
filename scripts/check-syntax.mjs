import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = []

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'data') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(?:js|mjs)$/u.test(entry.name)) files.push(path)
  }
}

walk(root)
let failed = 0
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status === 0) {
    console.log(`ok ${relative(root, file)}`)
    continue
  }
  failed += 1
  console.error(`FAIL ${relative(root, file)}`)
  if (result.stderr) console.error(result.stderr.trim())
}
if (failed > 0) process.exitCode = 1
else console.log(`checked ${files.length} files`)
