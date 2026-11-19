import assert from 'node:assert/strict'
import test from 'node:test'
import { finalizeProfile, buildProfileFromSessionRecords } from '../src/profile.js'
import { fixtureRecords } from './helpers.js'

test('profile uses real user messages and failures, not runtime context', () => {
  const { state } = buildProfileFromSessionRecords(fixtureRecords(), {
    now: 1794100000000,
    workspace: '--E-programs-fixture-plugin--',
  })
  const profile = finalizeProfile(state)
  assert.equal(profile.signals.userMessages, 1)
  assert.equal(profile.signals.assistantMessages, 1)
  assert.equal(profile.signals.toolCalls, 2)
  assert.ok(profile.signals.toolErrors >= 2)
  assert.ok(profile.painPoints.some(item => item.id === 'network'))
  assert.ok(profile.painPoints.some(item => item.id === 'shell'))
  assert.ok(profile.interests.some(item => item.id === 'memory'))
  assert.ok(profile.interests.some(item => item.id === 'market'))
  assert.equal('content' in profile, false)
  assert.equal(JSON.stringify(profile).includes('不要统计我'), false)
})

test('profile output is bounded and deterministic', () => {
  const { state } = buildProfileFromSessionRecords(fixtureRecords(), {
    now: 1794100000000,
    workspace: '--E-programs-fixture-plugin--',
  })
  const first = finalizeProfile(state)
  const second = finalizeProfile(state)
  assert.deepEqual(first, second)
  assert.ok(Object.keys(first.terms).length <= 700)
  assert.ok(first.interests.length <= 7)
})
