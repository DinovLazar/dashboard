import { describe, expect, it } from 'vitest'

import { draftId, isValidDocId, normalizePostId } from './doc-id'

/**
 * B.05 — document-id sanitization. The server only ever accepts a bare logical
 * id; any `drafts.` / `versions.<release>.` prefix a caller submits is stripped,
 * and anything that is not a plain id is rejected. Defense in depth on the write
 * path (the project/token still come from the session).
 */

describe('isValidDocId', () => {
  it('accepts plain logical ids', () => {
    expect(isValidDocId('abc123')).toBe(true)
    expect(isValidDocId('a-b_c')).toBe(true)
    expect(isValidDocId('3f9c2a10-0000-4000-8000-000000000000')).toBe(true)
  })

  it('rejects empty, prefixed, dotted, or funny ids', () => {
    expect(isValidDocId('')).toBe(false)
    expect(isValidDocId('drafts.abc')).toBe(false)
    expect(isValidDocId('a.b')).toBe(false)
    expect(isValidDocId('a b')).toBe(false)
    expect(isValidDocId('a/b')).toBe(false)
    expect(isValidDocId('a"]{')).toBe(false)
    expect(isValidDocId(42)).toBe(false)
    expect(isValidDocId(null)).toBe(false)
  })
})

describe('normalizePostId', () => {
  it('returns a plain id unchanged', () => {
    expect(normalizePostId('post-1')).toBe('post-1')
  })

  it('strips a drafts. prefix', () => {
    expect(normalizePostId('drafts.post-1')).toBe('post-1')
  })

  it('strips a versions.<releaseId>. prefix', () => {
    expect(normalizePostId('versions.rABC.post-1')).toBe('post-1')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizePostId('  post-1  ')).toBe('post-1')
  })

  it('throws on an id that is empty or invalid after stripping', () => {
    expect(() => normalizePostId('')).toThrow()
    expect(() => normalizePostId('drafts.')).toThrow()
    expect(() => normalizePostId('versions.rABC.')).toThrow()
    // A doubly-prefixed / path-y id never reduces to a plain id in one strip.
    expect(() => normalizePostId('drafts.drafts.x')).toThrow()
    expect(() => normalizePostId('a/b')).toThrow()
    expect(() => normalizePostId('* | *[_type=="secret"]')).toThrow()
  })

  it('throws on a non-string', () => {
    expect(() => normalizePostId(undefined)).toThrow()
    expect(() => normalizePostId(123)).toThrow()
  })
})

describe('draftId', () => {
  it('prefixes a logical id', () => {
    expect(draftId('post-1')).toBe('drafts.post-1')
  })
})
