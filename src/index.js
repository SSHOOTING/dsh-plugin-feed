/**
 * Host half of dsh-plugin-feed.
 *
 * GET  /dsh-plugin-feed/feed      build/read the personalized feed
 * POST /dsh-plugin-feed/feedback save / dismiss a plugin card
 *
 * The host only reads local DSH logs and the public plugin catalog. It never
 * calls an LLM and never writes conversation text to disk.
 */
import { fileURLToPath } from 'node:url'
import { CatalogStore } from './catalog.js'
import { FeedbackStore, normalizeFeedbackAction } from './feedback.js'
import { rankPlugins } from './recommender.js'
import { scanUserHistory } from './profile.js'
import { readInstalledPlugins, resolveHostVersion, resolveProfileDir } from './session-store.js'

export const name = 'plugin-feed'
export const inject = ['webServer']

const FEED_PATH = '/dsh-plugin-feed/feed'
const FEEDBACK_PATH = '/dsh-plugin-feed/feedback'
const DEFAULT_FEEDBACK_PATH = fileURLToPath(new URL('../data/feedback.json', import.meta.url))
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_BODY_BYTES = 32 * 1024

export function resolveConfig(config = {}) {
  const positiveInt = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback
  return {
    userId: typeof config.userId === 'string' && config.userId.trim() !== '' ? config.userId.trim() : 'local-first-user',
    sessionsRoot: typeof config.sessionsRoot === 'string' && config.sessionsRoot.trim() !== '' ? config.sessionsRoot.trim() : undefined,
    profileDir: typeof config.profileDir === 'string' && config.profileDir.trim() !== '' ? config.profileDir.trim() : undefined,
    catalogSeedPath: typeof config.catalogSeedPath === 'string' && config.catalogSeedPath.trim() !== '' ? config.catalogSeedPath.trim() : undefined,
    catalogCachePath: typeof config.catalogCachePath === 'string' && config.catalogCachePath.trim() !== '' ? config.catalogCachePath.trim() : undefined,
    feedbackPath: typeof config.feedbackPath === 'string' && config.feedbackPath.trim() !== '' ? config.feedbackPath.trim() : DEFAULT_FEEDBACK_PATH,
    catalogUrl: typeof config.catalogUrl === 'string' && config.catalogUrl.trim() !== '' ? config.catalogUrl.trim() : undefined,
    maxSessions: config.maxSessions === 0 ? 0 : positiveInt(config.maxSessions, 600),
    feedSize: Math.min(60, positiveInt(config.feedSize, 24)),
    catalogRefreshHours: Math.min(168, positiveInt(config.catalogRefreshHours, 24)),
    cacheTtlMs: Math.min(3600000, positiveInt(config.cacheTtlMs, CACHE_TTL_MS)),
    prewarmDelayMs: Number.isSafeInteger(config.prewarmDelayMs) && config.prewarmDelayMs >= 0 ? config.prewarmDelayMs : 1800,
    profileName: typeof config.profileName === 'string' && config.profileName.trim() !== '' ? config.profileName.trim() : 'web',
    hostVersion: typeof config.hostVersion === 'string' && config.hostVersion.trim() !== '' ? config.hostVersion.trim() : undefined,
  }
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function queryDays(url, fallback = 0) {
  const value = url.searchParams.get('days')
  if (value === null || value === 'all') return 0
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) return fallback
  return Math.min(3650, number)
}

function queryLimit(url, fallback) {
  const number = Number(url.searchParams.get('limit'))
  return Number.isSafeInteger(number) && number > 0 ? Math.min(60, number) : fallback
}

function sameOrigin(request) {
  const origin = request.headers?.origin
  if (typeof origin !== 'string' || origin === '') return true
  try {
    return new URL(origin).host === request.headers?.host
  } catch {
    return false
  }
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(response, status, value, method = 'GET') {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  response.end(method === 'HEAD' ? undefined : body)
}

export function apply(ctx, config = {}) {
  const resolved = resolveConfig(config)
  const profileDir = resolveProfileDir(resolved.profileDir)
  const hostVersion = resolveHostVersion(profileDir, resolved.hostVersion)
  const catalog = new CatalogStore({
    seedPath: resolved.catalogSeedPath,
    cachePath: resolved.catalogCachePath,
    catalogUrl: resolved.catalogUrl,
    refreshHours: resolved.catalogRefreshHours,
  })
  const feedback = new FeedbackStore(resolved.feedbackPath)

  const cache = new Map()
  let inflight = null
  let inflightKey = ''

  async function buildFeed(options) {
    const key = `${options.days}:${options.limit}:${options.seed}`
    const cached = cache.get(key)
    if (options.refresh !== true && cached !== undefined && Date.now() - cached.builtAt < resolved.cacheTtlMs) {
      return cached.value
    }
    if (inflight !== null && inflightKey === key) return inflight

    inflightKey = key
    inflight = (async () => {
      const startedAt = Date.now()
      const catalogData = await catalog.ensure({ refresh: options.refresh === true })
      const profile = await scanUserHistory({
        sessionsRoot: resolved.sessionsRoot,
        maxSessions: resolved.maxSessions,
        windowDays: options.days,
      })
      profile.user = { id: resolved.userId, label: '本机 DSH 历史' }
      const installed = readInstalledPlugins(profileDir)
      const userFeedback = feedback.snapshot(resolved.userId)
      const items = rankPlugins({
        catalog: catalogData,
        profile,
        installed: installed.names,
        feedback: userFeedback,
        limit: options.limit,
        profileName: resolved.profileName,
        hostVersion,
        seed: options.seed,
      })
      const value = {
        user: profile.user,
        generatedAt: Date.now(),
        buildMs: Date.now() - startedAt,
        windowDays: options.days,
        scan: profile.scan,
        signals: profile.signals,
        interests: profile.interests,
        painPoints: profile.painPoints,
        sources: profile.sources,
        projects: profile.projects,
        catalog: catalog.status(),
        feedback: userFeedback,
        items,
        installedCount: installed.names.length,
        hostVersion,
        profileDir,
      }
      cache.set(key, { builtAt: Date.now(), value })
      return value
    })().finally(() => {
      inflight = null
      inflightKey = ''
    })
    return inflight
  }

  async function serveFeed(request, response) {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { error: 'method not allowed' })
        return
      }
      const url = new URL(request.url ?? FEED_PATH, 'http://127.0.0.1')
      const value = await buildFeed({
        refresh: url.searchParams.get('refresh') === '1',
        days: queryDays(url, 0),
        limit: queryLimit(url, resolved.feedSize),
        seed: url.searchParams.get('seed') ?? String(Date.now()),
      })
      sendJson(response, 200, value, request.method)
    } catch (error) {
      if (!response.headersSent) sendJson(response, 500, { error: messageOf(error), path: FEED_PATH })
      else response.end()
      console.warn(`[${name}] feed route: ${messageOf(error)}`)
    }
  }

  async function serveFeedback(request, response) {
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'method not allowed' })
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'cross-origin request rejected' })
        return
      }
      const body = await readJsonBody(request)
      const action = normalizeFeedbackAction(body.action)
      if (action === null) throw new Error('action must be save, unsave, dismiss, or undismiss')
      const result = feedback.apply(resolved.userId, action, body.name)
      cache.clear()
      sendJson(response, 200, result)
    } catch (error) {
      sendJson(response, 400, { error: messageOf(error) })
    }
  }

  const mount = hostContext => {
    const server = hostContext?.webServer ?? hostContext?.get?.('webServer')
    if (server === undefined || server === null || typeof server.register !== 'function') return undefined
    const disposeFeed = server.register({ kind: 'exact', path: FEED_PATH, handler: serveFeed })
    const disposeFeedback = server.register({ kind: 'exact', path: FEEDBACK_PATH, handler: serveFeedback })
    const timer = setTimeout(() => {
      void buildFeed({ refresh: false, days: 0, limit: resolved.feedSize, seed: 'prewarm' }).catch(() => undefined)
    }, resolved.prewarmDelayMs)
    if (typeof timer.unref === 'function') timer.unref()
    return () => {
      clearTimeout(timer)
      disposeFeed()
      disposeFeedback()
    }
  }

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], mount)
  } else {
    const dispose = mount(ctx)
    if (typeof dispose === 'function' && typeof ctx.effect === 'function') ctx.effect(() => dispose)
  }

  console.log(`[${name}] active; feed=${FEED_PATH}; sessions=${resolved.sessionsRoot ?? 'auto'}; profile=${profileDir}`)
  return { buildFeed, mount, catalog, feedback, resolved }
}

export { FEED_PATH, FEEDBACK_PATH }
