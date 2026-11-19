import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'

export function fixtureRecords(prompt = '我想做一个 DSH 插件市场，并且加入长期记忆、上下文压缩和网页抓取能力。') {
  return [
    {
      type: 'session',
      version: 4,
      id: 'session-fixture',
      createdAt: 1794000000000,
      cwd: 'E:\\programs\\fixture-plugin',
    },
    { type: 'session/title', seq: 1, time: 1794000001000, data: { title: 'DSH 插件市场与长期记忆' } },
    {
      type: 'user/message',
      seq: 2,
      time: 1794000002000,
      data: {
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: prompt }],
      },
    },
    {
      type: 'user/message',
      seq: 3,
      time: 1794000002100,
      data: {
        role: 'user',
        source: { kind: 'runtime-context' },
        content: [{ type: 'text', text: 'Current DSH file policy: workspace-write. 插件市场 记忆 不要统计我。' }],
      },
    },
    {
      type: 'assistant/message',
      seq: 4,
      time: 1794000003000,
      data: {
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: '可以先检查网页抓取能力，再把插件目录做成 Feed。' }],
        },
      },
    },
    {
      type: 'tool/call',
      seq: 5,
      time: 1794000004000,
      data: { callId: 'call-1', name: 'web_fetch', arguments: '{}' },
    },
    {
      type: 'tool/result',
      seq: 6,
      time: 1794000005000,
      data: {
        toolCallId: 'call-1',
        message: {
          role: 'tool',
          isError: true,
          content: [{ type: 'text', text: 'fetch failed: ENOTFOUND catalog.example.com network timeout' }],
        },
      },
    },
    {
      type: 'tool/call',
      seq: 7,
      time: 1794000006000,
      data: { callId: 'call-2', name: 'pwsh', arguments: '{}' },
    },
    {
      type: 'tool/result',
      seq: 8,
      time: 1794000007000,
      data: {
        toolCallId: 'call-2',
        message: {
          role: 'tool',
          isError: false,
          content: [{ type: 'text', text: 'bad command\n[exit code: 1]' }],
        },
      },
    },
  ]
}

export function writeSession(root, workspace, sessionId, records) {
  const dir = join(root, workspace, sessionId)
  mkdirSync(dir, { recursive: true })
  const text = records.map(record => JSON.stringify(record)).join('\n') + '\n'
  writeFileSync(join(dir, 'session.v4.jsonl.zstd'), zstdCompressSync(Buffer.from(text)))
}

export function catalogFixture() {
  return {
    format: 1,
    metadata: {
      categories: {
        memory: { title: { zh: '记忆与知识库' } },
        browser: { title: { zh: '浏览器与网页' } },
        fun: { title: { zh: '娱乐与桌面玩法' } },
        market: { title: { zh: '插件市场与管理' } },
      },
    },
    plugins: [
      {
        name: 'dsh-memory-index',
        title: 'owner/dsh-memory-index',
        description: { zh: '长期记忆与知识库检索，自动索引上下文。', en: 'Long-term memory.' },
        homepage: 'https://example.com/memory',
        repository: { url: 'https://github.com/owner/dsh-memory-index' },
        metadata: { category: 'memory', keywords: ['记忆', '知识库'] },
        versions: [{ version: '1.0.0', publishTimestamp: Math.floor(Date.now() / 1000), source: { type: 'npm' } }],
      },
      {
        name: 'dsh-web-retry',
        title: 'owner/dsh-web-retry',
        description: { zh: '增强网页抓取、网络重试和超时恢复。', en: 'Web fetch reliability.' },
        homepage: 'https://example.com/web',
        repository: { url: 'https://github.com/owner/dsh-web-retry' },
        metadata: { category: 'browser', keywords: ['网页', '网络'] },
        versions: [{ version: '1.0.0', publishTimestamp: Math.floor(Date.now() / 1000), source: { type: 'npm' } }],
      },
      {
        name: 'dsh-fun-pet',
        title: 'owner/dsh-fun-pet',
        description: { zh: '桌面宠物和游戏化动画。', en: 'A desktop pet.' },
        homepage: 'https://example.com/pet',
        repository: { url: 'https://github.com/owner/dsh-fun-pet' },
        metadata: { category: 'fun', keywords: ['桌宠'] },
        versions: [{ version: '1.0.0', publishTimestamp: Math.floor(Date.now() / 1000), source: { type: 'npm' } }],
      },
      {
        name: 'dsh-installed',
        title: 'owner/dsh-installed',
        description: { zh: '已经安装的插件。', en: 'Already installed.' },
        homepage: 'https://example.com/installed',
        repository: { url: 'https://github.com/owner/dsh-installed' },
        metadata: { category: 'market', keywords: ['插件'] },
        versions: [{ version: '1.0.0', publishTimestamp: Math.floor(Date.now() / 1000), source: { type: 'npm' } }],
      },
      {
        name: 'dsh-future-only',
        title: 'owner/dsh-future-only',
        description: { zh: '需要更新版本 DSH 的插件。', en: 'Requires a newer DSH.' },
        homepage: 'https://example.com/future',
        repository: { url: 'https://github.com/owner/dsh-future-only' },
        metadata: { category: 'market', keywords: ['插件'] },
        versions: [{
          version: '1.0.0',
          publishTimestamp: Math.floor(Date.now() / 1000),
          source: { type: 'npm' },
          engines: { dsh: '>=0.2.1-rc.2 <0.3.0' },
        }],
      },
    ],
  }
}

export function fakeContext() {
  const ctx = {
    services: new Map(),
    routes: new Map(),
    effects: [],
    get(service) {
      return ctx.services.get(service)
    },
    inject(names, callback) {
      for (const name of names) {
        if (!ctx.services.has(name)) throw new Error(`missing service ${name}`)
      }
      const dispose = callback(ctx)
      if (typeof dispose === 'function') ctx.effects.push(dispose)
    },
    effect(factory) {
      const dispose = factory()
      if (typeof dispose === 'function') ctx.effects.push(dispose)
    },
  }
  ctx.services.set('webServer', {
    register(route) {
      ctx.routes.set(route.path, route)
      return () => ctx.routes.delete(route.path)
    },
  })
  return ctx
}

export function callRoute(route, url, options = {}) {
  return new Promise(resolve => {
    const chunks = []
    const body = options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body))]
    const request = {
      method: options.method ?? 'GET',
      url,
      headers: options.headers ?? {},
      async *[Symbol.asyncIterator]() {
        yield* body
      },
    }
    const response = {
      status: 0,
      headers: {},
      headersSent: false,
      writeHead(status, headers) {
        this.status = status
        this.headers = headers ?? {}
        this.headersSent = true
      },
      end(value) {
        if (value !== undefined) chunks.push(String(value))
        resolve({
          status: this.status,
          headers: this.headers,
          body: chunks.join(''),
        })
      },
    }
    Promise.resolve(route.handler(request, response)).catch(error => {
      resolve({ status: 500, headers: {}, body: String(error) })
    })
  })
}
