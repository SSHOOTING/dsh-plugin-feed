import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeCatalog } from '../src/catalog.js'
import { catalogFixture } from './helpers.js'

test('catalog normalization supports format-1 index shape', () => {
  const catalog = normalizeCatalog(catalogFixture(), { source: 'fixture' })
  assert.equal(catalog.items.length, 5)
  assert.equal(catalog.meta.count, 5)
  assert.equal(catalog.items[0].category, 'memory')
  assert.equal(catalog.items[0].description, '长期记忆与知识库检索，自动索引上下文。')
  assert.ok(catalog.items[0].tokens.includes('记忆'))
  assert.equal(catalog.items[0].categoryLabel, '记忆与知识库')
  assert.equal(catalog.items.at(-1).enginesDsh, '>=0.2.1-rc.2 <0.3.0')
})
