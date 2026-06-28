import { describe, expect, it } from 'vitest'

import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import {
  ImageUploadError,
  isValidAssetId,
  uploadImage,
  type AssetUploader,
  type MakeUploader,
} from './assets'

/**
 * B.06 — image-upload validation + dispatch shape (offline; no Sanity network).
 * Proves the module rejects oversize/bad-type/empty files BEFORE any byte is sent,
 * uploads a good file through the per-tenant uploader (built with the tenant's own
 * project + token), and never returns the token. Uses only invented strings — no
 * real token/key/project id.
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

const TENANT: TenantContext = { config: CONFIG, token: 'invented-token' }

const ASSET = {
  _id: 'image-abc-100x100-png',
  url: 'https://cdn.sanity.io/images/project-x/production/image-abc-100x100-png.png',
}

/** A recording uploader: captures the (config, token) it is built with and the
 *  bytes/options each dispatch flows through, serving a canned asset doc. */
function makeRecordingUploader(asset = ASSET) {
  const constructions: Array<{ config: TenantConfig; token: string }> = []
  const uploads: Array<{
    project: string
    token: string
    type: string
    bytes: number
    options?: { filename?: string; contentType?: string }
  }> = []

  const factory: MakeUploader = (config, token): AssetUploader => {
    constructions.push({ config, token })
    return {
      assets: {
        async upload(type, body, options) {
          uploads.push({
            project: config.sanityProjectId,
            token,
            type,
            bytes: body.length,
            options,
          })
          return asset
        },
      },
    }
  }

  return { factory, constructions, uploads }
}

/** A real File with actual bytes, so `arrayBuffer()` → `Buffer` works. */
function realFile(bytes: number[], type = 'image/png', name = 'ok.png'): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

/** A File-shaped stub with a chosen size/type, so an oversize case needs no real
 *  allocation (validation throws before `arrayBuffer()` is ever called). */
function fakeFile(opts: { size: number; type: string; name?: string }): File {
  return {
    size: opts.size,
    type: opts.type,
    name: opts.name ?? 'f',
    async arrayBuffer() {
      return new ArrayBuffer(0)
    },
  } as unknown as File
}

/** Run an upload and return the typed `reason` of the rejection it throws. */
async function reasonOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    if (error instanceof ImageUploadError) return error.reason
    throw error
  }
  throw new Error('expected an ImageUploadError, but none was thrown')
}

describe('uploadImage — validation (rejects before any byte is sent)', () => {
  it('rejects an empty / zero-byte file as `empty`, without building an uploader', async () => {
    const rec = makeRecordingUploader()
    expect(
      await reasonOf(() =>
        uploadImage(TENANT, fakeFile({ size: 0, type: 'image/png' }), rec.factory),
      ),
    ).toBe('empty')
    expect(rec.constructions).toHaveLength(0)
    expect(rec.uploads).toHaveLength(0)
  })

  it('rejects a file over 4 MB as `too-large`, without building an uploader', async () => {
    const rec = makeRecordingUploader()
    expect(
      await reasonOf(() =>
        uploadImage(
          TENANT,
          fakeFile({ size: 4 * 1024 * 1024 + 1, type: 'image/png' }),
          rec.factory,
        ),
      ),
    ).toBe('too-large')
    expect(rec.constructions).toHaveLength(0)
    expect(rec.uploads).toHaveLength(0)
  })

  it('accepts a file at exactly the 4 MB boundary (not over the cap)', async () => {
    const rec = makeRecordingUploader()
    // 4 MB exactly is allowed; only strictly-greater is rejected.
    await expect(
      uploadImage(
        TENANT,
        // A stub at exactly the cap whose arrayBuffer returns a small buffer.
        fakeFile({ size: 4 * 1024 * 1024, type: 'image/png' }),
        rec.factory,
      ),
    ).resolves.toEqual({ assetId: ASSET._id, url: ASSET.url })
  })

  it('rejects an unsupported type as `unsupported-type`', async () => {
    const rec = makeRecordingUploader()
    for (const type of ['application/pdf', 'image/svg+xml', 'text/plain', '']) {
      expect(
        await reasonOf(() =>
          uploadImage(TENANT, fakeFile({ size: 10, type }), rec.factory),
        ),
      ).toBe('unsupported-type')
    }
    expect(rec.constructions).toHaveLength(0)
  })

  it('accepts each allowed image type', async () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      const rec = makeRecordingUploader()
      await expect(
        uploadImage(TENANT, realFile([1, 2, 3], type), rec.factory),
      ).resolves.toEqual({ assetId: ASSET._id, url: ASSET.url })
    }
  })
})

describe('uploadImage — dispatch shape', () => {
  it('builds the uploader with the tenant’s own project + token and uploads a Buffer', async () => {
    const rec = makeRecordingUploader()
    const result = await uploadImage(
      TENANT,
      realFile([1, 2, 3, 4], 'image/jpeg', 'hero.jpg'),
      rec.factory,
    )

    expect(result).toEqual({ assetId: ASSET._id, url: ASSET.url })

    expect(rec.constructions).toEqual([
      { config: CONFIG, token: 'invented-token' },
    ])
    expect(rec.uploads).toHaveLength(1)
    const [u] = rec.uploads
    expect(u.project).toBe('project-x')
    expect(u.token).toBe('invented-token')
    expect(u.type).toBe('image')
    expect(u.bytes).toBe(4) // the 4 bytes, converted File → Buffer
    expect(u.options).toEqual({ filename: 'hero.jpg', contentType: 'image/jpeg' })
  })

  it('never returns or stringifies the token', async () => {
    const rec = makeRecordingUploader()
    const result = await uploadImage(TENANT, realFile([1]), rec.factory)
    expect(JSON.stringify(result)).not.toContain('invented-token')
    expect(result.assetId).toBe(ASSET._id)
    expect(result.url).toBe(ASSET.url)
  })
})

describe('isValidAssetId', () => {
  it('accepts canonical Sanity image asset ids', () => {
    expect(isValidAssetId('image-abc-100x100-png')).toBe(true)
    expect(
      isValidAssetId('image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg'),
    ).toBe(true)
    expect(isValidAssetId('image-Z9-1x1-webp')).toBe(true)
  })

  it('rejects malformed, empty, wrong-prefix, or injection-shaped ids', () => {
    for (const bad of [
      '',
      'not-an-image',
      'image-abc', // missing dims + ext
      'image-abc-100x100', // missing ext
      'file-abc-100x100-png', // wrong prefix (file, not image)
      'image abc-100x100-png', // space
      'drafts.image-abc-100x100-png',
      'image-abc-100x100-png; *[_type=="secret"]', // injection-shaped
      'image-abc-100x100-PNG', // uppercase ext not allowed
      `image-${'a'.repeat(300)}-1x1-png`, // over the length bound
    ]) {
      expect(isValidAssetId(bad)).toBe(false)
    }
  })

  it('rejects non-strings', () => {
    expect(isValidAssetId(undefined)).toBe(false)
    expect(isValidAssetId(null)).toBe(false)
    expect(isValidAssetId(123)).toBe(false)
    expect(isValidAssetId({})).toBe(false)
  })
})
