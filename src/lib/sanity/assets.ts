import 'server-only'

import type { TenantConfig, TenantContext } from '@/lib/registry/types'

import { createTenantSanityClient } from './client'

/**
 * The image-upload path (B.06) — the ONLY place featured-image bytes are sent to a
 * client's Sanity dataset.
 *
 * Like the write path (`./mutations`), it takes a fully-resolved
 * {@link TenantContext} (the caller must have obtained it from `resolveTenant()`,
 * which authenticates AND authorizes the session owner) plus an injectable
 * uploader factory. The factory is built with the tenant's OWN project + decrypted
 * Editor token and nothing else — there is no parameter by which a caller could
 * target another tenant's project. The bytes upload to that one client's dataset,
 * and only the resulting asset reference is written onto the post (in
 * `./mutations`). The token lives only on `tenant.token`; it is never returned,
 * serialized, or logged.
 *
 * Why this lives server-side: a browser-direct upload would require a
 * browser-exposed Sanity token, which violates the load-bearing "no Sanity token
 * ever reaches the browser" invariant (see AGENTS.md → Security boundary).
 */

/** Allowed featured-image MIME types (the editor's `accept` mirrors this). */
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/**
 * App-level maximum upload size: **4 MB**. Server Actions run as Vercel Functions,
 * which hard-reject any request body over 4.5 MB with a 413 that cannot be raised
 * and surfaces only in production. 4 MB stays safely under that ceiling once
 * multipart overhead is counted, and is rejected here (server-side) with a
 * friendly message well before the platform limit bites. See the 2026-06-27
 * Decisions entry.
 */
const MAX_BYTES = 4 * 1024 * 1024

/** Upper bound for a submitted asset id, so a junk `_ref` can never be written. */
const MAX_ASSET_ID_LENGTH = 200

/**
 * The canonical Sanity image asset id shape: `image-<hash>-<w>x<h>-<ext>`
 * (e.g. `image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg`). Used to validate an
 * asset id a form submits before it is trusted as a reference `_ref` value.
 */
const ASSET_ID = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$/

/**
 * True when `id` is a sane, bounded Sanity image asset id. The id is written as
 * document DATA (not interpolated into GROQ), but a malformed value must never be
 * written as a `_ref`, so the editor's submitted asset id is validated first.
 */
export function isValidAssetId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= MAX_ASSET_ID_LENGTH &&
    ASSET_ID.test(id)
  )
}

/** Why an upload was rejected — a machine reason the action maps to a message. */
export type ImageUploadReason = 'too-large' | 'unsupported-type' | 'empty'

/** A typed, non-leaking upload rejection. Carries only a machine `reason`. */
export class ImageUploadError extends Error {
  readonly reason: ImageUploadReason
  constructor(reason: ImageUploadReason, message: string) {
    super(message)
    this.name = 'ImageUploadError'
    this.reason = reason
  }
}

/** The asset-document subset this module relies on (id + public CDN url). */
interface UploadedAsset {
  _id: string
  url: string
}

/**
 * The minimal upload transport this module needs — a structural subset of
 * `@sanity/client`'s `assets.upload`. Injectable so the offline isolation/unit
 * tests can record the project + token each uploader was built with (and the
 * dispatched bytes) without any network.
 */
export interface AssetUploader {
  assets: {
    upload(
      assetType: 'image',
      body: Buffer,
      options?: { filename?: string; contentType?: string },
    ): Promise<UploadedAsset>
  }
}

/** Builds the per-tenant uploader. Defaults to the real per-tenant Sanity client. */
export type MakeUploader = (config: TenantConfig, token: string) => AssetUploader

/** The default uploader is the real per-tenant Sanity client (carries the token). */
const defaultMakeUploader: MakeUploader = (config, token) =>
  createTenantSanityClient(config, token)

/**
 * Upload one featured image into the resolved tenant's own Sanity dataset and
 * return the resulting `{ assetId, url }`.
 *
 * Validates BEFORE any byte is sent (throws a typed {@link ImageUploadError}):
 * rejects an empty/zero-byte file (`empty`), a file over {@link MAX_BYTES}
 * (`too-large`), and any type outside {@link ALLOWED_TYPES} (`unsupported-type`).
 * The web `File` is converted to a Node `Buffer` first — passing a `File`/`Blob`
 * straight into `assets.upload` inside the Next server runtime can throw
 * "Request body must be a string, buffer or stream, got object" (sanity-io/client
 * #135).
 *
 * The token is never returned or logged; only the asset id + public CDN url leave
 * this function.
 */
export async function uploadImage(
  tenant: TenantContext,
  file: File,
  makeUploader: MakeUploader = defaultMakeUploader,
): Promise<{ assetId: string; url: string }> {
  if (!file || file.size === 0) {
    throw new ImageUploadError('empty', 'No image file was provided.')
  }
  if (file.size > MAX_BYTES) {
    throw new ImageUploadError(
      'too-large',
      'The image is larger than the 4 MB limit.',
    )
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageUploadError(
      'unsupported-type',
      'The file type is not a supported image format.',
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploader = makeUploader(tenant.config, tenant.token)
  const asset = await uploader.assets.upload('image', buffer, {
    filename: file.name,
    contentType: file.type,
  })

  return { assetId: asset._id, url: asset.url }
}
