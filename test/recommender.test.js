import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeCatalog } from '../src/catalog.js'
import { finalizeProfile, buildProfileFromSessionRecords } from '../src/profile.js'
import { rankPlugins } from '../src/recommender.js'
import { catalogFixture, fixtureRecords } from './helpers.js'

function ranked(options = {}) {
  const catalog = normalizeCatalog(catalogFixture(), { source: 'fixture' })
  const { state } = buildProfileFromSessionRecords(fixtureRecords(), {
    now: Date.now(),
    workspace: '--E-programs-fixture-plugin--',
  })
  const profile = finalizeProfile(state)
  return rankPlugins({
    catalog,
    profile,
    installed: ['dsh-installed'],
    feedback: { saved: [], dismissed: [] },
    limit: 10,
    profileName: 'web',
    seed: 'test',
    now: Date.now(),
    ...options,
  })
}

test('relevant categories outrank unrelated fun plugins', () => {
  const items = ranked()
  assert.equal(items.some(item => item.name === 'dsh-installed'), false)
  assert.equal(items.some(item => item.name === 'dsh-fun-pet'), true)
  const firstTwo = items.slice(0, 2).map(item => item.category)
  assert.ok(firstTwo.includes('memory'))
  assert.ok(firstTwo.includes('browser'))
  assert.ok(items[0].reasons.length > 0)
  assert.match(items[0].install, /^dsh plugin --profile web add /)
})

test('dismissed plugins are excluded', () => {
  const items = ranked({ feedback: { saved: [], dismissed: ['dsh-memory-index'] } })
  assert.equal(items.some(item => item.name === 'dsh-memory-index'), false)
})

test('plugins with a clearly incompatible DSH range are excluded', () => {
  const items = ranked({ hostVersion: '0.2.0-rc.2' })
  assert.equal(items.some(item => item.name === 'dsh-future-only'), false)
})
