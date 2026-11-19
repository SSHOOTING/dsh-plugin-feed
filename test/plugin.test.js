import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply, FEED_PATH, FEEDBACK_PATH } from '../src/index.js'
import { callRoute, catalogFixture, fakeContext, fixtureRecords, writeSession } from './helpers.js'

test('host registers feed routes and serves a personalized feed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugin-feed-test-'))
  try {
    const sessionsRoot = join(dir, 'sessions')
    const profileDir = join(dir, 'profile')
    mkdirSync(profileDir, { recursive: true })
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
      dependencies: { 'dsh-installed': '1.0.0' },
      dsh: { profile: { bundles: ['dsh-installed'] } },
    }))
    const seedPath = join(dir, 'catalog.json')
    writeFileSync(seedPath, JSON.stringify(catalogFixture()))
    writeSession(sessionsRoot, '--E-programs-fixture-plugin--', 'session-fixture', fixtureRecords())

    const ctx = fakeContext()
    apply(ctx, {
      sessionsRoot,
      profileDir,
      catalogSeedPath: seedPath,
      catalogCachePath: join(dir, 'catalog-cache.json'),
      feedbackPath: join(dir, 'feedback.json'),
      catalogUrl: 'http://127.0.0.1:9/unreachable',
      maxSessions: 10,
      feedSize: 8,
      prewarmDelayMs: 100000,
    })
    assert.ok(ctx.routes.has(FEED_PATH))
    assert.ok(ctx.routes.has(FEEDBACK_PATH))

    const response = await callRoute(ctx.routes.get(FEED_PATH), `${FEED_PATH}?days=0&limit=8`)
    assert.equal(response.status, 200)
    const feed = JSON.parse(response.body)
    assert.equal(feed.scan.sessions, 1)
    assert.equal(feed.signals.userMessages, 1)
    assert.ok(feed.items.length >= 2)
    assert.equal(feed.items.some(item => item.name === 'dsh-installed'), false)

    const dismissedName = feed.items[0].name
    const post = await callRoute(ctx.routes.get(FEEDBACK_PATH), FEEDBACK_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: '127.0.0.1:3080' },
      body: { name: dismissedName, action: 'dismiss' },
    })
    assert.equal(post.status, 200)
    assert.ok(JSON.parse(post.body).dismissed.includes(dismissedName))

    const refreshed = await callRoute(ctx.routes.get(FEED_PATH), `${FEED_PATH}?refresh=1&days=0&limit=8`)
    assert.equal(refreshed.status, 200)
    assert.equal(JSON.parse(refreshed.body).items.some(item => item.name === dismissedName), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('feedback route rejects cross-origin requests', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugin-feed-origin-'))
  try {
    const seedPath = join(dir, 'catalog.json')
    writeFileSync(seedPath, JSON.stringify(catalogFixture()))
    const ctx = fakeContext()
    apply(ctx, {
      sessionsRoot: dir,
      profileDir: dir,
      catalogSeedPath: seedPath,
      catalogCachePath: join(dir, 'cache.json'),
      feedbackPath: join(dir, 'feedback.json'),
      prewarmDelayMs: 100000,
    })
    const response = await callRoute(ctx.routes.get(FEEDBACK_PATH), FEEDBACK_PATH, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: '127.0.0.1:3080',
        origin: 'https://evil.example',
      },
      body: { name: 'dsh-memory-index', action: 'save' },
    })
    assert.equal(response.status, 403)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
