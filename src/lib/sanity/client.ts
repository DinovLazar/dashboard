import 'server-only'

import { createClient, type SanityClient } from '@sanity/client'

import type { TenantConfig } from '@/lib/registry/types'

/**
 * Per-tenant Sanity client factory (B.04).
 *
 * The portal builds a fresh server-side `@sanity/client` **per request, per
 * tenant** from the resolved client's project + decrypted Editor token (see the
 * 2026-06-27 decision: direct `@sanity/client`, not `next-sanity`). The token is
 * a server-only secret — this module is `server-only` and the client it returns
 * must never be handed to a Client Component.
 */

/**
 * Pinned Sanity API version. Hard-coded (never a dynamic date) so query
 * behaviour is reproducible across deploys. Must be ≥ 2025-02-19 for the
 * `perspective: 'raw'` semantics below.
 */
export const SANITY_API_VERSION = '2026-03-01'

/**
 * Build a Sanity client for one tenant.
 *
 * `useCdn: false` + `perspective: 'raw'` + a token: this is **editorial
 * tooling**, so it must read live (uncached) and see drafts AND published
 * side by side. Since API version 2025-02-19 the default perspective is
 * `published` (drafts hidden); `raw` returns the base document and its
 * `drafts.`-prefixed variant as separate entries — exactly what the post list
 * needs to show whether each post is published, draft, or published-with-edits.
 * The `drafts` perspective is deliberately NOT used: it collapses to one entry
 * per post and hides publish status. (Verified against `@sanity/client@7.22.1`.)
 */
export function createTenantSanityClient(
  config: TenantConfig,
  token: string,
): SanityClient {
  if (!token) {
    throw new Error(
      'createTenantSanityClient: a non-empty Editor token is required.',
    )
  }

  return createClient({
    projectId: config.sanityProjectId,
    dataset: config.dataset,
    token,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    perspective: 'raw',
  })
}
