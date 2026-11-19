/**
 * Turn raw DSH session records into a bounded, explainable user profile.
 *
 * The profile is intentionally ephemeral: it is rebuilt from logs and never
 * uploads or copies conversation text into the recommendation state file.
 * Only aggregate weights, category names, failure classes and counts survive.
 */
import { basename } from 'node:path'
import { listSessionFiles, readSessionRecords, resolveSessionsRoot } from './session-store.js'
import { CATEGORIES, PAIN_CLASSES, TOOL_CATEGORIES, categoryLabel, classifyError } from './taxonomy.js'
import { clip, countOccurrences, messageText, normalizeText, tokenize } from './text.js'

const DAY_MS = 86400000
const TERM_LIMIT = 700
const MAX_PROMPT_CHARS = 3200
const MAX_ASSISTANT_CHARS = 1400

function emptyCategoryScores() {
  return Object.fromEntries(Object.keys(CATEGORIES).map(id => [id, 0]))
}

function createAccumulator(now) {
  return {
    now,
    terms: new Map(),
    categories: emptyCategoryScores(),
    categoryMentions: Object.fromEntries(Object.keys(CATEGORIES).map(id => [id, 0])),
    pain: Object.fromEntries(PAIN_CLASSES.map(item => [item.id, {
      id: item.id,
      label: item.label,
      count: 0,
      example: '',
    }])),
    sessions: [],
    projects: new Map(),
    workspaces: new Map(),
    signals: {
      userMessages: 0,
      assistantMessages: 0,
      toolCalls: 0,
      toolErrors: 0,
      commandFailures: 0,
      approvalRejected: 0,
      retries: 0,
      turns: 0,
    },
    firstEventAt: null,
    lastEventAt: null,
  }
}

function recencyWeight(time, now) {
  if (!Number.isFinite(time)) return 0.65
  const ageDays = Math.max(0, (now - time) / DAY_MS)
  return 0.45 + 0.55 * Math.exp(-ageDays / 150)
}

function addTermWeight(state, token, weight) {
  state.terms.set(token, (state.terms.get(token) ?? 0) + weight)
}

function addText(state, text, weight, time) {
  const normalized = normalizeText(text)
  if (normalized === '') return
  const decayed = weight * recencyWeight(time, state.now)
  for (const token of tokenize(normalized)) addTermWeight(state, token, decayed)

  let hits = 0
  for (const [id, definition] of Object.entries(CATEGORIES)) {
    let categoryHits = 0
    for (const keyword of definition.keywords) {
      categoryHits += countOccurrences(normalized, keyword.toLowerCase())
    }
    if (categoryHits === 0) continue
    hits += categoryHits
    state.categories[id] += Math.min(categoryHits, 4) * decayed
    state.categoryMentions[id] += categoryHits
  }

  // Very broad prompts should not dominate a whole topic. The cap is applied
  // to category evidence above, while term counts naturally saturate through
  // repeated-token reuse.
  if (hits === 0) return
}

function bumpCategory(state, id, weight) {
  if (id === undefined || state.categories[id] === undefined) return
  state.categories[id] += weight
  state.categoryMentions[id] += 1
}

function projectFromWorkspace(workspace) {
  const text = String(workspace ?? '')
    .replace(/^-+|-+$/gu, '')
    .replace(/^E-programs-/u, '')
    .replaceAll('-', ' ')
    .trim()
  return text === '' ? '其他项目' : text
}

function errorText(message) {
  const parts = []
  const walk = content => {
    if (!Array.isArray(content)) return
    for (const part of content) {
      if (typeof part?.text === 'string') parts.push(part.text)
      if (Array.isArray(part?.content)) walk(part.content)
    }
  }
  walk(message?.content)
  return clip(parts.join('\n'), 1200)
}

function isTruthyError(message) {
  if (message?.isError === true) return true
  if (!Array.isArray(message?.content)) return false
  return message.content.some(part => part?.isError === true)
}

function exitCode(text) {
  const matches = [...String(text ?? '').matchAll(/\[exit code:\s*(-?\d+)\]/giu)]
  const code = matches.length === 0 ? 0 : Number(matches.at(-1)?.[1] ?? 0)
  return Number.isFinite(code) ? code : 0
}

function shouldIncludeTime(time, cutoff) {
  return cutoff <= 0 || !Number.isFinite(time) || time >= cutoff
}

/**
 * Pure extraction entry point used by tests and the scanner.
 */
export function buildProfileFromSessionRecords(sessionRecords, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const cutoff = Number.isFinite(options.cutoff) ? options.cutoff : 0
  const workspace = options.workspace ?? ''
  const state = createAccumulator(now)
  const callNames = new Map()
  let sessionPrompts = 0
  let sessionTitle = ''
  let sessionTime = now

  for (const record of sessionRecords) {
    const time = Number(record?.time)
    if (record?.type === 'session') {
      if (Number.isFinite(record.createdAt)) sessionTime = record.createdAt
      continue
    }
    if (Number.isFinite(time)) {
      if (state.firstEventAt === null || time < state.firstEventAt) state.firstEventAt = time
      if (state.lastEventAt === null || time > state.lastEventAt) state.lastEventAt = time
    }
    if (!shouldIncludeTime(time, cutoff)) continue

    if (record.type === 'session/title') {
      const title = typeof record.data?.title === 'string' ? record.data.title.trim() : ''
      if (title !== '') {
        sessionTitle = title
        addText(state, title, 1.4, time)
      }
      continue
    }

    if (record.type === 'user/message') {
      // Runtime context, skill catalogs, time snapshots and subagent prompts
      // are machine-generated. Only a real user input is a preference signal.
      if (record.data?.source?.kind !== 'user') continue
      const text = messageText(record.data, { maxChars: MAX_PROMPT_CHARS })
      if (text === '') continue
      state.signals.userMessages += 1
      sessionPrompts += 1
      addText(state, text, 3.0, time)
      continue
    }

    if (record.type === 'assistant/message') {
      state.signals.assistantMessages += 1
      const text = messageText(record.data, { maxChars: MAX_ASSISTANT_CHARS })
      if (text !== '') addText(state, text, 0.35, time)
      continue
    }

    if (record.type === 'tool/call') {
      const tool = String(record.data?.name ?? '').trim()
      if (tool === '') continue
      state.signals.toolCalls += 1
      callNames.set(String(record.data?.callId ?? ''), tool)
      addTermWeight(state, tool.toLowerCase(), 0.45 * recencyWeight(time, now))
      for (const id of TOOL_CATEGORIES[tool] ?? []) {
        // Tool calls happen thousands of times. They should nudge a category,
        // not outvote the several hundred messages the user actually wrote.
        bumpCategory(state, id, 0.035 * recencyWeight(time, now))
      }
      continue
    }

    if (record.type === 'tool/result') {
      const message = record.data?.message
      const text = errorText(message)
      const code = exitCode(text)
      const failed = isTruthyError(message) || code !== 0
      if (!failed) continue
      const tool = callNames.get(String(record.data?.toolCallId ?? message?.toolCallId ?? '')) ?? 'tool'
      state.signals.toolErrors += 1
      if (code !== 0) state.signals.commandFailures += 1
      const pain = classifyError(text, true)
      if (pain !== null) {
        const bucket = state.pain[pain.id]
        bucket.count += 1
        if (bucket.example === '') bucket.example = clip(text.replace(/\s+/gu, ' '), 120)
        for (const id of pain.categories) {
          bumpCategory(state, id, 0.42 * recencyWeight(time, now))
        }
        addText(state, pain.label, 0.9, time)
      }
      addTermWeight(state, tool.toLowerCase(), 0.25 * recencyWeight(time, now))
      continue
    }

    if (record.type === 'approval/decided') {
      const outcome = normalizeText(record.data?.outcome ?? record.data?.decision ?? '')
      if (outcome.includes('reject') || outcome.includes('cancel') || outcome.includes('deny')) {
        state.signals.approvalRejected += 1
      }
      continue
    }

    if (record.type === 'llm/retry') state.signals.retries += 1
    if (record.type === 'turn/end') state.signals.turns += 1
  }

  if (workspace !== '') {
    const project = projectFromWorkspace(workspace)
    state.projects.set(project, (state.projects.get(project) ?? 0) + 1)
    addText(state, project, 0.8, sessionTime)
  }
  state.sessions.push({
    workspace,
    project: projectFromWorkspace(workspace),
    title: clip(sessionTitle, 80),
    prompts: sessionPrompts,
    time: sessionTime,
  })
  return { state, sessionPrompts }
}

function normalizeScores(scores) {
  // Log compression keeps a very common operation (for example, 10k shell
  // calls) from flattening every smaller but more discriminative interest.
  const compressed = Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, Math.log1p(Math.max(0, value))]),
  )
  const max = Math.max(0, ...Object.values(compressed))
  if (max <= 0) return scores
  return Object.fromEntries(Object.entries(compressed).map(([key, value]) => [
    key,
    Math.round((value / max) * 1000) / 1000,
  ]))
}

export function finalizeProfile(accumulator) {
  const categoryScores = normalizeScores(accumulator.categories)
  const painItems = Object.values(accumulator.pain).filter(item => item.count > 0)
  const totalPain = painItems.reduce((sum, item) => sum + item.count, 0)
  const painCategories = {}
  for (const pain of painItems) {
    const definition = PAIN_CLASSES.find(item => item.id === pain.id)
    for (const id of definition?.categories ?? []) {
      painCategories[id] = (painCategories[id] ?? 0) + pain.count / Math.max(1, totalPain)
    }
  }

  for (const [id, value] of Object.entries(painCategories)) {
    if (categoryScores[id] === undefined) continue
    categoryScores[id] = Math.min(1, categoryScores[id] + value * 0.32)
  }

  const terms = [...accumulator.terms.entries()]
    .filter(([term]) => term.length >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TERM_LIMIT)
  const maxTerm = Math.max(1, ...terms.map(([, weight]) => weight))
  const termScores = Object.fromEntries(terms.map(([term, weight]) => [
    term,
    Math.round((weight / maxTerm) * 1000) / 1000,
  ]))

  const interests = Object.entries(categoryScores)
    .filter(([, score]) => score >= 0.04)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([id, score]) => ({
      id,
      label: categoryLabel(id),
      score: Math.round(score * 1000) / 1000,
      mentions: accumulator.categoryMentions[id] ?? 0,
    }))

  const projects = [...accumulator.projects.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, sessions]) => ({ name, sessions }))

  const validSessions = accumulator.sessions.filter(session => session.workspace !== '')
  const workspaceCounts = new Map()
  for (const session of validSessions) {
    workspaceCounts.set(session.workspace, (workspaceCounts.get(session.workspace) ?? 0) + session.prompts)
  }
  const sources = [...workspaceCounts.entries()]
    .map(([workspace, prompts]) => ({ workspace: projectFromWorkspace(workspace), prompts }))
    .sort((a, b) => b.prompts - a.prompts)
    .slice(0, 8)

  return {
    user: { id: 'local-dsh-user', label: '本机 DSH 历史' },
    signals: {
      ...accumulator.signals,
      sessions: validSessions.length,
      projects: accumulator.projects.size,
      firstEventAt: accumulator.firstEventAt,
      lastEventAt: accumulator.lastEventAt,
    },
    interests,
    painPoints: painItems
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(item => ({
        ...item,
        share: Math.round((item.count / Math.max(1, totalPain)) * 1000) / 1000,
        categories: PAIN_CLASSES.find(definition => definition.id === item.id)?.categories ?? [],
      })),
    painCategories: Object.fromEntries(
      Object.entries(painCategories).map(([key, value]) => [key, Math.round(value * 1000) / 1000]),
    ),
    terms: termScores,
    projects,
    sources,
  }
}

/**
 * Scan the newest (or all) DSH sessions. Reading is sequential and yields to
 * the event loop every few files so a settings page request does not pin the
 * host for the entire history.
 */
export async function scanUserHistory(options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const windowDays = Number.isFinite(options.windowDays) && options.windowDays > 0 ? options.windowDays : 0
  const cutoff = windowDays > 0 ? now - windowDays * DAY_MS : 0
  const root = resolveSessionsRoot(options.sessionsRoot, options.dshHome)
  const maxSessions = Number.isSafeInteger(options.maxSessions) && options.maxSessions > 0
    ? options.maxSessions
    : 0
  let files = listSessionFiles(root)
  if (maxSessions > 0) files = files.slice(0, maxSessions)
  if (cutoff > 0) files = files.filter(file => file.mtime >= cutoff)

  const accumulator = createAccumulator(now)
  let skipped = 0
  let done = 0
  let records = 0

  for (const file of files) {
    try {
      const sessionRecords = readSessionRecords(file.file)
      const result = buildProfileFromSessionRecords(sessionRecords, {
        now,
        cutoff,
        workspace: file.workspace,
      })
      mergeAccumulators(accumulator, result.state)
      records += sessionRecords.length
    } catch {
      skipped += 1
    }
    done += 1
    if (done % 8 === 0) {
      options.onProgress?.({ done, total: files.length, skipped, records })
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  options.onProgress?.({ done, total: files.length, skipped, records })

  const profile = finalizeProfile(accumulator)
  profile.scan = {
    state: 'ready',
    root,
    sessions: files.length,
    scanned: done,
    skipped,
    records,
    windowDays,
    maxSessions,
    generatedAt: now,
  }
  return profile
}

function mergeAccumulators(target, source) {
  for (const [term, weight] of source.terms) {
    target.terms.set(term, (target.terms.get(term) ?? 0) + weight)
  }
  for (const [id, value] of Object.entries(source.categories)) target.categories[id] += value
  for (const [id, value] of Object.entries(source.categoryMentions)) target.categoryMentions[id] += value
  for (const [id, value] of Object.entries(source.pain)) {
    target.pain[id].count += value.count
    if (target.pain[id].example === '' && value.example !== '') target.pain[id].example = value.example
  }
  for (const key of Object.keys(target.signals)) {
    target.signals[key] += source.signals[key] ?? 0
  }
  target.sessions.push(...source.sessions)
  for (const [project, count] of source.projects) {
    target.projects.set(project, (target.projects.get(project) ?? 0) + count)
  }
  for (const [workspace, count] of source.workspaces) {
    target.workspaces.set(workspace, (target.workspaces.get(workspace) ?? 0) + count)
  }
  if (source.firstEventAt !== null) {
    target.firstEventAt = target.firstEventAt === null
      ? source.firstEventAt
      : Math.min(target.firstEventAt, source.firstEventAt)
  }
  if (source.lastEventAt !== null) {
    target.lastEventAt = target.lastEventAt === null
      ? source.lastEventAt
      : Math.max(target.lastEventAt, source.lastEventAt)
  }
}

/** CLI-oriented helper: exclude machine-authored workspace names. */
export function compactSessionName(file) {
  return basename(file).replace(/^session-?/u, '').replace(/\.jsonl\.zstd$/u, '')
}
