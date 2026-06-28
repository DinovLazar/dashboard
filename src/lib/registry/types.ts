import 'server-only'

/**
 * The per-tenant config + token shapes (B.04).
 *
 * `TenantConfig` is the camelCase mirror of one `clients` row (see the §6
 * per-client config shape in `dashboard-Project-Instructions.md`). `TenantContext`
 * is that config plus the **decrypted** Sanity Editor token — the in-memory result
 * of resolving a logged-in user to the one client they may act on.
 *
 * `server-only`: these types travel with the decrypted token, so this module must
 * never reach the browser bundle. (Type-only imports of `TenantConfig` elsewhere
 * use `import type`, which is erased and does NOT pull in this guard.)
 */

/** The essential field names a client's blog uses (the §6 `fieldMap`). */
export interface TenantFieldMap {
  title: string
  body: string
  excerpt: string
  image: string
  status: string
  slug: string
}

/** One client's blog config, derived from its (RLS-scoped) `clients` row. */
export interface TenantConfig {
  /** The `clients.id` (uuid). Internal — never accepted from a caller. */
  clientId: string
  /** Human label, e.g. "Sunset Services". Shown in the portal chrome. */
  label: string
  /** That client's own Sanity project + dataset. */
  sanityProjectId: string
  dataset: string
  /** Which Sanity document type is "the blog post" (e.g. `blogPost`). */
  blogDocType: string
  /** What this client calls each essential field. */
  fieldMap: TenantFieldMap
  /** Content locales, e.g. ["en","mk"] or ["en","es"]. */
  locales: string[]
  /**
   * The client site's own revalidate endpoint (from `clients.revalidate_url`).
   *
   * **Intentionally unused by the portal** (decision 2026-06-28, B.07): live-site
   * refresh on publish is driven by each client's **Sanity → site webhook**, not by
   * an outbound call from the portal — so the portal sends nothing on publish and
   * holds no revalidation secret. This field (and its `clients.revalidate_url`
   * column) are retained, not removed, so a later switch to a portal-initiated call
   * needs no schema change. See `dashboard-Decisions.md` (2026-06-28) and
   * `docs/runbooks/live-site-revalidation.md`.
   */
  revalidateUrl: string | null
}

/**
 * A fully-resolved tenant: the client's config plus its decrypted Sanity Editor
 * token. Produced only on the server by the resolver.
 */
export interface TenantContext {
  config: TenantConfig
  /**
   * Decrypted Sanity Editor token — **server-only secret**. NEVER serialize this
   * into a Client Component, into props sent to the browser, into a URL, or into
   * logs. It exists only inside the server-side resolver and the per-tenant
   * Sanity modules. See AGENTS.md → Security boundary.
   */
  token: string
}
