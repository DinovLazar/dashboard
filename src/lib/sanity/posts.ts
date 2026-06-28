import 'server-only'

import { buildPostByIdQuery, buildPostListQuery } from '@/lib/config/field-map'
import { fromFieldValue, fromLocalizedRaw, localeList } from '@/lib/config/localize'
import { isEditableBody, portableTextToText } from '@/lib/config/portable-text'
import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { createTenantSanityClient } from './client'
import { draftId, normalizePostId } from './doc-id'

/**
 * The read path (B.04): list one tenant's blog posts.
 *
 * Reads with `perspective: 'raw'` (see `./client`), which returns each post's
 * published and `drafts.`-prefixed variants as separate entries, then reduces
 * them to one {@link PostSummary} per logical post with a real draft/published
 * status. No write of any kind happens here. The decrypted token lives only on
 * `tenant.token`; it is never returned, logged, or passed onward.
 */

/** One logical post, ready for the list UI. */
export interface PostSummary {
  /** The base (published) document id — stable across draft/published. */
  id: string
  /** Display title (always present; falls back to "Untitled"). */
  title: string
  /** Display excerpt, or null if the client has none. */
  excerpt: string | null
  /** Display slug, or null. */
  slug: string | null
  /** Whether a published version exists. */
  status: 'draft' | 'published'
  /** True when a published post also has an in-progress draft (unpublished edits). */
  hasUnpublishedEdits: boolean
  /** ISO timestamp of the working copy (`_updatedAt`). */
  updatedAt: string
}

/**
 * One logical post loaded for the edit form. Field values are per-locale maps
 * (single-locale clients have one entry) so the editor can bind a tab per
 * language. `body` is plain text (converted from Portable Text); `slug` is a
 * single string (slugs are not localized). The token is never part of this.
 */
export interface PostDetail {
  /** The base (published) logical id — what the editor submits back. */
  id: string
  /** Per-locale essential values for the form. */
  fields: {
    title: Record<string, string>
    excerpt: Record<string, string>
    /** Per-locale plain-text body (Portable Text reduced to paragraphs). */
    body: Record<string, string>
    /** The current slug, or "" if none. Not localized. */
    slug: string
  }
  status: 'draft' | 'published'
  hasUnpublishedEdits: boolean
  updatedAt: string
  /**
   * The currently-attached featured image (B.06), so the edit form can show it.
   * `assetId` is the Sanity asset reference; `url` is a public `cdn.sanity.io`
   * URL (neither is a secret). Both are null when the post has no image.
   */
  image: { assetId: string | null; url: string | null }
  /**
   * False when the stored body is richer than simple paragraphs (marks, links,
   * headings, lists, embeds): the editor then shows it read-only so a plain-text
   * save can never silently strip the client's rich content. See
   * `lib/config/portable-text`.
   */
  bodyEditable: boolean
}

/**
 * The minimal transport this module needs — matches `@sanity/client`'s `fetch`.
 * Injectable so the read path can be tested without any network.
 */
export interface SanityReader {
  fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>
}

/** One raw variant as returned by the list query. */
interface RawPostDoc {
  _id: string
  _updatedAt: string
  title?: unknown
  excerpt?: unknown
  slug?: unknown
}

const DRAFTS_PREFIX = 'drafts.'
const VERSIONS_PREFIX = 'versions.'

/**
 * Coerce a raw field value to a display string. A plain string passes through;
 * a localized object (e.g. `{ en, mk }`) yields its first locale value — so the
 * same code serves the plain-string test client now and localized real clients
 * later (full localized rendering is finalized in M.01/B.05). Returns null when
 * there is no usable string. Sanity system keys (`_type`, `_key`, …) are skipped
 * so a localized wrapper's `_type` is never mistaken for content.
 */
export function displayValue(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      if (key.startsWith('_')) continue
      if (typeof val === 'string') return val
    }
  }
  return null
}

/**
 * List the resolved tenant's posts, newest first.
 *
 * `makeClient` is injectable (defaults to the real per-tenant factory) so the
 * isolation test can substitute a recording stub. The factory is constructed
 * with the tenant's own project + token — there is no other input.
 */
export async function listPosts(
  tenant: TenantContext,
  makeClient: (config: TenantConfig, token: string) => SanityReader = createTenantSanityClient,
): Promise<PostSummary[]> {
  const reader = makeClient(tenant.config, tenant.token)
  const docs = await reader.fetch<RawPostDoc[]>(
    buildPostListQuery(tenant.config),
    { type: tenant.config.blogDocType },
  )

  // Group raw variants by logical id. Ignore Content Releases (`versions.*`).
  const variants = new Map<
    string,
    { published?: RawPostDoc; draft?: RawPostDoc }
  >()
  for (const doc of docs ?? []) {
    const id = doc?._id
    if (typeof id !== 'string' || id.startsWith(VERSIONS_PREFIX)) continue

    const isDraft = id.startsWith(DRAFTS_PREFIX)
    const logicalId = isDraft ? id.slice(DRAFTS_PREFIX.length) : id

    const entry = variants.get(logicalId) ?? {}
    if (isDraft) entry.draft = doc
    else entry.published = doc
    variants.set(logicalId, entry)
  }

  const posts: PostSummary[] = []
  for (const [logicalId, { published, draft }] of variants) {
    // Prefer the draft variant (the working copy) for displayed values + time.
    const source = draft ?? published
    if (!source) continue

    posts.push({
      id: logicalId,
      title: displayValue(source.title) ?? 'Untitled',
      excerpt: displayValue(source.excerpt),
      slug: displayValue(source.slug),
      status: published ? 'published' : 'draft',
      hasUnpublishedEdits: Boolean(published && draft),
      updatedAt: source._updatedAt,
    })
  }

  // Newest first by _updatedAt (ISO strings sort lexicographically by time).
  posts.sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  )

  return posts
}

/**
 * One raw variant as returned by the single-post query (adds the body field and
 * the projected featured-image asset id + public CDN url).
 */
interface RawPostDetailDoc extends RawPostDoc {
  body?: unknown
  imageAssetId?: unknown
  imageUrl?: unknown
}

/** Coerce a projected value to a string, or null when it isn't a usable string. */
function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

/**
 * Load ONE post for the edit form, or `null` if it does not exist (or the id is
 * not a valid plain id — a junk URL becomes a friendly not-found).
 *
 * Mirrors `listPosts`: builds the per-tenant client from the tenant's own
 * project + token (the only input; `makeClient` is injectable for offline tests),
 * fetches both variants with `buildPostByIdQuery` (`$id`/`$draftId` bound as
 * parameters), and reduces them to one editable working copy — the draft is
 * preferred, exactly as the list does. Field values come back per-locale; the
 * body is reduced to plain text with a `bodyEditable` flag guarding rich content.
 * The token is never returned or logged.
 */
export async function getPost(
  tenant: TenantContext,
  rawId: string,
  makeClient: (config: TenantConfig, token: string) => SanityReader = createTenantSanityClient,
): Promise<PostDetail | null> {
  let id: string
  try {
    // The server derives `drafts.<id>` itself; strip any prefix a caller submits.
    id = normalizePostId(rawId)
  } catch {
    return null
  }
  const draft = draftId(id)

  const reader = makeClient(tenant.config, tenant.token)
  const docs = await reader.fetch<RawPostDetailDoc[]>(
    buildPostByIdQuery(tenant.config),
    { id, draftId: draft },
  )

  let published: RawPostDetailDoc | undefined
  let draftDoc: RawPostDetailDoc | undefined
  for (const doc of docs ?? []) {
    if (doc?._id === draft) draftDoc = doc
    else if (doc?._id === id) published = doc
  }

  // Prefer the draft (the working copy), exactly like the list reduction.
  const source = draftDoc ?? published
  if (!source) return null

  // Body: split the raw value per locale, convert each to plain text, and flag
  // the whole post not-editable if ANY locale's body is richer than paragraphs.
  const rawBody = fromLocalizedRaw(tenant.config, source.body)
  const body: Record<string, string> = {}
  let bodyEditable = true
  for (const loc of localeList(tenant.config)) {
    const raw = rawBody[loc]
    if (!isEditableBody(raw)) bodyEditable = false
    body[loc] = portableTextToText(raw)
  }

  return {
    id,
    fields: {
      title: fromFieldValue(tenant.config, source.title),
      excerpt: fromFieldValue(tenant.config, source.excerpt),
      body,
      slug: displayValue(source.slug) ?? '',
    },
    status: published ? 'published' : 'draft',
    hasUnpublishedEdits: Boolean(published && draftDoc),
    updatedAt: source._updatedAt,
    image: {
      assetId: asStringOrNull(source.imageAssetId),
      url: asStringOrNull(source.imageUrl),
    },
    bodyEditable,
  }
}
