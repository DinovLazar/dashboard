/**
 * Shared throwaway fixtures for the B.03 seed + verify scripts.
 *
 * NONE of this is a secret. The "token" below is a DUMMY placeholder string, not
 * a real Sanity token — real per-client tokens are onboarded in M.01 and live
 * only in the operator's environment, never in the repo. Keeping the seed and
 * verify scripts in agreement on these values is the only reason this file
 * exists.
 */

/** A deliberately fake token. Encrypted on seed, decrypted on verify. */
export const DUMMY_TOKEN = 'DUMMY-NOT-A-REAL-TOKEN'

/** The throwaway test client's config (mirrors the §6 per-client config shape). */
export const TEST_CLIENT = {
  label: 'TEST — throwaway',
  sanity_project_id: 'test-throwaway',
  dataset: 'production',
  blog_doc_type: 'blogPost',
  field_map: {
    title: 'title',
    body: 'body',
    excerpt: 'excerpt',
    image: 'mainImage',
    status: 'status',
    slug: 'slug.current',
  },
  locales: ['en', 'mk'],
  revalidate_url: null as string | null,
} as const
