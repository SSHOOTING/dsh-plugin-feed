/**
 * Small local preference store for saved and dismissed plugin cards.
 *
 * The store deliberately holds plugin identities only. Conversation text and
 * derived term weights are not persisted here.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ACTIONS = new Set(['save', 'unsave', 'dismiss', 'undismiss'])

function emptyState() {
  return {
    version: 1,
    updatedAt: 0,
    users: {},
  }
}

function emptyUser() {
  return {
    saved: {},
    dismissed: {},
  }
}

export class FeedbackStore {
  constructor(path) {
    this.path = path
    this.state = this.read()
  }

  read() {
    try {
      if (!existsSync(this.path)) return emptyState()
      const parsed = JSON.parse(readFileSync(this.path, 'utf8'))
      if (parsed?.version !== 1 || typeof parsed.users !== 'object') return emptyState()
      return parsed
    } catch {
      return emptyState()
    }
  }

  write() {
    mkdirSync(dirname(this.path), { recursive: true })
    const temp = `${this.path}.tmp-${process.pid}-${Date.now()}`
    writeFileSync(temp, JSON.stringify(this.state, null, 2), 'utf8')
    renameSync(temp, this.path)
  }

  user(userId) {
    const id = String(userId ?? 'local-first-user')
    const current = this.state.users[id]
    if (current === undefined) return emptyUser()
    return {
      saved: current.saved !== null && typeof current.saved === 'object' ? current.saved : {},
      dismissed: current.dismissed !== null && typeof current.dismissed === 'object' ? current.dismissed : {},
    }
  }

  snapshot(userId) {
    const user = this.user(userId)
    return {
      saved: Object.keys(user.saved),
      dismissed: Object.keys(user.dismissed),
      updatedAt: this.state.updatedAt,
    }
  }

  apply(userId, action, pluginName) {
    const id = String(userId ?? 'local-first-user')
    const name = String(pluginName ?? '').trim()
    if (!ACTIONS.has(action)) throw new Error(`unknown feedback action: ${action}`)
    if (name === '' || name.length > 300) throw new Error('invalid plugin name')
    const users = this.state.users
    const user = users[id] ?? emptyUser()
    const now = new Date().toISOString()
    if (action === 'save') user.saved[name] = now
    if (action === 'unsave') delete user.saved[name]
    if (action === 'dismiss') {
      user.dismissed[name] = now
      delete user.saved[name]
    }
    if (action === 'undismiss') delete user.dismissed[name]
    users[id] = user
    this.state.updatedAt = Date.now()
    this.write()
    return this.snapshot(id)
  }
}

export function normalizeFeedbackAction(value) {
  const action = String(value ?? '').toLowerCase()
  return ACTIONS.has(action) ? action : null
}
