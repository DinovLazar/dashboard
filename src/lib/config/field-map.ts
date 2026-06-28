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

/**
 * Builds the GROQ used to load ONE post for the edit form. Both ids are bound
 * **parameters** (`$id`, `$draftId`) — never interpolated, so an attacker-shaped
 * id can never escape into the query. With `perspective: 'raw'` this returns the
 * published variant and/or its `drafts.`-prefixed working copy as separate
 * entries; the read path reduces them to one editable copy (draft preferred).
 *
 * Unlike the list query, this also projects the `body` field and the featured
 * image (the editor needs both). The image is a flat field name, like `title`;
 * its asset id and a public CDN url are projected so the edit form can show an
 * already-attached image. All five interpolated field names are validated first.
 */
export function buildPostByIdQuery(config: TenantConfig): string {
  const { title, excerpt, slug, body, image } = config.fieldMap
  assertSafeFieldPath(title)
  assertSafeFieldPath(excerpt)
  assertSafeFieldPath(slug)
  assertSafeFieldPath(body)
  assertSafeFieldPath(image)

  return (
    `*[_id == $id || _id == $draftId]{` +
    `_id,` +
    `_updatedAt,` +
    `"title": ${title},` +
    `"excerpt": ${excerpt},` +
    `"slug": ${slug},` +
    `"body": ${body},` +
    `"imageAssetId": ${image}.asset._ref,` +
    `"imageUrl": ${image}.asset->url` +
    `}`
  )
}

/**
 * Validates the field names used as **mutation object keys** (`title`, `body`,
 * `excerpt`, `image`). Defense in depth: a write builds a Sanity document whose
 * keys come from the registry `field_map`, so a malformed row must never be able
 * to inject an unexpected mutation key. These v1 essentials are flat top-level
 * fields (the slug is handled separately via {@link slugContainerField}).
 */
export function assertWritableFieldPaths(config: TenantConfig): void {
  const { title, body, excerpt, image } = config.fieldMap
  assertSafeFieldPath(title)
  assertSafeFieldPath(body)
  assertSafeFieldPath(excerpt)
  assertSafeFieldPath(image)
}

/**
 * Derives the **container** field a write must target for the slug. Reads project
 * the full path (`fieldMap.slug`, e.g. `slug.current`), but a write sets the
 * whole slug object (`{ _type: 'slug', current }`) on its container field — the
 * segment before the first `.` (`slug.current` → `slug`; a bare `slug` → `slug`).
 * The derived container is validated before it is ever used as a mutation key.
 */
export function slugContainerField(config: TenantConfig): string {
  const container = config.fieldMap.slug.split('.')[0]
  assertSafeFieldPath(container)
  return container
}
