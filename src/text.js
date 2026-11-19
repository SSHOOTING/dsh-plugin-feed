const ASCII_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'could',
  'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'may', 'my', 'of', 'on', 'or', 'our', 'should', 'so', 'some',
  'than', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'would', 'you', 'your', 'user', 'use', 'using', 'used', 'new', 'one',
  'two', 'also', 'not', 'no', 'yes', 'very', 'more', 'most', 'all', 'any', 'just',
  'about', 'after', 'before', 'over', 'under', 'up', 'down', 'out', 'via', 'per',
])

const CJK_STOP_BIGRAMS = new Set([
  '一个', '一种', '一些', '这个', '那个', '这些', '那些', '什么', '怎么', '如何',
  '可以', '需要', '应该', '就是', '还是', '已经', '因为', '所以', '但是', '如果',
  '然后', '现在', '这里', '那里', '我们', '你们', '他们', '自己', '进行', '通过',
  '以及', '对于', '关于', '没有', '不是', '时候', '问题', '使用', '支持', '能够',
])

export function clip(value, max = 600) {
  const text = typeof value === 'string' ? value : String(value ?? '')
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export function messageText(data, options = {}) {
  const maxParts = Number.isSafeInteger(options.maxParts) ? options.maxParts : 8
  const maxChars = Number.isSafeInteger(options.maxChars) ? options.maxChars : 3000
  const content = data?.message?.content ?? data?.content
  if (!Array.isArray(content)) return ''
  const parts = []
  let used = 0
  for (const part of content) {
    if (part?.type !== 'text' || typeof part.text !== 'string') continue
    const remaining = maxChars - used
    if (remaining <= 0) break
    const text = part.text.slice(0, remaining)
    if (text.trim() === '') continue
    parts.push(text)
    used += text.length
    if (parts.length >= maxParts) break
  }
  return parts.join('\n').trim()
}

export function normalizeText(value) {
  return typeof value === 'string'
    ? value.toLowerCase().normalize('NFKC').replace(/\s+/gu, ' ').trim()
    : ''
}

/**
 * No language model or tokenizer dependency: ASCII words plus overlapping
 * Chinese character n-grams. Bigrams are the main unit; trigrams add enough
 * specificity for phrases such as "插件市场" or "上下文压缩".
 */
export function tokenize(value, options = {}) {
  const text = normalizeText(value)
  if (text === '') return []
  const out = []
  const seen = new Set()
  const maxTokens = Number.isSafeInteger(options.maxTokens) ? options.maxTokens : 1200

  for (const match of text.matchAll(/[a-z][a-z0-9_+.-]{1,}/gu)) {
    const word = match[0].replace(/^[.-]+|[.-]+$/gu, '')
    if (word.length < 2 || ASCII_STOPWORDS.has(word) || seen.has(word)) continue
    seen.add(word)
    out.push(word)
    if (out.length >= maxTokens) return out
  }

  for (const match of text.matchAll(/[\u3400-\u9fff]{2,}/gu)) {
    const chars = [...match[0]]
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index + size <= chars.length; index += 1) {
        const token = chars.slice(index, index + size).join('')
        if (CJK_STOP_BIGRAMS.has(token) || seen.has(token)) continue
        seen.add(token)
        out.push(token)
        if (out.length >= maxTokens) return out
      }
    }
  }
  return out
}

export function countOccurrences(haystack, needle) {
  if (typeof haystack !== 'string' || typeof needle !== 'string' || needle === '') return 0
  let count = 0
  let offset = 0
  for (;;) {
    const at = haystack.indexOf(needle, offset)
    if (at < 0) return count
    count += 1
    offset = at + needle.length
    if (count >= 4) return count
  }
}

export function titleCase(value) {
  return String(value ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function hashString(value) {
  let hash = 2166136261
  for (const char of String(value ?? '')) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
