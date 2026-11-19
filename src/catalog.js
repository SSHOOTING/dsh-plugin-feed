/**
 * Plugin catalog loading and normalization.
 *
 * The feed uses the same public catalog family as DSH's plugin market. A
 * bundled snapshot makes the first render useful offline; a successful live
 * refresh replaces it and is cached locally.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { categoryLabel } from './taxonomy.js'
import { clip, normalizeText, tokenize } from './text.js'

export const DEFAULT_CATALOG_URL = 'https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json'
export const DEFAULT_SEED_PATH = fileURLToPath(new URL('../data/catalog.seed.json.gz', import.meta.url))
export const DEFAULT_CACHE_PATH = fileURLToPath(new URL('../data/catalog-cache.json', import.meta.url))

function latestVersion(plugin) {
  const versions = Array.isArray(plugin?.versions) ? plugin.versions : []
  let best = null
  for (const version of versions) {
    const timestamp = Number(version?.publishTimestamp ?? 0) * 1000
    if (best === null || timestamp > best.timestamp) best = { ...version, timestamp }
  }
  return best
}

function pickText(value, language = 'zh') {
  if (typeof value === 'string') return value
  if (value === null || typeof value !== 'object') return ''
  return String(value[language] ?? value.zh ?? value.en ?? Object.values(value).find(entry => typeof entry === 'string') ?? '')
}

function categoriesOf(plugin) {
  const raw = plugin?.metadata?.category ?? plugin?.category ?? plugin?.categories
  const values = Array.isArray(raw) ? raw : [raw]
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim() !== ''))]
}

function normalizedName(plugin) {
  return normalizeText(plugin?.npm ?? plugin?.name ?? plugin?.title ?? '')
}

function flattenKeywords(plugin) {
  const values = [
    ...(Array.isArray(plugin?.metadata?.keywords) ? plugin.metadata.keywords : []),
    ...(Array.isArray(plugin?.metadata?.labels) ? plugin.metadata.labels : []),
    ...(Array.isArray(plugin?.keywords) ? plugin.keywords : []),
  ]
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim() !== ''))]
}

function repoUrl(plugin) {
  const value = plugin?.repository?.url ?? plugin?.repository ?? plugin?.repoUrl
  return typeof value === 'string' ? value : ''
}

function ownerOf(plugin) {
  const parts = String(plugin?.title ?? plugin?.name ?? '').split('/')
  return parts.length > 1 ? parts[0] : ''
}

function sourceType(plugin, version) {
  return version?.source?.type ?? plugin?.source?.type ?? (plugin?.npm !== undefined ? 'npm' : 'unknown')
}

/**
 * Accept both catalog shapes:
 * - format 1 index: { format, metadata: { categories }, plugins: [...] }
 * - registry: { updated, categories, plugins: [{ install, category, ... }] }
 */
export function normalizeCatalog(raw, options = {}) {
  const rawPlugins = Array.isArray(raw?.plugins)
    ? raw.plugins
    : Array.isArray(raw?.registry?.plugins)
      ? raw.registry.plugins
      : []
  const categoryDefinitions = raw?.metadata?.categories ?? raw?.categories ?? {}
  const categories = {}
  for (const [id, definition] of Object.entries(categoryDefinitions)) {
    categories[id] = pickText(definition?.title ?? definition, 'zh') || categoryLabel(id)
  }

  const seen = new Set()
  const items = []
  for (const plugin of rawPlugins) {
    const name = normalizedName(plugin)
    if (name === '' || seen.has(name)) continue
    if (plugin?.deprecated === true) continue
    seen.add(name)
    const version = latestVersion(plugin)
    const zhDescription = clip(pickText(plugin?.description, 'zh'), 1500)
    const enDescription = clip(pickText(plugin?.description, 'en'), 1500)
    const itemCategories = categoriesOf(plugin)
    const keywords = flattenKeywords(plugin)
    const repository = repoUrl(plugin)
    const homepage = typeof plugin?.homepage === 'string' ? plugin.homepage : ''
    const npmName = typeof plugin?.npm === 'string' && plugin.npm.trim() !== '' ? plugin.npm.trim() : name
    const title = String(plugin?.title ?? plugin?.name ?? name)
    const searchText = [
      name,
      title,
      zhDescription,
      enDescription,
      itemCategories.join(' '),
      keywords.join(' '),
    ].join('\n')
    items.push({
      name,
      title,
      owner: ownerOf(plugin),
      npmName,
      description: zhDescription !== '' ? zhDescription : enDescription,
      descriptionEn: enDescription,
      homepage,
      repository,
      categories: itemCategories,
      category: itemCategories[0] ?? 'tools',
      categoryLabel: categories[itemCategories[0]] ?? categoryLabel(itemCategories[0] ?? 'tools'),
      keywords: clip(keywords.join(' / '), 300),
      version: String(version?.version ?? plugin?.version ?? ''),
      publishedAt: version?.timestamp ?? (Date.parse(plugin?.added ?? '') || 0),
      sourceType: sourceType(plugin, version),
      enginesDsh: typeof version?.engines?.dsh === 'string'
        ? version.engines.dsh
        : typeof plugin?.engines?.dsh === 'string'
          ? plugin.engines.dsh
          : null,
      stars: Number.isFinite(plugin?.stars) ? plugin.stars : null,
      downloads: Number.isFinite(plugin?.downloads) ? plugin.downloads : null,
      capabilities: Array.isArray(plugin?.capabilities) ? plugin.capabilities.slice(0, 8) : null,
      searchText,
      tokens: tokenize(searchText, { maxTokens: 900 }),
    })
  }

  return {
    meta: {
      source: options.source ?? 'unknown',
      loadedAt: Date.now(),
      updatedAt: typeof raw?.updated === 'string' ? raw.updated : null,
      count: items.length,
      categories,
    },
    items,
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readSeed(path) {
  if (!existsSync(path)) throw new Error(`catalog seed not found: ${path}`)
  const buffer = readFileSync(path)
  const text = path.endsWith('.gz') ? gunzipSync(buffer).toString('utf8') : buffer.toString('utf8')
  return JSON.parse(text)
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temp, JSON.stringify(value), 'utf8')
  renameSync(temp, path)
}

export class CatalogStore {
  constructor(options = {}) {
    this.seedPath = options.seedPath ?? DEFAULT_SEED_PATH
    this.cachePath = options.cachePath ?? DEFAULT_CACHE_PATH
    this.catalogUrl = options.catalogUrl ?? DEFAULT_CATALOG_URL
    this.refreshHours = Number.isFinite(options.refreshHours) && options.refreshHours > 0
      ? options.refreshHours
      : 24
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    this.current = null
    this.inflight = null
    this.lastRefreshError = null
    this.lastRefreshAttempt = 0
  }

  async ensure(options = {}) {
    if (this.current !== null && options.refresh !== true) {
      this.maybeBackgroundRefresh()
      return this.current
    }
    if (this.current === null) {
      this.current = this.loadLocal()
    }
    if (options.refresh === true) {
      await this.refresh()
    } else {
      this.maybeBackgroundRefresh()
    }
    return this.current
  }

  loadLocal() {
    try {
      if (existsSync(this.cachePath)) {
        const cached = readJson(this.cachePath)
        if (Array.isArray(cached?.items) && cached.items.length > 0) {
          return {
            ...cached,
            meta: { ...cached.meta, source: 'cache' },
          }
        }
      }
    } catch {
      // Fall back to the packaged snapshot.
    }
    const raw = readSeed(this.seedPath)
    return normalizeCatalog(raw, { source: 'bundled' })
  }

  maybeBackgroundRefresh() {
    if (this.inflight !== null) return
    const loadedAt = Number(this.current?.meta?.loadedAt ?? 0)
    const maxAge = this.refreshHours * 3600000
    const bundled = this.current?.meta?.source === 'bundled'
    const now = Date.now()
    if (!bundled && loadedAt > 0 && now - loadedAt < maxAge) return
    if (this.lastRefreshError !== null && now - this.lastRefreshAttempt < 15 * 60000) return
    this.lastRefreshAttempt = now
    void this.refresh().catch(() => undefined)
  }

  async refresh() {
    if (this.inflight !== null) return this.inflight
    this.inflight = this.fetchCatalog()
      .then(catalog => {
        this.current = catalog
        this.lastRefreshError = null
        try {
          writeJsonAtomic(this.cachePath, catalog)
        } catch {
          // A read-only package directory must not make the feed unusable.
        }
        return catalog
      })
      .catch(error => {
        this.lastRefreshError = error instanceof Error ? error.message : String(error)
        return this.current
      })
      .finally(() => {
        this.inflight = null
      })
    return this.inflight
  }

  async fetchCatalog() {
    if (typeof this.fetchImpl !== 'function') throw new Error('fetch is not available')
    const response = await this.fetchImpl(this.catalogUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'dsh-plugin-feed/0.1',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`catalog HTTP ${response.status}`)
    const raw = await response.json()
    const catalog = normalizeCatalog(raw, { source: this.catalogUrl })
    catalog.meta.refreshError = null
    return catalog
  }

  status() {
    return {
      source: this.current?.meta?.source ?? 'unknown',
      loadedAt: this.current?.meta?.loadedAt ?? null,
      updatedAt: this.current?.meta?.updatedAt ?? null,
      count: this.current?.meta?.count ?? 0,
      refreshError: this.lastRefreshError,
    }
  }
}
