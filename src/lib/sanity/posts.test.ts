import { describe, expect, it } from 'vitest'

import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { displayValue, getPost, listPosts, type SanityReader } from './posts'

/**
 * B.04 — read-path reduce logic. Proves the `raw`-perspective variants collapse
 * to one row per logical post with the right status, edit hint, value
 * preference, ordering, and that `versions.*` (Content Releases) are ignored.
 * Fully offline — a stub reader returns canned docs.
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
  locales: ['en', 'mk'],
  revalidateUrl: null,
}

function tenantWith(docs: Array<Record<string, unknown>>): {
  tenant: TenantContext
  makeClient: () => SanityReader
} {
  const tenant: TenantContext = { config: CONFIG, token: 'unused-in-stub' }
  const makeClient = (): SanityReader => ({
    async fetch<T>(): Promise<T> {
      return docs as unknown as T
    },
  })
  return { tenant, makeClient }
}

describe('listPosts — raw-perspective reduce', () => {
  it('marks a draft-only document as draft', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'drafts.p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Only a draft' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      id: 'p1',
      title: 'Only a draft',
      status: 'draft',
      hasUnpublishedEdits: false,
    })
  })

  it('marks a published-only document as published', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Live post' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts[0]).toMatchObject({ status: 'published', hasUnpublishedEdits: false })
  })

  it('collapses a published + draft pair into one published row with unpublished edits, preferring the draft’s values', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Published title', excerpt: 'old' },
      { _id: 'drafts.p1', _updatedAt: '2026-03-05T00:00:00Z', title: 'Draft title', excerpt: 'new' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      id: 'p1',
      title: 'Draft title', // working copy preferred
      excerpt: 'new',
      status: 'published',
      hasUnpublishedEdits: true,
      updatedAt: '2026-03-05T00:00:00Z', // the draft's timestamp
    })
  })

  it('ignores versions.* (Content Releases) variants', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Real post' },
      { _id: 'versions.rABC.p1', _updatedAt: '2026-03-09T00:00:00Z', title: 'Release variant' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('Real post')
    expect(posts[0].updatedAt).toBe('2026-03-01T00:00:00Z')
  })

  it('sorts newest-first by updatedAt', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'old', _updatedAt: '2026-01-01T00:00:00Z', title: 'Old' },
      { _id: 'new', _updatedAt: '2026-06-01T00:00:00Z', title: 'New' },
      { _id: 'mid', _updatedAt: '2026-03-01T00:00:00Z', title: 'Mid' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts.map((p) => p.title)).toEqual(['New', 'Mid', 'Old'])
  })

  it('coerces a missing title to "Untitled" and leaves missing excerpt/slug null', async () => {
    const { tenant, makeClient } = tenantWith([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z' },
    ])
    const posts = await listPosts(tenant, makeClient)
    expect(posts[0]).toMatchObject({ title: 'Untitled', excerpt: null, slug: null })
  })

  it('returns an empty array when there are no documents', async () => {
    const { tenant, makeClient } = tenantWith([])
    expect(await listPosts(tenant, makeClient)).toEqual([])
  })
})

describe('displayValue', () => {
  it('passes a plain string through', () => {
    expect(displayValue('hello')).toBe('hello')
  })

  it('returns the first locale value of a localized object', () => {
    expect(displayValue({ en: 'Hello', mk: 'Здраво' })).toBe('Hello')
  })

  it('skips Sanity system keys (e.g. _type) when picking a locale value', () => {
    expect(displayValue({ _type: 'localeString', en: 'Hello', mk: 'Здраво' })).toBe('Hello')
  })

  it('returns null for null, numbers, arrays, and value-less objects', () => {
    expect(displayValue(null)).toBeNull()
    expect(displayValue(42)).toBeNull()
    expect(displayValue(['a', 'b'])).toBeNull()
    expect(displayValue({ _type: 'localeString' })).toBeNull()
  })
})

describe('getPost — single-post load for the edit form', () => {
  const SINGLE: TenantConfig = { ...CONFIG, locales: ['en'] }

  function tenantReading(docs: Array<Record<string, unknown>>, config = SINGLE) {
    const tenant: TenantContext = { config, token: 'unused-in-stub' }
    const makeClient = (): SanityReader => ({
      async fetch<T>(): Promise<T> {
        return docs as unknown as T
      },
    })
    return { tenant, makeClient }
  }

  /** A simple, editable Portable Text body (one normal paragraph per entry). */
  const body = (text: string) => [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: 'b0s0', text, marks: [] }],
    },
  ]

  it('loads a published-only post with per-locale fields and editable body', async () => {
    const { tenant, makeClient } = tenantReading([
      {
        _id: 'p1',
        _updatedAt: '2026-03-01T00:00:00Z',
        title: 'Live headline',
        excerpt: 'Live summary',
        slug: 'live-headline',
        body: body('Hello world'),
      },
    ])
    const detail = await getPost(tenant, 'p1', makeClient)
    expect(detail).toMatchObject({
      id: 'p1',
      status: 'published',
      hasUnpublishedEdits: false,
      bodyEditable: true,
      updatedAt: '2026-03-01T00:00:00Z',
    })
    expect(detail?.fields).toEqual({
      title: { en: 'Live headline' },
      excerpt: { en: 'Live summary' },
      body: { en: 'Hello world' },
      slug: 'live-headline',
    })
  })

  it('prefers the draft working copy and marks unpublished edits', async () => {
    const { tenant, makeClient } = tenantReading([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Published', body: body('old') },
      { _id: 'drafts.p1', _updatedAt: '2026-03-05T00:00:00Z', title: 'Draft', body: body('new') },
    ])
    const detail = await getPost(tenant, 'p1', makeClient)
    expect(detail).toMatchObject({
      status: 'published',
      hasUnpublishedEdits: true,
      updatedAt: '2026-03-05T00:00:00Z',
    })
    expect(detail?.fields.title).toEqual({ en: 'Draft' })
    expect(detail?.fields.body).toEqual({ en: 'new' })
  })

  it('marks a draft-only post as draft', async () => {
    const { tenant, makeClient } = tenantReading([
      { _id: 'drafts.p1', _updatedAt: '2026-03-05T00:00:00Z', title: 'Only draft', body: body('x') },
    ])
    const detail = await getPost(tenant, 'p1', makeClient)
    expect(detail).toMatchObject({ status: 'draft', hasUnpublishedEdits: false })
  })

  it('normalizes a drafts.-prefixed id submitted by a caller', async () => {
    const { tenant, makeClient } = tenantReading([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Live', body: body('x') },
    ])
    const detail = await getPost(tenant, 'drafts.p1', makeClient)
    expect(detail?.id).toBe('p1')
    expect(detail?.status).toBe('published')
  })

  it('returns null when neither variant exists', async () => {
    const { tenant, makeClient } = tenantReading([
      { _id: 'other', _updatedAt: '2026-03-01T00:00:00Z', title: 'Other', body: body('x') },
    ])
    expect(await getPost(tenant, 'p1', makeClient)).toBeNull()
  })

  it('returns null for an invalid (injected) id rather than throwing', async () => {
    const { tenant, makeClient } = tenantReading([])
    expect(await getPost(tenant, '* | *[_type=="secret"]', makeClient)).toBeNull()
  })

  it('flags a rich body as not editable but still surfaces its text read-only', async () => {
    const richBody = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'bold bit', marks: ['strong'] }],
      },
    ]
    const { tenant, makeClient } = tenantReading([
      { _id: 'p1', _updatedAt: '2026-03-01T00:00:00Z', title: 'Rich', body: richBody },
    ])
    const detail = await getPost(tenant, 'p1', makeClient)
    expect(detail?.bodyEditable).toBe(false)
    expect(detail?.fields.body).toEqual({ en: 'bold bit' })
  })

  it('loads per-locale values for a multi-locale client', async () => {
    const MULTI: TenantConfig = { ...CONFIG, locales: ['en', 'mk'] }
    const { tenant, makeClient } = tenantReading(
      [
        {
          _id: 'p1',
          _updatedAt: '2026-03-01T00:00:00Z',
          title: { _type: 'localeString', en: 'Hello', mk: 'Здраво' },
          excerpt: { en: 'Summary', mk: 'Резиме' },
          slug: 'hello',
          body: { en: body('English body'), mk: body('Macedonian body') },
        },
      ],
      MULTI,
    )
    const detail = await getPost(tenant, 'p1', makeClient)
    expect(detail?.fields.title).toEqual({ en: 'Hello', mk: 'Здраво' })
    expect(detail?.fields.body).toEqual({ en: 'English body', mk: 'Macedonian body' })
    expect(detail?.bodyEditable).toBe(true)
  })
})
