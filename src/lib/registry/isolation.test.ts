import { describe, expect, it } from 'vitest'

import type { EncryptedToken } from '@/lib/crypto/tokens'
import {
  uploadImage,
  type AssetUploader,
  type MakeUploader,
} from '@/lib/sanity/assets'
import {
  createDraft,
  deletePost,
  publishPost,
  saveDraft,
  type EditorFields,
  type MakeWriter,
  type MutationDoc,
  type WriteTransaction,
} from '@/lib/sanity/mutations'
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

// --- Write path (B.05) ------------------------------------------------------

/** Editor input used by the write-path cases (meaningless content). */
const WRITE_FIELDS: EditorFields = {
  title: { en: 'A headline' },
  excerpt: { en: 'A summary' },
  slug: null,
  body: { en: 'Body text.' },
}

/** A seeded draft per project so save/publish have a working copy to read. */
const PROJECT_WRITE_DOCS: Record<
  string,
  Array<Record<string, unknown> & { _id?: string }>
> = {
  'project-a': [{ _id: 'drafts.a1', _type: 'blogPost', title: 'A draft' }],
  'project-b': [{ _id: 'drafts.b1', _type: 'article', headline: 'B draft' }],
}

/**
 * A recording WRITER factory — the write-path analogue of `makeRecordingClient`.
 * It captures the (config, token) every writer is built with, and records the
 * project + token EACH actual dispatch (a `createOrReplace` or a committed
 * transaction) flows through. The §5 gate asserts on both: a write must never be
 * built with, nor dispatched through, another tenant's project or token.
 */
function makeRecordingWriter() {
  const constructions: Array<{ config: TenantConfig; token: string }> = []
  const dispatches: Array<{
    project: string
    token: string
    doc?: MutationDoc
  }> = []

  const factory: MakeWriter = (config, token) => {
    constructions.push({ config, token })
    const record = (doc?: MutationDoc) =>
      dispatches.push({ project: config.sanityProjectId, token, doc })
    return {
      async fetch<T>(_query: string, params?: Record<string, unknown>): Promise<T> {
        const docs = PROJECT_WRITE_DOCS[config.sanityProjectId] ?? []
        return docs.filter(
          (d) => d._id === params?.id || d._id === params?.draftId,
        ) as unknown as T
      },
      async createOrReplace(doc) {
        record(doc)
        return {}
      },
      transaction(): WriteTransaction {
        const txn: WriteTransaction = {
          createOrReplace: () => txn,
          delete: () => txn,
          async commit() {
            record()
            return {}
          },
        }
        return txn
      },
    }
  }

  return { factory, constructions, dispatches }
}

/**
 * A recording UPLOADER factory (B.06) — the image-upload analogue of
 * `makeRecordingWriter`. Captures the (config, token) every uploader is built
 * with and the project + token each actual upload dispatches through, with no
 * network. The §5 gate asserts a tenant's image bytes never flow through another
 * tenant's project or token.
 */
function makeRecordingUploader() {
  const constructions: Array<{ config: TenantConfig; token: string }> = []
  const uploads: Array<{ project: string; token: string }> = []

  const factory: MakeUploader = (config, token): AssetUploader => {
    constructions.push({ config, token })
    return {
      assets: {
        async upload() {
          uploads.push({ project: config.sanityProjectId, token })
          return {
            _id: 'image-iso-1x1-png',
            url: 'https://cdn.sanity.io/images/iso/iso/image-iso-1x1-png.png',
          }
        },
      },
    }
  }

  return { factory, constructions, uploads }
}

/** A tiny real image File for the upload-isolation cases. */
function smallImageFile(): File {
  return new File([new Uint8Array([1, 2, 3])], 'iso.png', { type: 'image/png' })
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

describe('cross-tenant isolation — B.05 write path (the §5 gate)', () => {
  it('every mutation builds + dispatches only through the owner’s project + token', async () => {
    const { source } = makeRegistry()

    // A → A: exercise all four mutations through one recording writer.
    const recA = makeRecordingWriter()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    await createDraft(tenantA, WRITE_FIELDS, recA.factory)
    await saveDraft(tenantA, 'a1', WRITE_FIELDS, recA.factory)
    await publishPost(tenantA, 'a1', recA.factory)
    await deletePost(tenantA, 'a1', recA.factory)

    // Every writer was BUILT with A's project + token, never B's.
    expect(recA.constructions.length).toBeGreaterThan(0)
    for (const c of recA.constructions) {
      expect(c.config.clientId).toBe('client-a')
      expect(c.config.sanityProjectId).toBe('project-a')
      expect(c.token).toBe(TOKEN_A)
      expect(c.config.sanityProjectId).not.toBe('project-b')
      expect(c.token).not.toBe(TOKEN_B)
    }
    // Every actual write DISPATCHED through A's project + token. All four
    // mutations dispatch exactly once (create + save + publish + delete) — the
    // count makes the publish assertion non-vacuous: a silent publish no-op
    // would drop the count below 4 and fail here, not pass unnoticed.
    expect(recA.dispatches).toHaveLength(4)
    for (const d of recA.dispatches) {
      expect(d.project).toBe('project-a')
      expect(d.token).toBe(TOKEN_A)
      expect(d.project).not.toBe('project-b')
      expect(d.token).not.toBe(TOKEN_B)
    }

    // B → B symmetrically: never A's project or token.
    const recB = makeRecordingWriter()
    const tenantB = await resolveTenantWith(depsFor('user-b', source))
    await createDraft(tenantB, WRITE_FIELDS, recB.factory)
    await saveDraft(tenantB, 'b1', WRITE_FIELDS, recB.factory)
    await publishPost(tenantB, 'b1', recB.factory)
    await deletePost(tenantB, 'b1', recB.factory)

    for (const c of recB.constructions) {
      expect(c.config.sanityProjectId).toBe('project-b')
      expect(c.token).toBe(TOKEN_B)
      expect(c.config.sanityProjectId).not.toBe('project-a')
      expect(c.token).not.toBe(TOKEN_A)
    }
    expect(recB.dispatches).toHaveLength(4)
    for (const d of recB.dispatches) {
      expect(d.project).toBe('project-b')
      expect(d.token).toBe(TOKEN_B)
      expect(d.project).not.toBe('project-a')
      expect(d.token).not.toBe(TOKEN_A)
    }
  })

  it('an attacker-controlled / foreign post id still dispatches only through the owner’s project + token', async () => {
    const { source } = makeRegistry()
    const recA = makeRecordingWriter()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))

    // Feed A's session a foreign-looking id (B's doc id, and a prefixed variant).
    // The id only ever selects within A's OWN dataset — it can never reach B.
    await saveDraft(tenantA, 'b1', WRITE_FIELDS, recA.factory)
    await deletePost(tenantA, 'drafts.b1', recA.factory)
    await publishPost(tenantA, 'versions.rX.b1', recA.factory)

    for (const c of recA.constructions) {
      expect(c.config.sanityProjectId).toBe('project-a')
      expect(c.token).toBe(TOKEN_A)
    }
    for (const d of recA.dispatches) {
      expect(d.project).toBe('project-a')
      expect(d.token).toBe(TOKEN_A)
      expect(d.project).not.toBe('project-b')
      expect(d.token).not.toBe(TOKEN_B)
    }
  })

  it('takes no caller-supplied client/project/token — the session identity is the only selector', async () => {
    // Asserted by construction: createDraft/saveDraft/publishPost/deletePost take
    // (tenant, [id], fields, makeWriter). `tenant` comes only from resolveTenant
    // (the session identity); there is NO project/client/token parameter. The same
    // registry pointed at each identity yields only that owner's writes.
    const { source } = makeRegistry()
    const recA = makeRecordingWriter()
    const recB = makeRecordingWriter()

    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    const tenantB = await resolveTenantWith(depsFor('user-b', source))
    await createDraft(tenantA, WRITE_FIELDS, recA.factory)
    await createDraft(tenantB, WRITE_FIELDS, recB.factory)

    expect(
      recA.constructions.every(
        (c) => c.token === TOKEN_A && c.config.sanityProjectId === 'project-a',
      ),
    ).toBe(true)
    expect(
      recB.constructions.every(
        (c) => c.token === TOKEN_B && c.config.sanityProjectId === 'project-b',
      ),
    ).toBe(true)
  })

  describe('fail closed before any write', () => {
    it('an unmapped user is denied before any writer is built or secret read', async () => {
      const { source, secretReads } = makeRegistry()
      const rec = makeRecordingWriter()

      // Model the action flow: resolve → (only then) mutate.
      let reachedWritePath = false
      const run = async () => {
        const tenant = await resolveTenantWith(depsFor('user-unmapped', source))
        reachedWritePath = true
        await createDraft(tenant, WRITE_FIELDS, rec.factory)
      }

      expect(await reasonOf(run)).toBe('no-client')
      expect(reachedWritePath).toBe(false)
      expect(rec.constructions).toHaveLength(0)
      expect(rec.dispatches).toHaveLength(0)
      expect(secretReads).toHaveLength(0)
    })

    it('a null session is denied before any writer is built or registry touched', async () => {
      const { source, mappingReads, secretReads } = makeRegistry()
      const rec = makeRecordingWriter()

      let reachedWritePath = false
      const run = async () => {
        const tenant = await resolveTenantWith(depsFor(null, source))
        reachedWritePath = true
        await deletePost(tenant, 'a1', rec.factory)
      }

      expect(await reasonOf(run)).toBe('unauthenticated')
      expect(reachedWritePath).toBe(false)
      expect(rec.constructions).toHaveLength(0)
      expect(mappingReads).toHaveLength(0)
      expect(secretReads).toHaveLength(0)
    })
  })
})

describe('cross-tenant isolation — B.06 image upload + image write (the §5 gate)', () => {
  it('an image upload builds + dispatches only through the owner’s project + token', async () => {
    const { source } = makeRegistry()

    // A → A: the bytes flow only through A's project + token, never B's.
    const recA = makeRecordingUploader()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    await uploadImage(tenantA, smallImageFile(), recA.factory)

    expect(recA.constructions.length).toBeGreaterThan(0)
    for (const c of recA.constructions) {
      expect(c.config.clientId).toBe('client-a')
      expect(c.config.sanityProjectId).toBe('project-a')
      expect(c.token).toBe(TOKEN_A)
      expect(c.config.sanityProjectId).not.toBe('project-b')
      expect(c.token).not.toBe(TOKEN_B)
    }
    expect(recA.uploads.length).toBeGreaterThan(0)
    for (const u of recA.uploads) {
      expect(u.project).toBe('project-a')
      expect(u.token).toBe(TOKEN_A)
      expect(u.project).not.toBe('project-b')
      expect(u.token).not.toBe(TOKEN_B)
    }

    // B → B symmetrically.
    const recB = makeRecordingUploader()
    const tenantB = await resolveTenantWith(depsFor('user-b', source))
    await uploadImage(tenantB, smallImageFile(), recB.factory)

    for (const u of recB.uploads) {
      expect(u.project).toBe('project-b')
      expect(u.token).toBe(TOKEN_B)
      expect(u.project).not.toBe('project-a')
      expect(u.token).not.toBe(TOKEN_A)
    }
  })

  it('the image reference is written only through the owner’s per-tenant writer', async () => {
    const { source } = makeRegistry()
    const recA = makeRecordingWriter()
    const tenantA = await resolveTenantWith(depsFor('user-a', source))

    const ref = 'image-iso-1x1-png'
    await saveDraft(
      tenantA,
      'a1',
      { ...WRITE_FIELDS, image: { assetId: ref } },
      recA.factory,
    )

    // The save dispatched through A's project + token, and the `_ref` landed on
    // A's own image field (`mainImage`) via A's writer — never B's.
    for (const c of recA.constructions) {
      expect(c.config.sanityProjectId).toBe('project-a')
      expect(c.token).toBe(TOKEN_A)
    }
    const written = recA.dispatches.find((d) => d.doc)
    expect(written?.project).toBe('project-a')
    expect(written?.token).toBe(TOKEN_A)
    expect(written?.doc?.mainImage).toEqual({
      _type: 'image',
      asset: { _type: 'reference', _ref: ref },
    })
  })

  it('image upload takes no caller-supplied client/project/token — the session identity is the only selector', async () => {
    // Asserted by construction: `uploadImage(tenant, file, makeUploader)` has no
    // project/client/token parameter; `tenant` comes only from resolveTenant.
    const { source } = makeRegistry()
    const recA = makeRecordingUploader()
    const recB = makeRecordingUploader()

    const tenantA = await resolveTenantWith(depsFor('user-a', source))
    const tenantB = await resolveTenantWith(depsFor('user-b', source))
    await uploadImage(tenantA, smallImageFile(), recA.factory)
    await uploadImage(tenantB, smallImageFile(), recB.factory)

    expect(
      recA.uploads.every(
        (u) => u.token === TOKEN_A && u.project === 'project-a',
      ),
    ).toBe(true)
    expect(
      recB.uploads.every(
        (u) => u.token === TOKEN_B && u.project === 'project-b',
      ),
    ).toBe(true)
  })

  describe('fail closed before any upload', () => {
    it('an unmapped user is denied before any uploader is built or secret read', async () => {
      const { source, secretReads } = makeRegistry()
      const rec = makeRecordingUploader()

      let reachedUploadPath = false
      const run = async () => {
        const tenant = await resolveTenantWith(depsFor('user-unmapped', source))
        reachedUploadPath = true
        await uploadImage(tenant, smallImageFile(), rec.factory)
      }

      expect(await reasonOf(run)).toBe('no-client')
      expect(reachedUploadPath).toBe(false)
      expect(rec.constructions).toHaveLength(0)
      expect(rec.uploads).toHaveLength(0)
      expect(secretReads).toHaveLength(0)
    })

    it('a null session is denied before any uploader is built or registry touched', async () => {
      const { source, mappingReads, secretReads } = makeRegistry()
      const rec = makeRecordingUploader()

      let reachedUploadPath = false
      const run = async () => {
        const tenant = await resolveTenantWith(depsFor(null, source))
        reachedUploadPath = true
        await uploadImage(tenant, smallImageFile(), rec.factory)
      }

      expect(await reasonOf(run)).toBe('unauthenticated')
      expect(reachedUploadPath).toBe(false)
      expect(rec.constructions).toHaveLength(0)
      expect(rec.uploads).toHaveLength(0)
      expect(mappingReads).toHaveLength(0)
      expect(secretReads).toHaveLength(0)
    })
  })
})
