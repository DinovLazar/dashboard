import { describe, expect, it } from 'vitest'

import type { TenantConfig } from '@/lib/registry/types'

import {
  assertSafeFieldPath,
  assertWritableFieldPaths,
  buildPostByIdQuery,
  buildPostListQuery,
  slugContainerField,
} from './field-map'

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

describe('buildPostByIdQuery', () => {
  it('binds $id and $draftId as parameters (never interpolates the ids)', () => {
    const q = buildPostByIdQuery(CONFIG)
    expect(q).toContain('_id == $id')
    expect(q).toContain('_id == $draftId')
    // The literal ids are supplied at fetch time, not baked into the string.
    expect(q).not.toContain('drafts.')
  })

  it('projects body in addition to the list fields', () => {
    const q = buildPostByIdQuery(CONFIG)
    expect(q).toContain('"title": title')
    expect(q).toContain('"excerpt": excerpt')
    expect(q).toContain('"slug": slug.current')
    expect(q).toContain('"body": body')
    expect(q).toContain('_id')
    expect(q).toContain('_updatedAt')
  })

  it('projects the featured image asset id and a public CDN url (B.06)', () => {
    const q = buildPostByIdQuery(CONFIG)
    // `image` is the flat field name (`mainImage`); the asset ref + deref'd url.
    expect(q).toContain('"imageAssetId": mainImage.asset._ref')
    expect(q).toContain('"imageUrl": mainImage.asset->url')
  })

  it('throws rather than build a query from an unsafe field name (incl. body)', () => {
    const evil: TenantConfig = {
      ...CONFIG,
      fieldMap: { ...CONFIG.fieldMap, body: 'body} | *[_type=="secret"]{' },
    }
    expect(() => buildPostByIdQuery(evil)).toThrow()
  })

  it('throws rather than build a query from an unsafe image field name (B.06)', () => {
    const evil: TenantConfig = {
      ...CONFIG,
      fieldMap: { ...CONFIG.fieldMap, image: 'mainImage} | *[_type=="secret"]{' },
    }
    expect(() => buildPostByIdQuery(evil)).toThrow()
  })
})

describe('assertWritableFieldPaths', () => {
  it('accepts a config whose write keys are plain identifiers', () => {
    expect(() => assertWritableFieldPaths(CONFIG)).not.toThrow()
  })

  it('throws when a write key is malformed (defense in depth against bad rows)', () => {
    for (const badKey of ['a b', 'title) {', '', '1bad']) {
      const evil: TenantConfig = {
        ...CONFIG,
        fieldMap: { ...CONFIG.fieldMap, body: badKey },
      }
      expect(() => assertWritableFieldPaths(evil)).toThrow()
    }
  })

  it('validates the image field name too, so it is safe as a mutation key (B.06)', () => {
    for (const badImage of ['main image', 'mainImage) {', '', '1img']) {
      const evil: TenantConfig = {
        ...CONFIG,
        fieldMap: { ...CONFIG.fieldMap, image: badImage },
      }
      expect(() => assertWritableFieldPaths(evil)).toThrow()
    }
  })
})

describe('slugContainerField', () => {
  it('derives the container before the first dot', () => {
    expect(slugContainerField(CONFIG)).toBe('slug')
  })

  it('returns a bare slug field unchanged', () => {
    const bare: TenantConfig = {
      ...CONFIG,
      fieldMap: { ...CONFIG.fieldMap, slug: 'slug' },
    }
    expect(slugContainerField(bare)).toBe('slug')
  })

  it('validates the derived container (rejects a malformed slug field)', () => {
    const evil: TenantConfig = {
      ...CONFIG,
      fieldMap: { ...CONFIG.fieldMap, slug: 'sl ug.current' },
    }
    expect(() => slugContainerField(evil)).toThrow()
  })
})
