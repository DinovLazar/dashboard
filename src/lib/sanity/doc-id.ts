/**
 * Sanity document-id normalization (B.05) — a security-relevant helper, kept in
 * one place so the read path, the write path, and the Server Actions all sanitize
 * an incoming post id identically.
 *
 * A logical post is addressed by its **published** id. Sanity exposes variants by
 * prefixing it: a draft is `drafts.<id>`, a Content Release version is
 * `versions.<releaseId>.<id>`. The server ALWAYS derives those prefixes itself —
 * a caller (a URL param, a hidden form field, a direct POST) may only ever supply
 * the bare logical id. This module strips any prefix a caller submits and rejects
 * anything that is not a plain id, so an attacker cannot smuggle a different
 * target through the id (e.g. force a write at a `versions.` path).
 *
 * Note: defense in depth, not the primary isolation control. The token/project
 * are resolved from the session, so an arbitrary id can at most address a doc in
 * the caller's OWN dataset (see `isolation.test.ts`). Pure logic, no secret.
 */

const DRAFTS_PREFIX = 'drafts.'
const VERSIONS_PREFIX = 'versions.'

/** A bare logical id: letters, digits, underscore, dash. No dots (those mark a
 *  prefix), no path separators, no whitespace. Bounded length. */
const VALID_DOC_ID = /^[A-Za-z0-9_-]+$/

/** True when `id` is a plain logical document id (no prefix, no funny business). */
export function isValidDocId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 200 &&
    VALID_DOC_ID.test(id)
  )
}

/**
 * Reduce any caller-supplied id to its bare logical id, throwing if what remains
 * is not a valid plain id. Strips a single `drafts.` prefix or a
 * `versions.<releaseId>.` prefix; the server re-derives the variant it needs.
 */
export function normalizePostId(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('Invalid post id')
  }

  let id = raw.trim()

  if (id.startsWith(DRAFTS_PREFIX)) {
    id = id.slice(DRAFTS_PREFIX.length)
  } else if (id.startsWith(VERSIONS_PREFIX)) {
    // versions.<releaseId>.<logicalId> — drop the prefix and the release segment.
    const afterPrefix = id.slice(VERSIONS_PREFIX.length)
    const firstDot = afterPrefix.indexOf('.')
    id = firstDot === -1 ? '' : afterPrefix.slice(firstDot + 1)
  }

  if (!isValidDocId(id)) {
    throw new Error('Invalid post id')
  }
  return id
}

/** The `drafts.`-prefixed id for a (already-normalized) logical id. */
export function draftId(logicalId: string): string {
  return `${DRAFTS_PREFIX}${logicalId}`
}
