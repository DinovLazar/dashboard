import { describe, expect, it } from 'vitest'

import type { TenantConfig } from '@/lib/registry/types'

import {
  fromFieldValue,
  fromLocalizedRaw,
  isMultiLocale,
  localeList,
  primaryLocale,
  toFieldValue,
} from './localize'

/**
 * B.05 — localized field <-> per-locale form-state transforms. The single-locale
 * client stores a plain value; the multi-locale client stores a `{ [locale]: … }`
 * object. These prove the round-trip both ways, including reading an existing
 * localized object via `displayValue`-style semantics (system keys skipped).
 */

function configWith(locales: string[]): TenantConfig {
  return {
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
    locales,
    revalidateUrl: null,
  }
}

const SINGLE = configWith(['en'])
const MULTI = configWith(['en', 'mk'])
const NONE = configWith([])

describe('locale helpers', () => {
  it('localeList falls back to ["en"] when no locales are configured', () => {
    expect(localeList(NONE)).toEqual(['en'])
    expect(localeList(SINGLE)).toEqual(['en'])
    expect(localeList(MULTI)).toEqual(['en', 'mk'])
  })

  it('primaryLocale is the first locale', () => {
    expect(primaryLocale(MULTI)).toBe('en')
    expect(primaryLocale(NONE)).toBe('en')
  })

  it('isMultiLocale reflects more than one locale', () => {
    expect(isMultiLocale(SINGLE)).toBe(false)
    expect(isMultiLocale(NONE)).toBe(false)
    expect(isMultiLocale(MULTI)).toBe(true)
  })
})

describe('toFieldValue', () => {
  it('single-locale → the plain primary-locale value', () => {
    expect(toFieldValue(SINGLE, { en: 'Hello' })).toBe('Hello')
  })

  it('multi-locale → a localized object of only the configured locales with values', () => {
    expect(toFieldValue(MULTI, { en: 'Hello', mk: 'Здраво' })).toEqual({
      en: 'Hello',
      mk: 'Здраво',
    })
  })

  it('multi-locale omits locales with no value', () => {
    expect(toFieldValue(MULTI, { en: 'Hello' })).toEqual({ en: 'Hello' })
  })

  it('is generic over the value type (Portable Text arrays, not just strings)', () => {
    const blocks = [{ _type: 'block', children: [] }]
    expect(toFieldValue(SINGLE, { en: blocks })).toBe(blocks)
    expect(toFieldValue(MULTI, { en: blocks })).toEqual({ en: blocks })
  })
})

describe('fromFieldValue', () => {
  it('single-locale round-trips a plain string', () => {
    const stored = toFieldValue(SINGLE, { en: 'Hello' })
    expect(fromFieldValue(SINGLE, stored)).toEqual({ en: 'Hello' })
  })

  it('multi-locale round-trips a localized object', () => {
    const stored = toFieldValue(MULTI, { en: 'Hello', mk: 'Здраво' })
    expect(fromFieldValue(MULTI, stored)).toEqual({ en: 'Hello', mk: 'Здраво' })
  })

  it('reads an existing localized object, skipping system keys', () => {
    expect(
      fromFieldValue(MULTI, { _type: 'localeString', en: 'Hello', mk: 'Здраво' }),
    ).toEqual({ en: 'Hello', mk: 'Здраво' })
  })

  it('fills every configured locale, defaulting missing/absent ones to ""', () => {
    expect(fromFieldValue(MULTI, { en: 'Hello' })).toEqual({ en: 'Hello', mk: '' })
    expect(fromFieldValue(MULTI, null)).toEqual({ en: '', mk: '' })
  })

  it('attributes a plain string to the primary locale under a multi-locale config', () => {
    expect(fromFieldValue(MULTI, 'Legacy single value')).toEqual({
      en: 'Legacy single value',
      mk: '',
    })
  })
})

describe('fromLocalizedRaw', () => {
  it('returns the primary-locale entry for a non-object value', () => {
    expect(fromLocalizedRaw(SINGLE, 'plain')).toEqual({ en: 'plain' })
    const arr = [{ _type: 'block' }]
    expect(fromLocalizedRaw(SINGLE, arr)).toEqual({ en: arr })
  })

  it('returns each locale entry for a localized object (skipping system keys)', () => {
    expect(
      fromLocalizedRaw(MULTI, { _type: 'x', en: 'A', mk: 'B' }),
    ).toEqual({ en: 'A', mk: 'B' })
  })

  it('returns {} for null/undefined', () => {
    expect(fromLocalizedRaw(SINGLE, null)).toEqual({})
    expect(fromLocalizedRaw(SINGLE, undefined)).toEqual({})
  })
})
