import { describe, expect, it } from 'vitest'

import type { TenantConfig } from '@/lib/registry/types'

import { assertSafeFieldPath, buildPostListQuery } from './field-map'

/**
 * B.04 — field-map → GROQ guard. The doc type is always a bound parameter
 * (`$type`), and field names are validated before they are interpolated, so a
 * malformed registry row can never inject GROQ.
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

describe('assertSafeFieldPath', () => {
  it('accepts plain and dotted identifiers', () => {
    expect(() => assertSafeFieldPath('title')).not.toThrow()
    expect(() => assertSafeFieldPath('slug.current')).not.toThrow()
    expect(() => assertSafeFieldPath('_id')).not.toThrow()
    expect(() => assertSafeFieldPath('a.b.c_1')).not.toThrow()
  })

  it('rejects anything with GROQ-significant or whitespace characters', () => {
    for (const bad of [
      '',
      ' title',
      'title ',
      'a b',
      'a, b',
      'a == "x"',
      'a]{...}',
      'a->b',
      'a[0]',
      "a'",
      'a"b',
      '1abc',
      '*',
      'a)',
    ]) {
      expect(() => assertSafeFieldPath(bad)).toThrow()
    }
  })
})

describe('buildPostListQuery', () => {
  it('binds $type as a parameter (never interpolates the doc type)', () => {
    const q = buildPostListQuery(CONFIG)
    expect(q).toContain('_type == $type')
    expect(q).not.toContain('blogPost')
  })

  it('projects the configured (validated) field names', () => {
    const q = buildPostListQuery(CONFIG)
    expect(q).toContain('"title": title')
    expect(q).toContain('"excerpt": excerpt')
    expect(q).toContain('"slug": slug.current')
    expect(q).toContain('_id')
    expect(q).toContain('_updatedAt')
  })

  it('throws rather than build a query from an unsafe field name', () => {
    const evil: TenantConfig = {
      ...CONFIG,
      fieldMap: { ...CONFIG.fieldMap, title: 'title} | *[_type=="secret"]{' },
    }
    expect(() => buildPostListQuery(evil)).toThrow()
  })
})
