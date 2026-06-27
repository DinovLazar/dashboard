import { describe, expect, it } from 'vitest'

import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { displayValue, listPosts, type SanityReader } from './posts'

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
