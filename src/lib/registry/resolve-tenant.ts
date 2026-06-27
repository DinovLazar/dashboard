import 'server-only'

import { cache } from 'react'

import { decryptToken, type EncryptedToken } from '@/lib/crypto/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import type { TenantConfig, TenantContext } from './types'

/**
 * Tenant resolution (B.04) — the heart of the security boundary.
 *
 * Turns the logged-in user into the ONE client they may act on: their config +
 * decrypted Sanity Editor token. Everything is derived from the validated
 * Supabase session (`getClaims().sub`); a caller can NEVER supply a client id,
 * project id, or token. The lookups fail closed — any missing step throws a
 * typed {@link TenantResolutionError} rather than guessing or falling back to a
 * different tenant.
 *
 * Defense in depth (AGENTS.md → Security boundary):
 *   - the user → client mapping and the client config are read through the
 *     **RLS-scoped** Supabase client, so even a resolver bug can't cross tenants
 *     on config;
 *   - the encrypted token is read **only** through the service-role client,
 *     keyed on the already-resolved, user-owned `client_id`;
 *   - the token is decrypted only after every user-scoped lookup has succeeded,
 *     and a tamper/wrong-key error is allowed to propagate (never a plaintext
 *     fallback).
 *
 * The logic is a pure core, `resolveTenantWith(deps)`, whose external
 * dependencies (session, registry reads, decrypt) are injected through small
 * interfaces so the cross-tenant isolation test runs fully offline. The
 * production wrapper, `resolveTenant`, wires the real dependencies and is
 * `cache()`-deduplicated per request.
 */

export type TenantResolutionReason =
  | 'unauthenticated'
  | 'no-client'
  | 'config-missing'
  | 'secret-missing'

/** Typed failure for every fail-closed path in the resolver. */
export class TenantResolutionError extends Error {
  readonly reason: TenantResolutionReason

  constructor(reason: TenantResolutionReason, message?: string) {
    super(message ?? `Tenant resolution failed: ${reason}`)
    this.name = 'TenantResolutionError'
    this.reason = reason
  }
}

/** One `clients` row as returned by Supabase (snake_case; `field_map` is jsonb). */
export interface ClientRow {
  id: string
  label: string
  sanity_project_id: string
  dataset: string
  blog_doc_type: string
  field_map: Record<string, unknown>
  locales: string[]
  revalidate_url: string | null
}

/**
 * The three reads the resolver needs, bundled so they can be faked offline.
 * Each method's scope is part of the security contract:
 *   - `getMappingClientId` / `getClientConfig` — user-scoped (RLS-enforced).
 *   - `getEncryptedSecret` — service-role (the only path to `client_secrets`).
 */
export interface RegistrySource {
  /** The user's mapped client id, or null if they map to none. */
  getMappingClientId(userId: string): Promise<string | null>
  /** The client's config row, or null if not visible/found. */
  getClientConfig(clientId: string): Promise<ClientRow | null>
  /** The client's encrypted token parts, or null if absent. */
  getEncryptedSecret(clientId: string): Promise<EncryptedToken | null>
}

/** Everything the pure resolver core depends on. */
export interface ResolveDeps {
  /** The authenticated user id (the session `sub`), or null if anonymous. */
  getUserId(): Promise<string | null>
  source: RegistrySource
  /** Decrypts an encrypted token; throws on tamper/wrong key. */
  decrypt(enc: EncryptedToken): string
}

/** Map a raw `clients` row to the camelCase {@link TenantConfig}. */
export function mapRowToConfig(row: ClientRow): TenantConfig {
  // field_map is operator-set jsonb; treat its values as strings. Field names
  // are validated again by `assertSafeFieldPath` before they touch a GROQ query.
  const fm = (row.field_map ?? {}) as Record<string, string>
  return {
    clientId: row.id,
    label: row.label,
    sanityProjectId: row.sanity_project_id,
    dataset: row.dataset,
    blogDocType: row.blog_doc_type,
    fieldMap: {
      title: fm.title,
      body: fm.body,
      excerpt: fm.excerpt,
      image: fm.image,
      status: fm.status,
      slug: fm.slug,
    },
    locales: row.locales ?? [],
    revalidateUrl: row.revalidate_url,
  }
}

/**
 * Pure resolver core. The ONLY input is the injected session identity — there is
 * no parameter by which a caller can request a different client or project.
 * Steps run in order and fail closed:
 *   1. user id from the session       → else `unauthenticated`
 *   2. user → client mapping (RLS)    → else `no-client`
 *   3. client config (RLS)            → else `config-missing`
 *   4. encrypted token (service-role) → else `secret-missing`
 *   5. decrypt (throws on tamper)     → propagates
 */
export async function resolveTenantWith(
  deps: ResolveDeps,
): Promise<TenantContext> {
  const userId = await deps.getUserId()
  if (!userId) {
    throw new TenantResolutionError('unauthenticated')
  }

  const clientId = await deps.source.getMappingClientId(userId)
  if (!clientId) {
    throw new TenantResolutionError('no-client')
  }

  const row = await deps.source.getClientConfig(clientId)
  if (!row) {
    throw new TenantResolutionError('config-missing')
  }

  const enc = await deps.source.getEncryptedSecret(clientId)
  if (!enc) {
    throw new TenantResolutionError('secret-missing')
  }

  // Let a tamper/wrong-key error propagate — never fall back to plaintext.
  const token = deps.decrypt(enc)

  return { config: mapRowToConfig(row), token }
}

/**
 * The production dependency wiring: the validated session, the RLS-scoped config
 * reads, the service-role secret read, and the real `decryptToken`.
 */
const realDeps: ResolveDeps = {
  async getUserId() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    // `sub` is the authenticated user id — mirrors the (portal) layout's gate.
    const sub = data?.claims?.sub
    return typeof sub === 'string' && sub.length > 0 ? sub : null
  },

  source: {
    async getMappingClientId(userId) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return (data?.client_id as string | undefined) ?? null
    },

    async getClientConfig(clientId) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('clients')
        .select(
          'id, label, sanity_project_id, dataset, blog_doc_type, field_map, locales, revalidate_url',
        )
        .eq('id', clientId)
        .maybeSingle()
      if (error) throw error
      return (data as ClientRow | null) ?? null
    },

    async getEncryptedSecret(clientId) {
      // Service-role only — `client_secrets` is denied to browser sessions.
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('client_secrets')
        .select('token_ciphertext, token_iv, token_auth_tag')
        .eq('client_id', clientId)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      // Map DB columns → the EncryptedToken interface (names differ; see Gotcha 2).
      return {
        ciphertext: data.token_ciphertext as string,
        iv: data.token_iv as string,
        authTag: data.token_auth_tag as string,
      }
    },
  },

  decrypt: decryptToken,
}

/**
 * Resolve the current request's tenant: `{ config, token }` for the logged-in
 * user's one client. Wrapped in React `cache()` so the layout and the page
 * resolve once per request (not a module-level singleton — that would be shared
 * incorrectly across requests/tenants). Throws {@link TenantResolutionError} on
 * any fail-closed path; callers turn those into friendly UI states.
 */
export const resolveTenant = cache(
  async (): Promise<TenantContext> => resolveTenantWith(realDeps),
)
