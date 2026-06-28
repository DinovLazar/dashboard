import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  assertWritableFieldPaths,
  slugContainerField,
} from '@/lib/config/field-map'
import { localeList, toFieldValue } from '@/lib/config/localize'
import { textToPortableText } from '@/lib/config/portable-text'
import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { createTenantSanityClient } from './client'
import { draftId, normalizePostId } from './doc-id'

/**
 * The write path (B.05) — the ONLY place blog content is mutated.
 *
 * Every function takes a fully-resolved {@link TenantContext} (the caller must
 * have obtained it from `resolveTenant()`, which authenticates AND authorizes the
 * session owner) plus an injectable writer factory. The factory is built with the
 * tenant's OWN project + decrypted Editor token and nothing else — there is no
 * parameter by which a caller could target another tenant's project. The token
 * lives only on `tenant.token`; it is never returned, serialized, or logged.
 *
 * Draft/published state follows Sanity's draft-id model, consistent with the B.04
 * read reduction (it does NOT write a `status` field):
 *   - a **draft** is the document whose id is `drafts.<id>`;
 *   - **save-as-draft** writes `drafts.<id>` (a published-id write would publish
 *     instantly and break the status reduction);
 *   - **publish** promotes the draft to the published id and deletes the draft in
 *     one all-or-nothing transaction;
 *   - **delete** removes both variants in one transaction.
 *
 * `createOrReplace` replaces the WHOLE document, so edit/save does a
 * read-modify-write overlay (`{ ...current, ...essentials }`) to preserve the
 * client's non-essential fields (image, author, categories, FAQs, cross-links …).
 */

/** A document ready to write — must carry `_id` and `_type`. */
export interface MutationDoc {
  _id: string
  _type: string
  [key: string]: unknown
}

/** The mutation options we use (sync visibility so the caller can re-read). */
export interface MutationOptions {
  visibility?: 'sync' | 'async' | 'deferred'
}

/** A chained transaction — all-or-nothing on `commit`. */
export interface WriteTransaction {
  createOrReplace(doc: MutationDoc): WriteTransaction
  delete(id: string): WriteTransaction
  commit(options?: MutationOptions): Promise<unknown>
}

/**
 * The minimal write transport this module needs — a structural subset of
 * `@sanity/client`'s `SanityClient`. Injectable so the offline test can record
 * every dispatch (and the project + token each was built with) without a network.
 */
export interface SanityWriter {
  fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>
  createOrReplace(doc: MutationDoc, options?: MutationOptions): Promise<unknown>
  transaction(): WriteTransaction
}

/** Builds the per-tenant writer. Defaults to the real per-tenant Sanity client. */
export type MakeWriter = (config: TenantConfig, token: string) => SanityWriter

/** The essential field values the editor owns, in per-locale form. */
export interface EditorFields {
  /** Per-locale headline. */
  title: Record<string, string>
  /** Per-locale summary. */
  excerpt: Record<string, string>
  /** The slug, or null/empty to leave it unset (and, on save, preserved). */
  slug: string | null
  /**
   * Per-locale plain-text body. OMIT to preserve the stored body untouched
   * (used when the stored body is too rich to edit as plain text — never
   * silently strip it). Provide (even empty strings) to overwrite it.
   */
  body?: Record<string, string>
}

/** Re-read immediately after a write, so `/posts` reflects the change. */
const SYNC: MutationOptions = { visibility: 'sync' }

/** The default writer is the real per-tenant Sanity client (carries the token). */
const defaultMakeWriter: MakeWriter = (config, token) =>
  createTenantSanityClient(config, token)

/** Server-managed fields that must not be carried into a `createOrReplace`. */
const SYSTEM_FIELDS = new Set(['_id', '_rev', '_createdAt', '_updatedAt'])

/** A document as fetched back for the read-modify-write overlay. */
type FetchedDoc = Record<string, unknown> & { _id?: string; _type?: unknown }

/** Strip server-managed system fields, keeping all client content fields. */
function stripSystemFields(doc: FetchedDoc): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(doc)) {
    if (!SYSTEM_FIELDS.has(key)) out[key] = value
  }
  return out
}

/** The doc's own `_type` if present, else the configured blog doc type. */
function resolveType(doc: FetchedDoc | undefined, config: TenantConfig): string {
  return typeof doc?._type === 'string' && doc._type.length > 0
    ? doc._type
    : config.blogDocType
}

/**
 * Build the essential field values as Sanity document keys, validating every key
 * against GROQ-injection first. Title/excerpt are written via the localized shape;
 * body (when provided) is converted plain text → minimal Portable Text per locale;
 * the slug (when non-empty) is written as a slug object on its container field.
 * The image field is intentionally never written (B.06).
 */
function buildEssentials(
  config: TenantConfig,
  fields: EditorFields,
): Record<string, unknown> {
  assertWritableFieldPaths(config)
  const fm = config.fieldMap
  const essentials: Record<string, unknown> = {}

  essentials[fm.title] = toFieldValue(config, fields.title)
  essentials[fm.excerpt] = toFieldValue(config, fields.excerpt)

  if (fields.body !== undefined) {
    const perLocaleBlocks: Record<string, unknown> = {}
    for (const loc of localeList(config)) {
      perLocaleBlocks[loc] = textToPortableText(fields.body[loc] ?? '')
    }
    essentials[fm.body] = toFieldValue(config, perLocaleBlocks)
  }

  const slug = fields.slug?.trim()
  if (slug) {
    essentials[slugContainerField(config)] = { _type: 'slug', current: slug }
  }

  return essentials
}

/** Fetch both variants (published + `drafts.<id>`) as full documents. */
async function fetchVariants(
  writer: SanityWriter,
  id: string,
  dId: string,
): Promise<{ published?: FetchedDoc; draft?: FetchedDoc }> {
  const docs = await writer.fetch<FetchedDoc[]>(
    '*[_id == $id || _id == $draftId]',
    { id, draftId: dId },
  )
  let published: FetchedDoc | undefined
  let draft: FetchedDoc | undefined
  for (const doc of docs ?? []) {
    if (doc?._id === dId) draft = doc
    else if (doc?._id === id) published = doc
  }
  return { published, draft }
}

/**
 * Create a brand-new post as a draft. Generates a fresh logical id and writes the
 * essentials to `drafts.<id>`. Returns the new logical id (so the caller can route
 * to its editor). No image is written (B.06).
 */
export async function createDraft(
  tenant: TenantContext,
  fields: EditorFields,
  makeWriter: MakeWriter = defaultMakeWriter,
): Promise<string> {
  const id = randomUUID()
  const writer = makeWriter(tenant.config, tenant.token)
  const doc: MutationDoc = {
    _id: draftId(id),
    _type: tenant.config.blogDocType,
    ...buildEssentials(tenant.config, fields),
  }
  await writer.createOrReplace(doc, SYNC)
  return id
}

/**
 * Save edits as a draft, preserving the client's non-essential fields. Reads the
 * current working copy (draft if present, else published), overlays the
 * essentials, and writes the result to `drafts.<id>` — never a bare replace of
 * only the essentials (that would clobber image/author/categories/…).
 */
export async function saveDraft(
  tenant: TenantContext,
  rawId: string,
  fields: EditorFields,
  makeWriter: MakeWriter = defaultMakeWriter,
): Promise<string> {
  const id = normalizePostId(rawId)
  const dId = draftId(id)
  const writer = makeWriter(tenant.config, tenant.token)

  const { published, draft } = await fetchVariants(writer, id, dId)
  const current = draft ?? published
  const base = current ? stripSystemFields(current) : {}

  const doc: MutationDoc = {
    ...base,
    _id: dId,
    _type: resolveType(current, tenant.config),
    ...buildEssentials(tenant.config, fields),
  }
  await writer.createOrReplace(doc, SYNC)
  return id
}

/**
 * Publish a post: promote its draft to the published id and remove the draft, in
 * one all-or-nothing transaction. If there is no draft, this is a no-op success
 * (the post is already published with no pending edits).
 */
export async function publishPost(
  tenant: TenantContext,
  rawId: string,
  makeWriter: MakeWriter = defaultMakeWriter,
): Promise<string> {
  const id = normalizePostId(rawId)
  const dId = draftId(id)
  const writer = makeWriter(tenant.config, tenant.token)

  const { draft } = await fetchVariants(writer, id, dId)
  if (!draft) return id

  const published: MutationDoc = {
    ...stripSystemFields(draft),
    _id: id,
    _type: resolveType(draft, tenant.config),
  }
  await writer
    .transaction()
    .createOrReplace(published)
    .delete(dId)
    .commit(SYNC)
  return id
}

/**
 * Delete a post entirely: remove both the published document and its draft in one
 * transaction, so neither variant lingers.
 */
export async function deletePost(
  tenant: TenantContext,
  rawId: string,
  makeWriter: MakeWriter = defaultMakeWriter,
): Promise<string> {
  const id = normalizePostId(rawId)
  const writer = makeWriter(tenant.config, tenant.token)
  await writer.transaction().delete(id).delete(draftId(id)).commit(SYNC)
  return id
}
