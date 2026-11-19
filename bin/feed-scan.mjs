#!/usr/bin/env node
import { CatalogStore } from '../src/catalog.js'
import { scanUserHistory } from '../src/profile.js'
import { rankPlugins } from '../src/recommender.js'
import { readInstalledPlugins, resolveHostVersion, resolveProfileDir } from '../src/session-store.js'

function parseArgs(argv) {
  const out = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) out[key] = true
    else {
      out[key] = value
      index += 1
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const days = Number(args.days ?? 0)
const limit = Number(args.limit ?? 12)
const sessionsRoot = typeof args['sessions-root'] === 'string' ? args['sessions-root'] : undefined
const profileDir = resolveProfileDir(typeof args['profile-dir'] === 'string' ? args['profile-dir'] : undefined)
const profile = await scanUserHistory({
  sessionsRoot,
  windowDays: Number.isFinite(days) ? days : 0,
  maxSessions: 0,
})
const catalog = await new CatalogStore().ensure({ refresh: args.refresh === true })
const installed = readInstalledPlugins(profileDir)
const hostVersion = resolveHostVersion(profileDir)
const items = rankPlugins({
  catalog,
  profile,
  installed: installed.names,
  feedback: { saved: [], dismissed: [] },
  limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
  profileName: process.env.DSH_PROFILE ?? 'web',
  hostVersion,
  seed: 'cli',
})

if (args.json === true) {
  console.log(JSON.stringify({ profile, items }, null, 2))
} else {
  console.log(`sessions=${profile.signals.sessions} messages=${profile.signals.userMessages} tools=${profile.signals.toolCalls} errors=${profile.signals.toolErrors}`)
  console.log(`interests: ${profile.interests.map(item => `${item.label}(${Math.round(item.score * 100)}%)`).join(' · ') || '-'}`)
  console.log(`pain: ${profile.painPoints.map(item => `${item.label} x${item.count}`).join(' · ') || '-'}`)
  console.log('')
  for (const item of items) {
    console.log(`${String(item.rank).padStart(2, ' ')}. ${item.name}  [${item.match}]  ${item.categoryLabel}`)
    console.log(`    ${item.reasons.map(reason => reason.text).join(' / ')}`)
  }
}
