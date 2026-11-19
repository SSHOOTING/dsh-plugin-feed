import assert from 'node:assert/strict'
import test from 'node:test'
import { compareVersions, satisfiesRange } from '../src/semver.js'

test('compares DSH prerelease versions', () => {
  assert.ok(compareVersions('0.2.0-rc.2', '0.2.0') < 0)
  assert.ok(compareVersions('0.2.0-rc.10', '0.2.0-rc.2') > 0)
  assert.equal(compareVersions('0.2.0-rc.2', '0.2.0-rc.2'), 0)
})

test('understands catalog engines.dsh ranges', () => {
  assert.equal(satisfiesRange('0.2.0-rc.2', '>=0.2.0-rc.2 <0.3.0'), true)
  assert.equal(satisfiesRange('0.2.0-rc.2', '>=0.2.1-rc.2 <0.3.0'), false)
  assert.equal(satisfiesRange('0.2.0-rc.2', '>=0.2.0-0'), true)
  assert.equal(satisfiesRange('0.2.0-rc.2', 'nonsense range'), null)
})
