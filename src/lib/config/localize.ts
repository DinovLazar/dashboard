import type { TenantConfig } from '@/lib/registry/types'

/**
 * Localized field <-> per-locale form-state transforms (B.05).
 *
 * A client's blog may be single-language (Sanity stores a plain value) or
 * multi-language (Sanity stores a localized object, e.g. `{ en, mk }`). The
 * editor always works in per-locale form state (`{ en: "...", mk: "..." }`);
 * these helpers convert between that and whatever shape the client's schema
 * uses, driven entirely by `config.locales`.
 *
 * This module is pure logic with NO secret — it is not `server-only`. It is
 * imported by the `server-only` read/write paths (and, indirectly, never by a
 * Client Component: the editor receives already-derived values as props).
 *
 * NOTE on the multi-locale storage shape: a real client's exact localized
 * representation (the field name a `@sanity/document-internationalization`-style
 * plugin uses, any `_type` wrapper, etc.) is confirmed against that client's
 * schema in M.01. B.05 ships the **single-locale plain-value path working
 * end-to-end** and renders the multi-locale tabs as scaffolding that writes the
 * documented `{ [locale]: value }` object. Do not invent a shape against a
 * schema that does not exist yet — see `dashboard-Decisions.md`.
 */

/** The client's locales, never empty (falls back to a single `["en"]`). */
export function localeList(config: TenantConfig): string[] {
  return config.locales.length > 0 ? config.locales : ['en']
}

/** The primary (first) locale — the one a single-locale client stores plainly. */
export function primaryLocale(config: TenantConfig): string {
  return localeList(config)[0]
}

/** True when the client's blog is multi-language (more than one locale). */
export function isMultiLocale(config: TenantConfig): boolean {
  return localeList(config).length > 1
}

/**
 * Wrap per-locale values into the shape the client's schema stores.
 *
 * - **Single-locale** → the plain value for the primary locale (string, Portable
 *   Text array, …). This is the working v1 path.
 * - **Multi-locale** → a localized object `{ [locale]: value }` containing only
 *   the configured locales that have a value.
 *
 * Generic over the value type so the same logic serves string fields (title,
 * excerpt) and the Portable Text `body` array.
 */
export function toFieldValue<T>(
  config: TenantConfig,
  perLocale: Record<string, T>,
): unknown {
  if (isMultiLocale(config)) {
    const obj: Record<string, T> = {}
    for (const loc of localeList(config)) {
      if (perLocale[loc] !== undefined) obj[loc] = perLocale[loc]
    }
    return obj
  }
  return perLocale[primaryLocale(config)]
}

/**
 * Unwrap a stored value into per-locale **raw** values (whatever type the schema
 * holds — string, Portable Text array, …), keyed by locale.
 *
 * The shape is detected, not assumed: a plain object (not an array) is treated
 * as a localized wrapper and its non-system entries become the per-locale map; a
 * non-object (string / array / primitive) is treated as a single value attributed
 * to the primary locale. Sanity system keys (`_type`, `_key`, …) are skipped, so
 * a localized wrapper's `_type` is never mistaken for a locale (mirrors the
 * `displayValue` semantics in the read path).
 */
export function fromLocalizedRaw(
  config: TenantConfig,
  value: unknown,
): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('_')) continue
      out[key] = val
    }
    return out
  }
  if (value === null || value === undefined) return {}
  return { [primaryLocale(config)]: value }
}

/**
 * String-specialized inverse of {@link toFieldValue} for the title/excerpt-style
 * fields. Returns a per-locale map covering every configured locale (absent or
 * non-string values become `""`) so the form always has a defined value to bind.
 */
export function fromFieldValue(
  config: TenantConfig,
  value: unknown,
): Record<string, string> {
  const raw = fromLocalizedRaw(config, value)
  const out: Record<string, string> = {}
  for (const loc of localeList(config)) {
    const v = raw[loc]
    out[loc] = typeof v === 'string' ? v : ''
  }
  return out
}
