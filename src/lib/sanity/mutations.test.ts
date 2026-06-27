import { describe, expect, it } from 'vitest'

import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { draftId } from './doc-id'
import {
  createDraft,
  deletePost,
  publishPost,
  saveDraft,
  type EditorFields,
  type MakeWriter,
  type MutationDoc,
  type MutationOptions,
  type SanityWriter,
  type WriteTransaction,
} from './mutations'

/**
 * B.05 — write-path dispatch shapes (offline; no Sanity network). Proves each
 * mutation builds the right document(s) under the draft-id model: create/save
 * target `drafts.<id>`, publish promotes + deletes the draft in one transaction,
 * delete removes both variants, and a save preserves the client's non-essential
 * fields. Uses only invented strings — no real token/key/project id.
 */

const CONFIG: TenantConfig = {
  clientId: 'client-x',
  label: 'Client X',
  sanityProjectId: 'project-x',
  dataset: 'production',
  blogDocType: 'blogPost',
  fieldMap: {
    title: 'title',
    body: 'body',
    excerpt: 'excerpt',
    image: 'mainImage',
    status: 'status',
    slug: 'slug.current',
  },
  locales: ['en'],
  revalidateUrl: null,
}

const TENANT: TenantContext = { config: CONFIG, token: 'invented-token' }

type Dispatch =
  | { kind: 'createOrReplace'; doc: MutationDoc; options?: MutationOptions }
  | { kind: 'transaction'; ops: TxnOp[]; options?: MutationOptions }

type TxnOp =
  | { op: 'createOrReplace'; doc: MutationDoc }
  | { op: 'delete'; id: string }

/**
 * A recording writer that captures every dispatch and serves seeded docs to the
 * read-modify-write fetches (filtering by the bound `$id` / `$draftId` params).
 */
function makeRecordingWriter(seeded: FetchedDoc[] = []) {
  const dispatches: Dispatch[] = []
  let tokenSeen: string | null = null

  const factory: MakeWriter = (_config, token): SanityWriter => {
    tokenSeen = token
    return {
      async fetch<T>(_query: string, params?: Record<string, unknown>): Promise<T> {
        const id = params?.id
        const dId = params?.draftId
        return seeded.filter(
          (d) => d._id === id || d._id === dId,
        ) as unknown as T
      },
      async createOrReplace(doc, options) {
        dispatches.push({ kind: 'createOrReplace', doc, options })
        return {}
      },
      transaction(): WriteTransaction {
        const ops: TxnOp[] = []
        const txn: WriteTransaction = {
          createOrReplace(doc) {
            ops.push({ op: 'createOrReplace', doc })
            return txn
          },
          delete(id) {
            ops.push({ op: 'delete', id })
            return txn
          },
          async commit(options) {
            dispatches.push({ kind: 'transaction', ops, options })
            return {}
          },
        }
        return txn
      },
    }
  }

  return { factory, dispatches, tokenSeen: () => tokenSeen }
}

type FetchedDoc = Record<string, unknown> & { _id?: string; _type?: string }

const FIELDS: EditorFields = {
  title: { en: 'A headline' },
  excerpt: { en: 'A summary' },
  slug: 'a-headline',
  body: { en: 'Para one.\n\nPara two.' },
}

describe('createDraft', () => {
  it('createOrReplaces drafts.<id> with the doc type and mapped essentials, no image', async () => {
    const rec = makeRecordingWriter()
    const id = await createDraft(TENANT, FIELDS, rec.factory)

    expect(rec.dispatches).toHaveLength(1)
    const d = rec.dispatches[0]
    expect(d.kind).toBe('createOrReplace')
    if (d.kind !== 'createOrReplace') throw new Error('unreachable')

    expect(d.doc._id).toBe(draftId(id))
    expect(d.doc._type).toBe('blogPost')
    expect(d.doc.title).toBe('A headline')
    expect(d.doc.excerpt).toBe('A summary')
    expect(d.doc.slug).toEqual({ _type: 'slug', current: 'a-headline' })
    // Body became minimal Portable Text (two paragraphs).
    expect(Array.isArray(d.doc.body)).toBe(true)
    expect((d.doc.body as unknown[]).length).toBe(2)
    // No image is ever written in B.05.
    expect('mainImage' in d.doc).toBe(false)
    // Re-readable immediately.
    expect(d.options).toEqual({ visibility: 'sync' })
  })

  it('omits the slug object when no slug is provided', async () => {
    const rec = makeRecordingWriter()
    await createDraft(TENANT, { ...FIELDS, slug: null }, rec.factory)
    const d = rec.dispatches[0]
    if (d.kind !== 'createOrReplace') throw new Error('unreachable')
    expect('slug' in d.doc).toBe(false)
  })
})

describe('saveDraft', () => {
  it('overlays essentials onto drafts.<id>, preserving non-essential client fields', async () => {
    // The current published doc carries fields the portal editor does NOT manage.
    const seeded: FetchedDoc[] = [
      {
        _id: 'p1',
        _rev: 'rev-abc',
        _type: 'blogPost',
        _updatedAt: '2026-01-01T00:00:00Z',
        title: 'Old title',
        excerpt: 'Old summary',
        mainImage: { _type: 'image', asset: { _ref: 'image-xyz' } },
        author: { _ref: 'author-1' },
        categories: ['lawn-care'],
      },
    ]
    const rec = makeRecordingWriter(seeded)
    await saveDraft(TENANT, 'p1', FIELDS, rec.factory)

    const d = rec.dispatches[0]
    expect(d.kind).toBe('createOrReplace')
    if (d.kind !== 'createOrReplace') throw new Error('unreachable')

    // Writes the DRAFT id (never the published id directly).
    expect(d.doc._id).toBe('drafts.p1')
    // Essentials updated.
    expect(d.doc.title).toBe('A headline')
    expect(d.doc.excerpt).toBe('A summary')
    // Non-essentials preserved verbatim.
    expect(d.doc.mainImage).toEqual({ _type: 'image', asset: { _ref: 'image-xyz' } })
    expect(d.doc.author).toEqual({ _ref: 'author-1' })
    expect(d.doc.categories).toEqual(['lawn-care'])
    // Server-managed fields are dropped (no stale _rev carried onto the draft).
    expect('_rev' in d.doc).toBe(false)
    expect('_updatedAt' in d.doc).toBe(false)
  })

  it('preserves the stored body when EditorFields omits body (rich-body guard)', async () => {
    const richBody = [
      { _type: 'image', asset: { _ref: 'image-abc' } },
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'bold', marks: ['strong'] }],
      },
    ]
    const seeded: FetchedDoc[] = [
      { _id: 'p1', _type: 'blogPost', title: 'Old', excerpt: 'Old', body: richBody },
    ]
    const rec = makeRecordingWriter(seeded)
    // No `body` key on the input → the stored rich body must be left untouched.
    await saveDraft(
      TENANT,
      'p1',
      { title: { en: 'New title' }, excerpt: { en: 'New summary' }, slug: null },
      rec.factory,
    )
    const d = rec.dispatches[0]
    if (d.kind !== 'createOrReplace') throw new Error('unreachable')
    expect(d.doc.body).toEqual(richBody)
    expect(d.doc.title).toBe('New title')
  })

  it('creates a fresh draft when no current document exists', async () => {
    const rec = makeRecordingWriter([])
    await saveDraft(TENANT, 'p1', FIELDS, rec.factory)
    const d = rec.dispatches[0]
    if (d.kind !== 'createOrReplace') throw new Error('unreachable')
    expect(d.doc._id).toBe('drafts.p1')
    expect(d.doc._type).toBe('blogPost')
  })
})

describe('publishPost', () => {
  it('promotes the draft to the published id and deletes the draft in one transaction', async () => {
    const seeded: FetchedDoc[] = [
      {
        _id: 'drafts.p1',
        _rev: 'rev-d',
        _type: 'blogPost',
        title: 'Draft title',
        mainImage: { _type: 'image' },
      },
    ]
    const rec = makeRecordingWriter(seeded)
    await publishPost(TENANT, 'p1', rec.factory)

    expect(rec.dispatches).toHaveLength(1)
    const d = rec.dispatches[0]
    expect(d.kind).toBe('transaction')
    if (d.kind !== 'transaction') throw new Error('unreachable')

    expect(d.ops).toHaveLength(2)
    const [first, second] = d.ops
    expect(first).toMatchObject({ op: 'createOrReplace' })
    if (first.op !== 'createOrReplace') throw new Error('unreachable')
    expect(first.doc._id).toBe('p1') // published id, from the draft's content
    expect(first.doc.title).toBe('Draft title')
    expect(first.doc.mainImage).toEqual({ _type: 'image' })
    expect('_rev' in first.doc).toBe(false)
    expect(second).toEqual({ op: 'delete', id: 'drafts.p1' })
    expect(d.options).toEqual({ visibility: 'sync' })
  })

  it('is a no-op success when there is no draft', async () => {
    const rec = makeRecordingWriter([
      { _id: 'p1', _type: 'blogPost', title: 'Already published' },
    ])
    await publishPost(TENANT, 'p1', rec.factory)
    expect(rec.dispatches).toHaveLength(0)
  })
})

describe('deletePost', () => {
  it('deletes both the published and draft variants in one transaction', async () => {
    const rec = makeRecordingWriter()
    await deletePost(TENANT, 'p1', rec.factory)

    const d = rec.dispatches[0]
    expect(d.kind).toBe('transaction')
    if (d.kind !== 'transaction') throw new Error('unreachable')
    expect(d.ops).toEqual([
      { op: 'delete', id: 'p1' },
      { op: 'delete', id: 'drafts.p1' },
    ])
  })

  it('normalizes a drafts.-prefixed id before deleting', async () => {
    const rec = makeRecordingWriter()
    await deletePost(TENANT, 'drafts.p1', rec.factory)
    const d = rec.dispatches[0]
    if (d.kind !== 'transaction') throw new Error('unreachable')
    expect(d.ops).toEqual([
      { op: 'delete', id: 'p1' },
      { op: 'delete', id: 'drafts.p1' },
    ])
  })
})

describe('no token leakage', () => {
  it('never returns or stringifies the token from any mutation', async () => {
    const rec = makeRecordingWriter([
      { _id: 'drafts.p1', _type: 'blogPost', title: 'd' },
    ])
    const created = await createDraft(TENANT, FIELDS, rec.factory)
    const saved = await saveDraft(TENANT, 'p1', FIELDS, rec.factory)
    const published = await publishPost(TENANT, 'p1', rec.factory)
    const deleted = await deletePost(TENANT, 'p1', rec.factory)

    for (const result of [created, saved, published, deleted]) {
      expect(result).not.toContain('invented-token')
    }
    // The whole record of dispatches never embeds the token either.
    expect(JSON.stringify(rec.dispatches)).not.toContain('invented-token')
  })
})
