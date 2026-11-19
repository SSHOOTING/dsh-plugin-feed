/**
 * Read DSH session logs and the active profile manifest.
 *
 * DSH stores a session as concatenated zstd frames. Each frame contains JSONL
 * records; a live session may leave the last frame partially written, so frame
 * and line decoding are both best-effort.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import zlib from 'node:zlib'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

function isDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export function resolveDshHome(explicit) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  const candidates = [
    join(homedir(), '.dsh'),
    'E:\\program\\DeepSeek\\.dsh',
  ]
  return candidates.find(isDirectory) ?? candidates[0]
}

export function resolveSessionsRoot(explicit, dshHome) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  const home = resolveDshHome(dshHome)
  const fromEnv = process.env.DSH_SESSIONS_DIR
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return join(home, 'sessions')
}

export function resolveProfileDir(explicit, dshHome) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  const fromEnv = process.env.DSH_PROFILE_DIR
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  const home = resolveDshHome(dshHome)
  const profile = process.env.DSH_PROFILE
  if (typeof profile === 'string' && profile.trim() !== '') return join(home, 'profiles', profile.trim())
  return join(home, 'profiles', 'web')
}

function pickLatest(files) {
  let best = null
  for (const file of files) {
    if (!file.endsWith('.jsonl.zstd')) continue
    const version = Number(/v(\d+)/u.exec(basename(file))?.[1] ?? 0)
    let mtime = 0
    try {
      mtime = statSync(file).mtimeMs
    } catch {
      continue
    }
    if (best === null || version > best.version) best = { file, version, mtime }
  }
  return best
}

/**
 * Layout: <root>/<workspace-slug>/<session-id>/session.vN.jsonl.zstd
 * @returns {Array<{workspace: string, sessionId: string, file: string, mtime: number, bytes: number, version: number}>}
 */
export function listSessionFiles(root) {
  const out = []
  let workspaces = []
  try {
    workspaces = readdirSync(root, { withFileTypes: true })
  } catch (error) {
    throw new Error(`cannot read sessions root ${root}: ${error.message}`)
  }

  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    const workspaceDir = join(root, workspace.name)
    let sessions = []
    try {
      sessions = readdirSync(workspaceDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      const sessionDir = join(workspaceDir, session.name)
      let names = []
      try {
        names = readdirSync(sessionDir).map(name => join(sessionDir, name))
      } catch {
        continue
      }
      const best = pickLatest(names)
      if (best === null) continue
      let bytes = 0
      try {
        bytes = statSync(best.file).size
      } catch {
        continue
      }
      out.push({
        workspace: workspace.name.replace(/^-+|-+$/gu, ''),
        sessionId: session.name,
        file: best.file,
        mtime: best.mtime,
        bytes,
        version: best.version,
      })
    }
  }

  out.sort((a, b) => b.mtime - a.mtime)
  return out
}

export function decompressAll(buffer) {
  if (typeof zlib.zstdDecompressSync !== 'function') {
    throw new Error('this Node.js build has no zstd support (need ^22.19 or >=24)')
  }
  const texts = []
  let offset = 0
  for (;;) {
    const at = buffer.indexOf(ZSTD_MAGIC, offset)
    if (at < 0) break
    offset = at + 4
    try {
      texts.push(zlib.zstdDecompressSync(buffer.subarray(at)).toString('utf8'))
    } catch {
      // Truncated or corrupt frame: skip it and continue scanning.
    }
  }
  if (texts.length === 0) {
    texts.push(zlib.zstdDecompressSync(buffer).toString('utf8'))
  }
  return texts
}

export function readSessionRecords(file) {
  const records = []
  for (const text of decompressAll(readFileSync(file))) {
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      try {
        records.push(JSON.parse(line))
      } catch {
        // The final line of a live session can be incomplete.
      }
    }
  }
  return records
}

/**
 * Package names declared by the active DSH profile. Included both as regular
 * dependencies and as loader bundles; local links are still identified by
 * their package key.
 */
export function readInstalledPlugins(profileDir) {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  } catch {
    return { names: [], dependencies: {}, bundles: [] }
  }
  const dependencies = manifest?.dependencies !== null && typeof manifest?.dependencies === 'object'
    ? manifest.dependencies
    : {}
  const bundles = Array.isArray(manifest?.dsh?.profile?.bundles)
    ? manifest.dsh.profile.bundles.filter(name => typeof name === 'string')
    : []
  const names = [...new Set([...Object.keys(dependencies), ...bundles])]
    .map(name => name.trim().toLowerCase())
    .filter(Boolean)
  return { names, dependencies, bundles }
}

/**
 * Best-effort current DSH version. The launcher is a local distribution, so
 * `process.argv[1]` usually points at `.../@deepseek-ai/dsh/lib/bin.js`.
 */
export function resolveHostVersion(profileDir, explicit) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  if (typeof process.env.DSH_VERSION === 'string' && process.env.DSH_VERSION.trim() !== '') {
    return process.env.DSH_VERSION.trim()
  }
  const candidates = []
  if (typeof process.argv[1] === 'string' && process.argv[1] !== '') {
    let directory = dirname(process.argv[1])
    for (let depth = 0; depth < 5; depth += 1) {
      candidates.push(join(directory, 'package.json'))
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  candidates.push(
    join(profileDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
    join(profileDir, '..', '..', '..', 'app', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
    join(resolveDshHome(), '..', 'app', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
    'E:\\program\\DeepSeek\\app\\node_modules\\@deepseek-ai\\dsh\\package.json',
  )
  for (const candidate of candidates) {
    try {
      const manifest = JSON.parse(readFileSync(candidate, 'utf8'))
      if (manifest?.name === '@deepseek-ai/dsh' && typeof manifest.version === 'string') {
        return manifest.version
      }
    } catch {
      // Try the next location.
    }
  }
  return null
}
