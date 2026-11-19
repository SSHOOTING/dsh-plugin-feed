/**
 * The tiny subset of semver needed for catalog `engines.dsh` declarations.
 * Invalid ranges are treated as "unknown" and therefore not used to hide an
 * item; only a range we understand can produce a hard filter.
 */
function parse(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(String(version ?? '').trim())
  if (match === null) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  }
}

function compareIdentifier(a, b) {
  const aNumber = /^\d+$/u.test(a)
  const bNumber = /^\d+$/u.test(b)
  if (aNumber && bNumber) return Number(a) - Number(b)
  if (aNumber) return -1
  if (bNumber) return 1
  return a.localeCompare(b)
}

export function compareVersions(left, right) {
  const a = parse(left)
  const b = parse(right)
  if (a === null || b === null) return null
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] - b[key]
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (a.prerelease[index] === undefined) return -1
    if (b.prerelease[index] === undefined) return 1
    const compared = compareIdentifier(a.prerelease[index], b.prerelease[index])
    if (compared !== 0) return compared
  }
  return 0
}

function satisfiesComparator(version, comparator) {
  const match = /^(>=|<=|>|<|=)?\s*(.+)$/u.exec(comparator)
  if (match === null) return null
  const operator = match[1] ?? '='
  const target = match[2].trim()
  if (target === '*' || target === 'x' || target === 'latest') return true
  if (target.startsWith('^') || target.startsWith('~')) {
    const base = parse(target.slice(1))
    const current = parse(version)
    if (base === null || current === null) return null
    if (compareVersions(version, target.slice(1)) < 0) return false
    if (target.startsWith('~')) {
      return current.major === base.major && current.minor === base.minor
    }
    if (base.major > 0) return current.major === base.major
    if (base.minor > 0) return current.major === 0 && current.minor === base.minor
    return current.major === 0 && current.minor === 0 && current.patch === base.patch
  }
  const compared = compareVersions(version, target)
  if (compared === null) return null
  if (operator === '>=') return compared >= 0
  if (operator === '>') return compared > 0
  if (operator === '<=') return compared <= 0
  if (operator === '<') return compared < 0
  return compared === 0
}

/**
 * @returns {boolean|null} true/false when understood, null when the range is
 * syntactically unsupported (do not filter on null).
 */
export function satisfiesRange(version, range) {
  if (typeof range !== 'string' || range.trim() === '') return true
  if (parse(version) === null) return null
  const clauses = range.split('||').map(value => value.trim()).filter(Boolean)
  if (clauses.length === 0) return true
  let sawUnknown = false
  for (const clause of clauses) {
    const comparators = clause
      .replace(/\s+-\s+/gu, ' - ')
      .split(/\s+/u)
      .filter(Boolean)
    const results = comparators.map(comparator => satisfiesComparator(version, comparator))
    if (results.every(value => value === true)) return true
    if (results.some(value => value === null)) sawUnknown = true
  }
  return sawUnknown ? null : false
}
