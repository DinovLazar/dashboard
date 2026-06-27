import type { TenantConfig } from '@/lib/registry/types'

/**
 * Field-map → GROQ helpers (B.04).
 *
 * The post-list query takes the document type as a **bound parameter** (`$type`,
 * never interpolated) and projects the client's own field names from the
 * (validated) config. Field-map values are operator-set and trusted, but they
 * are still validated by {@link assertSafeFieldPath} before any interpolation —
 * a cheap, defense-in-depth guard so a malformed registry row can never inject
 * GROQ. (This module has no secrets and is not `server-only`; it is pure logic
 * imported by the `server-only` read path.)
 */

/** A dotted field path: a leading identifier, then `.`-separated identifiers. */
const SAFE_FIELD_PATH = /^[A-Za-z_][A-Za-z0-9_.]*$/

/**
 * Throws unless `path` is a plain (optionally dotted) field path — e.g. `title`
 * or `slug.current`. Rejects anything with spaces, quotes, brackets, operators,
 * or other GROQ syntax that could escape a projection.
 */
export function assertSafeFieldPath(path: string): void {
  if (typeof path !== 'string' || !SAFE_FIELD_PATH.test(path)) {
    throw new Error(
      `Unsafe field path in client config: ${JSON.stringify(path)}. ` +
        'Field names must match /^[A-Za-z_][A-Za-z0-9_.]*$/ (e.g. "title" or ' +
        '"slug.current"). Fix the registry row for this client.',
    )
  }
}

/**
 * Builds the GROQ used to list a client's blog posts. `$type` is always a bound
 * parameter (passed at fetch time, never interpolated); the projected field
 * names come from the validated config. With `perspective: 'raw'` this returns
 * every variant of each post (published, `drafts.`-prefixed, and possibly
 * `versions.*`) as separate entries — the read path reduces them to one row per
 * logical post.
 */
export function buildPostListQuery(config: TenantConfig): string {
  const { title, excerpt, slug } = config.fieldMap
  assertSafeFieldPath(title)
  assertSafeFieldPath(excerpt)
  assertSafeFieldPath(slug)

  return (
    `*[_type == $type]{` +
    `_id,` +
    `_updatedAt,` +
    `"title": ${title},` +
    `"excerpt": ${excerpt},` +
    `"slug": ${slug}` +
    `}`
  )
}
