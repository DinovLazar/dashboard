'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { localeList } from '@/lib/config/localize'
import { resolveTenant } from '@/lib/registry/resolve-tenant'
import type { TenantContext } from '@/lib/registry/types'
import { normalizePostId } from '@/lib/sanity/doc-id'
import {
  createDraft,
  deletePost,
  publishPost,
  saveDraft,
  type EditorFields,
} from '@/lib/sanity/mutations'

/**
 * The mutating Server Actions (B.05). Mirrors the `signOut()` pattern: Server
 * Actions are independently reachable by direct POST, so a page/layout check does
 * NOT protect them — **every action re-resolves the tenant with `resolveTenant()`
 * itself**, which re-authenticates the session AND re-authorizes the one client it
 * owns. No tenant is ever passed in from a page. No caller-supplied project id,
 * client id, or token is trusted: the submitted post id is normalized (any
 * `drafts.`/`versions.` prefix stripped) and only ever applied through the
 * session owner's per-tenant client, so it can at most address a doc in the
 * owner's own dataset.
 *
 * Every failure — a `TenantResolutionError`, an invalid id, a Sanity error —
 * becomes the same generic, non-leaking result. The project id, token, doc type,
 * and raw error never reach the UI.
 */

/** The shape `useActionState` binds to in the editor form. */
export type EditorActionState = { ok: boolean; error: string | null }

const GENERIC_ERROR = 'Something went wrong — please try again.'
const HEADLINE_REQUIRED = 'Please add a headline before saving.'

function fail(): EditorActionState {
  return { ok: false, error: GENERIC_ERROR }
}

/**
 * Read the editor's per-locale fields out of the submitted form. Field inputs are
 * named `title.<locale>` / `excerpt.<locale>` / `body.<locale>`, the slug is
 * `slug`. `includeBody` is false when the post's body is too rich to edit as
 * plain text — then body is omitted so the mutation preserves it untouched.
 */
function parseFields(
  tenant: TenantContext,
  formData: FormData,
  includeBody: boolean,
): EditorFields {
  const locales = localeList(tenant.config)
  const title: Record<string, string> = {}
  const excerpt: Record<string, string> = {}
  const body: Record<string, string> = {}
  for (const loc of locales) {
    title[loc] = String(formData.get(`title.${loc}`) ?? '')
    excerpt[loc] = String(formData.get(`excerpt.${loc}`) ?? '')
    body[loc] = String(formData.get(`body.${loc}`) ?? '')
  }
  const slug = String(formData.get('slug') ?? '').trim()
  const fields: EditorFields = { title, excerpt, slug: slug || null }
  if (includeBody) fields.body = body
  return fields
}

/** True when the primary-locale headline is empty (the one required field). */
function titleMissing(tenant: TenantContext, fields: EditorFields): boolean {
  const primary = localeList(tenant.config)[0]
  return !fields.title[primary]?.trim()
}

/** Whether the body should be written (a hidden flag the editor sets to 'false'
 *  only when the stored body is too rich to edit). Absent → editable. */
function bodyIsEditable(formData: FormData): boolean {
  return formData.get('bodyEditable') !== 'false'
}

/** Create a new post as a draft, then open its editor. */
export async function createPostAction(
  _prev: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  let id: string
  try {
    const tenant = await resolveTenant()
    const fields = parseFields(tenant, formData, true)
    if (titleMissing(tenant, fields)) {
      return { ok: false, error: HEADLINE_REQUIRED }
    }
    id = await createDraft(tenant, fields)
  } catch {
    return fail()
  }
  revalidatePath('/posts')
  revalidatePath(`/posts/${id}`)
  redirect(`/posts/${id}`)
}

/** Save edits as a draft (preserving the client's non-essential fields). */
export async function saveDraftAction(
  _prev: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const tenant = await resolveTenant()
    const id = normalizePostId(String(formData.get('id') ?? ''))
    const fields = parseFields(tenant, formData, bodyIsEditable(formData))
    if (titleMissing(tenant, fields)) {
      return { ok: false, error: HEADLINE_REQUIRED }
    }
    await saveDraft(tenant, id, fields)
    revalidatePath('/posts')
    revalidatePath(`/posts/${id}`)
    return { ok: true, error: null }
  } catch {
    return fail()
  }
}

/**
 * Publish a post. The Publish button submits the live edit form, so we first
 * persist the on-screen edits into the draft (same parse + body-preserve rules as
 * Save), THEN promote that draft to the published id and remove it. Saving first
 * is what makes "Publish" mean "make exactly what I see live" — never a silent
 * no-op that drops the user's edits, and never a promote of a stale older draft.
 */
export async function publishPostAction(
  _prev: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const tenant = await resolveTenant()
    const id = normalizePostId(String(formData.get('id') ?? ''))
    const fields = parseFields(tenant, formData, bodyIsEditable(formData))
    if (titleMissing(tenant, fields)) {
      return { ok: false, error: HEADLINE_REQUIRED }
    }
    await saveDraft(tenant, id, fields)
    await publishPost(tenant, id)
    revalidatePath('/posts')
    revalidatePath(`/posts/${id}`)
    return { ok: true, error: null }
  } catch {
    return fail()
  }
}

/** Delete a post (both variants) and return to the list. */
export async function deletePostAction(
  _prev: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const tenant = await resolveTenant()
    const id = normalizePostId(String(formData.get('id') ?? ''))
    await deletePost(tenant, id)
  } catch {
    return fail()
  }
  revalidatePath('/posts')
  redirect('/posts')
}
