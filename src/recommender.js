/**
 * Training-free ranking.
 *
 * This is deliberately a transparent content-based ranker:
 *   category affinity + profile term overlap + pain-point affinity
 *   + freshness/quality + deterministic exploration
 * followed by category/owner diversification. No model call and no offline
 * training step are involved.
 */
import { categoryLabel } from './taxonomy.js'
import { clip, hashString, normalizeText } from './text.js'
import { satisfiesRange } from './semver.js'

const DAY_MS = 86400000

function normalizeInPlace(value, max) {
  return max > 0 ? value / max : 0
}

function tokenSet(item) {
  if (!(item.tokens instanceof Set)) item.tokens = new Set(item.tokens ?? [])
  return item.tokens
}

function documentFrequency(items, profileTerms) {
  const wanted = new Set(profileTerms)
  const counts = new Map()
  for (const item of items) {
    for (const token of tokenSet(item)) {
      if (wanted.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }
  return counts
}

function qualityScore(item) {
  let score = 0
  if (item.repository !== '') score += 0.32
  if (item.homepage !== '') score += 0.2
  if (item.description.length >= 60) score += 0.25
  if (item.version !== '') score += 0.12
  if (item.keywords !== '') score += 0.11
  return Math.min(1, score)
}

function freshnessScore(item, now) {
  if (!Number.isFinite(item.publishedAt) || item.publishedAt <= 0) return 0.25
  const ageDays = Math.max(0, (now - item.publishedAt) / DAY_MS)
  return Math.max(0.1, Math.exp(-ageDays / 180))
}

function keywordMatches(item, profileTerms) {
  if (typeof item.keywords !== 'string' || item.keywords === '') return []
  return item.keywords
    .split('/')
    .map(value => value.trim())
    .filter(Boolean)
    .filter(keyword => normalizeText(keyword).split(/\s+/u).some(part => (profileTerms[part] ?? 0) >= 0.35))
    .slice(0, 3)
}

function buildReasons(item, profile, scores, painMatch) {
  const reasons = []
  const interest = profile.interests.find(entry => entry.id === item.category)
  if (interest !== undefined && interest.score >= 0.12) {
    reasons.push({
      kind: 'interest',
      text: `你的历史里「${interest.label}」信号较强`,
    })
  }

  if (painMatch !== null) {
    reasons.push({
      kind: 'pain',
      text: `你记录过 ${painMatch.count} 次「${painMatch.label}」，这个插件与相关能力方向吻合`,
    })
  }

  const keywords = keywordMatches(item, profile.terms)
  if (keywords.length > 0) {
    reasons.push({
      kind: 'keyword',
      text: `命中你常提到的词：${keywords.join('、')}`,
    })
  }

  if (reasons.length < 2 && scores.freshness >= 0.55) {
    reasons.push({ kind: 'fresh', text: '目录中近期有更新' })
  }
  if (reasons.length < 2 && scores.quality >= 0.7) {
    reasons.push({ kind: 'quality', text: '有源码主页和明确版本信息' })
  }
  if (reasons.length === 0) {
    reasons.push({ kind: 'explore', text: '来自插件目录的探索推荐，用来补充你的常用方向' })
  }
  return reasons.slice(0, 3)
}

function scoreCatalog(item, profile, context) {
  const terms = profile.terms ?? {}
  const itemTokens = tokenSet(item)
  let lexical = 0
  for (const token of itemTokens) {
    const weight = terms[token]
    if (weight === undefined) continue
    const df = context.df.get(token) ?? 0
    const idf = Math.log(1 + context.count / Math.max(1, df))
    lexical += weight * idf
  }
  lexical = normalizeInPlace(lexical / Math.sqrt(Math.max(12, itemTokens.size)), context.maxLexical)

  const categoryAffinity = profile.categories?.[item.category] ?? 0
  const painAffinity = profile.painCategories?.[item.category] ?? 0
  const painMatch = (profile.painPoints ?? []).find(pain => pain.categories?.[0] === item.category) ?? null
  const freshness = freshnessScore(item, context.now)
  const quality = qualityScore(item)
  const explore = (hashString(`${context.seed}:${item.name}`) % 1000) / 1000
  const raw =
    categoryAffinity * 0.37
    + lexical * 0.31
    + painAffinity * 0.13
    + Math.min(0.1, painMatch === null ? 0 : painMatch.share * 0.12)
    + freshness * 0.1
    + quality * 0.06
    + explore * 0.03

  return {
    raw,
    lexical,
    categoryAffinity,
    painAffinity,
    freshness,
    quality,
    explore,
    painMatch,
  }
}

function publicItem(item, ranked, profile, options) {
  const match = Math.round(52 + 45 * ranked.normalized)
  return {
    name: item.name,
    title: item.title,
    owner: item.owner,
    description: clip(item.description, 420),
    category: item.category,
    categoryLabel: item.categoryLabel || categoryLabel(item.category),
    version: item.version,
    publishedAt: item.publishedAt || null,
    homepage: item.homepage,
    repository: item.repository,
    keywords: item.keywords,
    capabilities: item.capabilities,
    install: `dsh plugin --profile ${options.profileName ?? 'web'} add ${item.npmName}`,
    match,
    reasons: buildReasons(item, profile, ranked, ranked.painMatch),
    rank: 0,
  }
}

/**
 * @param {object} options
 * @param {object} options.catalog Normalized catalog from CatalogStore.
 * @param {object} options.profile Profile from scanUserHistory.
 * @param {Set<string>|string[]} options.installed Lower-case package names.
 * @param {{saved?: string[], dismissed?: string[]}} options.feedback
 * @param {number} options.limit
 * @param {string} options.profileName DSH profile name used in install commands.
 * @param {string} options.seed
 */
export function rankPlugins(options) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const installed = new Set([...(options.installed ?? [])].map(value => normalizeText(value)))
  const feedback = options.feedback ?? {}
  const dismissed = new Set((feedback.dismissed ?? []).map(value => normalizeText(value)))
  const saved = new Set((feedback.saved ?? []).map(value => normalizeText(value)))
  const limit = Number.isSafeInteger(options.limit) && options.limit > 0 ? options.limit : 24
  const profileTerms = options.profile?.terms ?? {}
  const candidates = (options.catalog?.items ?? []).filter(item => {
    const name = normalizeText(item.npmName || item.name)
    const compatible = options.hostVersion === undefined || options.hostVersion === null
      ? true
      : satisfiesRange(options.hostVersion, item.enginesDsh) !== false
    return name !== ''
      && name !== 'dsh-plugin-feed'
      && !installed.has(name)
      && !dismissed.has(name)
      && item.description !== ''
      && compatible
  })

  const df = documentFrequency(candidates, Object.keys(profileTerms))
  let maxLexical = 0
  for (const item of candidates) {
    let score = 0
    for (const token of tokenSet(item)) {
      const weight = profileTerms[token]
      if (weight === undefined) continue
      score += weight * Math.log(1 + candidates.length / Math.max(1, df.get(token) ?? 0))
    }
    maxLexical = Math.max(maxLexical, score / Math.sqrt(Math.max(12, tokenSet(item).size)))
  }

  const context = {
    now,
    seed: options.seed ?? String(now),
    df,
    count: candidates.length,
    maxLexical,
  }
  const scored = candidates
    .map(item => ({ item, scores: scoreCatalog(item, options.profile ?? {}, context) }))
    .sort((a, b) => b.scores.raw - a.scores.raw)
    .slice(0, Math.max(limit * 5, 120))

  const topRaw = Math.max(1e-9, ...scored.map(entry => entry.scores.raw))
  for (const entry of scored) entry.scores.normalized = entry.scores.raw / topRaw

  // Greedy re-rank: keep high relevance, but stop one category or one owner
  // from swallowing the whole first screen.
  const selected = []
  const categoryCounts = new Map()
  const ownerCounts = new Map()
  const pool = [...scored]
  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0
    let bestAdjusted = -Infinity
    for (let index = 0; index < pool.length; index += 1) {
      const entry = pool[index]
      const categoryPenalty = Math.min(0.42, (categoryCounts.get(entry.item.category) ?? 0) * 0.1)
      const ownerPenalty = Math.min(0.22, (ownerCounts.get(entry.item.owner) ?? 0) * 0.075)
      const adjusted = entry.scores.normalized * (1 - categoryPenalty - ownerPenalty)
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted
        bestIndex = index
      }
    }
    const [entry] = pool.splice(bestIndex, 1)
    selected.push(entry)
    categoryCounts.set(entry.item.category, (categoryCounts.get(entry.item.category) ?? 0) + 1)
    ownerCounts.set(entry.item.owner, (ownerCounts.get(entry.item.owner) ?? 0) + 1)
  }

  return selected.map((entry, index) => {
    const item = publicItem(entry.item, entry.scores, options.profile ?? {}, options)
    item.rank = index + 1
    item.saved = saved.has(normalizeText(entry.item.npmName || entry.item.name))
    return item
  })
}
