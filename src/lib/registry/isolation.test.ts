import { describe, expect, it } from 'vitest'

import type { EncryptedToken } from '@/lib/crypto/tokens'
import { listPosts, type SanityReader } from '@/lib/sanity/posts'

import {
  resolveTenantWith,
  TenantResolutionError,
  type ClientRow,
  type RegistrySource,
  type ResolveDeps,
} from './resolve-tenant'
import type { TenantConfig } from './types'

/**
 * B.04 — the load-bearing cross-tenant isolation test (offline; no Supabase /
 * Sanity network). It proves the single safety guarantee the whole product
 * rests on: a logged-in user's read path can only ever touch THEIR OWN client's
 * project + token, and an unmapped/unauthenticated user is denied before any
 * token is touched.
 *
 * Everything below uses invented, meaningless strings — there is NO real token,
 * key, project id, or secret anywhere in this file. The "encrypted" stand-ins
 * and the fake `decrypt` exist only to model the seam.
 */

// --- Two fully-distinct tenants, A and B. -----------------------------------

const CLIENT_A_ROW: ClientRow = {
  id: 'client-a',
  label: 'Client A',
  sanity_project_id: 'project-a',
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
  locales: ['en'],
  revalidate_url: null,
}

const CLIENT_B_ROW: ClientRow = {
  id: 'client-b',
  label: 'Client B',
  sanity_project_id: 'project-b',
  dataset: 'production',
  blog_doc_type: 'article',
  field_map: {
    title: 'headline',
    body: 'content',
    excerpt: 'summary',
    image: 'hero',
    status: 'state',
    slug: 'slug.current',
  },
  locales: ['en'],
  revalidate_url: null,
}

// Meaningless encrypted stand-ins (NOT real secrets) and the distinct tokens a
// correct decrypt yields for each.
const ENC_A: EncryptedToken = { ciphertext: 'cipher-A', iv: 'iv-A', authTag: 'tag-A' }
const ENC_B: EncryptedToken = { ciphertext: 'cipher-B', iv: 'iv-B', authTag: 'tag-B' }
const TOKEN_A = 'invented-token-for-A'
const TOKEN_B = 'invented-token-for-B'

/** Fake decrypt: each tenant's stand-in maps to that tenant's distinct token. */
function fakeDecrypt(enc: EncryptedToken): string {
  if (enc.ciphertext === ENC_A.ciphertext) return TOKEN_A
  if (enc.ciphertext === ENC_B.ciphertext) return TOKEN_B
  throw new Error('fakeDecrypt: unknown ciphertext')
}

/** Canned docs per project, keyed by sanityProjectId — the only way to get a
 *  tenant's posts is to build the client with that tenant's project id. */
const PROJECT_DOCS: Record<string, Array<Record<string, unknown>>> = {
  'project-a': [
    {
      _id: 'a1',
      _updatedAt: '2026-02-01T10:00:00Z',
      title: 'Alpha Published',
      excerpt: 'a excerpt',
      slug: 'alpha',
    },
    {
      _id: 'drafts.a2',
      _updatedAt: '2026-02-02T10:00:00Z',
      title: 'Alpha Draft',
      excerpt: null,
      slug: null,
    },
  ],
  'project-b': [
    {
      _id: 'b1',
      _updatedAt: '2026-01-15T10:00:00Z',
      title: 'Beta Published',
      excerpt: 'b excerpt',
      slug: 'beta',
    },
  ],
}

/** An in-memory registry that records which client ids each read was keyed to. */
function makeRegistry() {
  const mappings = new Map<string, string>([
    ['user-a', 'client-a'],
    ['user-b', 'client-b'],
  ])
  const configs = new Map<string, ClientRow>([
    ['client-a', CLIENT_A_ROW],
    ['client-b', CLIENT_B_ROW],
  ])
  const secrets = new Map<string, EncryptedToken>([
    ['client-a', ENC_A],
    ['client-b', ENC_B],
  ])

  const mappingReads: string[] = []
  const configReads: string[] = []
  const secretReads: string[] = []

  const source: RegistrySource = {
    async getMappingClientId(userId) {
      mappingReads.push(userId)
      return mappings.get(userId) ?? null
    },
    async getClientConfig(clientId) {
      configReads.push(clientId)
      return configs.get(clientId) ?? null
    },
    async getEncryptedSecret(clientId) {
      secretReads.push(clientId)
      return secrets.get(clientId) ?? null
    },
  }

  return { source, mappingReads, configReads, secretReads }
}

/** A recording Sanity client factory: captures the (config, token) it is built
 *  with, and serves ONLY the docs of the project it was built for. */
function makeRecordingClient() {
  const constructions: Array<{ config: TenantConfig; token: string }> = []
  const factory = (config: TenantConfig, token: string): SanityReader => {
    constructions.push({ config, token })
    return {
      async fetch<T>(): Promise<T> {
        const docs = PROJECT_DOCS[config.sanityProjectId] ?? []
        return docs as unknown as T
      },
    }
  }
  return { factory, constructions }
}

/** Run the resolver and return the typed `reason` of the rejection it throws. */
async function reasonOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    if (error instanceof TenantResolutionError) return error.reason
    throw error
  }
  throw new Error('expected a TenantResolutionError, but none was thrown')
}

function depsFor(userId: string | null, source: RegistrySource): ResolveDeps {
  return { getUserId: async () => userId, source, decrypt: fakeDecrypt }
}

describe('cross-tenant isolation — B.04 read path', () => {
  it('A→A and B→B: each user lists only their own client’s posts', async () => {
    const { source } = makeRegistry()

    const recA = makeRecordingClient()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    const postsA = await listPosts(tenantA, recA.factory)

    // Newest-first; A's posts only, never any of B's.
    expect(postsA.map((p) => p.title)).toEqual(['Alpha Draft', 'Alpha Published'])
    expect(postsA.some((p) => p.title.includes('Beta'))).toBe(false)

    const recB = makeRecordingClient()
    const tenantB = await resolveTenantWith(depsFor('user-b', source))
    const postsB = await listPosts(tenantB, recB.factory)

    expect(postsB.map((p) => p.title)).toEqual(['Beta Published'])
    expect(postsB.some((p) => p.title.includes('Alpha'))).toBe(false)
  })

  it('builds the Sanity client with the owner’s project + token, never the other tenant’s', async () => {
    const { source } = makeRegistry()

    const recA = makeRecordingClient()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    await listPosts(tenantA, recA.factory)

    expect(recA.constructions).toHaveLength(1)
    const builtWith = recA.constructions[0]
    expect(builtWith.config.clientId).toBe('client-a')
    expect(builtWith.config.sanityProjectId).toBe('project-a')
    expect(builtWith.token).toBe(TOKEN_A)
    // Categorically not the other tenant's project or token.
    expect(builtWith.config.sanityProjectId).not.toBe('project-b')
    expect(builtWith.token).not.toBe(TOKEN_B)
  })

  it('keys the secret read to the owner’s client id (never the other tenant’s)', async () => {
    const { source, secretReads } = makeRegistry()
    await resolveTenantWith(depsFor('user-a', source))

    expect(secretReads).toEqual(['client-a'])
    expect(secretReads).not.toContain('client-b')
  })

  it('takes no caller-supplied client/project id — the session identity is the only selector', async () => {
    // `resolveTenantWith(deps)` has no client/project parameter (assert by
    // construction). Pointed at the SAME registry, each identity yields exactly
    // that session owner's client — there is no input by which a caller could
    // request a different one.
    const { source } = makeRegistry()

    const a = await resolveTenantWith(depsFor('user-a', source))
    const b = await resolveTenantWith(depsFor('user-b', source))

    expect(a.config.clientId).toBe('client-a')
    expect(a.config.sanityProjectId).toBe('project-a')
    expect(a.token).toBe(TOKEN_A)

    expect(b.config.clientId).toBe('client-b')
    expect(b.config.sanityProjectId).toBe('project-b')
    expect(b.token).toBe(TOKEN_B)
  })

  describe('fail closed', () => {
    it('an unmapped user throws `no-client`, and the read path is never reached', async () => {
      const { source, secretReads } = makeRegistry()
      const rec = makeRecordingClient()

      // Model the page's flow: resolve → (only then) list. Resolution must throw
      // before any secret read or Sanity client construction.
      let reachedReadPath = false
      const run = async () => {
        const tenant = await resolveTenantWith(depsFor('user-unmapped', source))
        reachedReadPath = true
        await listPosts(tenant, rec.factory)
      }

      expect(await reasonOf(run)).toBe('no-client')
      expect(reachedReadPath).toBe(false)
      expect(secretReads).toHaveLength(0)
      expect(rec.constructions).toHaveLength(0)
    })

    it('a null session throws `unauthenticated` before any registry read', async () => {
      const { source, mappingReads, secretReads } = makeRegistry()

      expect(await reasonOf(() => resolveTenantWith(depsFor(null, source)))).toBe(
        'unauthenticated',
      )
      // Nothing in the registry was touched.
      expect(mappingReads).toHaveLength(0)
      expect(secretReads).toHaveLength(0)
    })

    it('a missing config row throws `config-missing` before the secret is read', async () => {
      const { secretReads } = makeRegistry()
      // A registry where the mapping exists but the config row is gone.
      const source: RegistrySource = {
        async getMappingClientId() {
          return 'client-a'
        },
        async getClientConfig() {
          return null
        },
        async getEncryptedSecret(clientId) {
          secretReads.push(clientId)
          return ENC_A
        },
      }

      expect(await reasonOf(() => resolveTenantWith(depsFor('user-a', source)))).toBe(
        'config-missing',
      )
      expect(secretReads).toHaveLength(0)
    })

    it('a missing secret throws `secret-missing` (no plaintext fallback)', async () => {
      const source: RegistrySource = {
        async getMappingClientId() {
          return 'client-a'
        },
        async getClientConfig() {
          return CLIENT_A_ROW
        },
        async getEncryptedSecret() {
          return null
        },
      }

      expect(await reasonOf(() => resolveTenantWith(depsFor('user-a', source)))).toBe(
        'secret-missing',
      )
    })

    it('a decrypt failure propagates and is never swallowed into a plaintext token', async () => {
      const source: RegistrySource = {
        async getMappingClientId() {
          return 'client-a'
        },
        async getClientConfig() {
          return CLIENT_A_ROW
        },
        async getEncryptedSecret() {
          // A stand-in that fakeDecrypt does not recognise → throws.
          return { ciphertext: 'tampered', iv: 'iv', authTag: 'tag' }
        },
      }

      await expect(
        resolveTenantWith(depsFor('user-a', source)),
      ).rejects.toThrow(/unknown ciphertext/)
    })
  })
})
