# Dashboard — Current State

> The full project snapshot. **Read this first every session.** Factual, not aspirational — it records what IS.
> Last updated: **2026-06-27** (end of Phase **B.04**).

## One-line status

The portal now has its **secure read bridge to Sanity**: a signed-in user is resolved server-side to the **one** client they own — their config + their **decrypted** Sanity Editor token — and the `/posts` page lists **that client's** blog posts (draft/published status included) from **that client's own Sanity project**, with friendly not-linked / not-ready / error / empty states and the client label in the top bar. The load-bearing **cross-tenant isolation test** (offline, Vitest) proves user A's read path can only ever touch A's project + token and that an unmapped/unauthenticated user is denied before any token is read. Tokens stay **server-only** the whole way (no `'use client'` module imports them; verified). Still **no writes, no editor, no `/api/*` routes** — that's B.05.

## Links

- **GitHub:** https://github.com/DinovLazar/dashboard (public, `main` protected)
- **Vercel preview:** https://dashboard-six-iota-33.vercel.app (renders the branded shell; `/` → `/login`)
- **Vercel project:** `dinovlazars-projects/dashboard`

## What is live

**From B.01 (foundation + look):** public protected repo to the Vertex standard; Next 16 + React 19 + TS + Tailwind v4 + shadcn (`base-nova`) app that builds clean and deploys to Vercel; Vertex brand applied (dark-only); `src/_project-state/` as the docs home.

**From B.02 (Supabase auth — the locked door):** server-side Supabase auth (`@supabase/ssr` + `@supabase/supabase-js`); `src/proxy.ts` session refresh + redirect; functional `/login` (email + password Server Action, no signup, generic error); `(portal)` gated by a `getClaims()` server check; sign-out; no-cache hardening.

**From B.03 (registry data model — the secure address book):** three RLS-protected Supabase tables (`clients`, `client_users`, `client_secrets`) so a signed-in user can read only their own client + config and **cannot read any token**; app-layer **AES-256-GCM** token encryption (`src/lib/crypto/tokens.ts`); the service-role client (`src/lib/supabase/admin.ts`) as the only reader of `client_secrets`; seed/verify scripts + an operator runbook.

**New in B.04 (secure per-tenant Sanity bridge — read path):**
- **The tenant resolver** (`src/lib/registry/resolve-tenant.ts`, `server-only`): turns the logged-in user → `{ config, token }` for their one client. Derives the user id from the validated `getClaims()` session (`sub`); reads the user→client mapping and the client config through the **RLS-scoped** Supabase client; reads the encrypted token **only** through the **service-role** client, keyed on the already-resolved, user-owned `client_id`; decrypts with `decryptToken`. Fails closed with a typed `TenantResolutionError` (`unauthenticated` / `no-client` / `config-missing` / `secret-missing`). **No caller can supply a client/project id or token.** The pure core `resolveTenantWith(deps)` takes injectable seams; the production `resolveTenant` is `cache()`-deduplicated per request. Types in `src/lib/registry/types.ts` (`TenantConfig`, `TenantContext`).
- **The per-tenant Sanity client factory** (`src/lib/sanity/client.ts`, `server-only`): `createTenantSanityClient(config, token)` builds a fresh `@sanity/client` per request — `projectId`/`dataset`/`token`, `apiVersion: SANITY_API_VERSION` (`'2026-03-01'`), `useCdn: false`, `perspective: 'raw'` (so the editor sees drafts + published side by side). Throws on an empty token.
- **The read path** (`src/lib/sanity/posts.ts`, `server-only`): `listPosts(tenant, makeClient?)` fetches with the field-map query, reduces the `raw`-perspective variants to one `PostSummary` per logical post (status ∈ {draft, published}, `hasUnpublishedEdits`, draft-preferred display values, `versions.*` ignored), sorted newest-first. `makeClient` is injectable for the offline test. `displayValue` handles plain-string now / localized-object later. The token is never returned or logged.
- **The field-map → GROQ helper** (`src/lib/config/field-map.ts`): `assertSafeFieldPath` (regex guard against GROQ injection from a malformed registry row) + `buildPostListQuery` (binds `$type` as a **parameter**, interpolates only validated field names).
- **The wired `/posts` page** (`src/app/(portal)/posts/page.tsx`, Server Component): resolves the tenant, lists posts, and renders the client label + a populated list, or the empty / not-linked / not-ready / read-error states — never leaking the project id, token, or a raw error. Both "New post" buttons stay disabled (editor = B.05). The presentational list is `src/components/portal/posts-list.tsx` (gets only `PostSummary[]`, never the tenant/token).
- **Top-bar label** (`src/app/(portal)/layout.tsx`): now the resolved client label (best-effort; falls back to the email if resolution fails), sharing the page's `cache()`d resolution — no extra query.
- **The automated cross-tenant isolation test** (`src/lib/registry/isolation.test.ts`, offline): A→A / B→B; the Sanity client is built with the session owner's projectId + token (never the other tenant's); no caller can override the client/project; the secret read is keyed to the owner's client id; and the read path is unreachable for an unmapped (`no-client`) / null (`unauthenticated`) session — plus `config-missing` / `secret-missing` / decrypt-failure fail-closed paths. Complemented by `src/lib/sanity/posts.test.ts` (reduce logic) and `src/lib/config/field-map.test.ts` (injection guard). **35 tests pass.**

## What is NOT built yet (by design)

- **No writes of any kind.** No create / edit / delete / draft / publish, no mutating Server Actions, no editor form, no `/api/*` routes. Both "New post" buttons are inert. That is **B.05** (which also extends the isolation test to writes).
- **No image upload / no `next.config.ts` image `remotePatterns`** — **B.06**. **No publish → live-site revalidation** — **B.07**.
- **No real client, real Sanity project, or real token.** B.04 uses only the B.03 throwaway test client (placeholder project `test-throwaway` + dummy token), so a *live* read errors by design (the page's read-error state). Real Editor tokens are onboarded in **M.01**; the live end-to-end read is **M.02**.
- **No new environment variables.** The Sanity project id + token come from the registry, never from env.
- **No portable-text rendering, no localized-field editing UI** — the list shows a display title only; full localization lands with real schemas (M.01) and the editor (B.05).
- **No multi-client operators, no password reset / key rotation / rate limiting, no public signup** — as before.

## Security posture (B.04)

- **The decrypted token is a server-only secret, end to end.** It exists only inside `resolve-tenant.ts` / `sanity/*.ts` on the server. Every new `lib/registry` and `lib/sanity` module starts with `import 'server-only'`; `field-map.ts` holds no secret and imports `TenantConfig` via `import type`. **Verified:** no `'use client'` file imports any of the token/resolver/Sanity modules; `npm run build` keeps the genuine `server-only` guard in force.
- **Authorize on every access, from the session.** The user's `client_id` is derived from the validated `getClaims()` session via the RLS-scoped client; **a caller may never supply a project id, client id, or token.** There is exactly one client a request may touch — the session owner's. Proven by the offline isolation test (the read path's only input is the authenticated identity).
- **Defense in depth:** config reads go through the RLS-scoped client (a resolver bug still can't cross tenants on config); the encrypted token is read only by the service-role client, keyed on the already-resolved, user-owned `client_id`; the token is decrypted only after the user-scoped lookups succeed, and a tamper/wrong-key error propagates (never a plaintext fallback).
- **Fail closed, quietly.** Every resolver failure throws a typed `TenantResolutionError`; the page turns those into friendly states. The raw error, the project id, and the doc type are never rendered.
- **GROQ injection guard.** `$type` is always a bound parameter; field names (operator-set) are still validated by `assertSafeFieldPath` before interpolation.
- **No secret values anywhere in the diff** (code, comments, tests, report) — grep-verified. The isolation test uses only invented, meaningless strings.

## Stack (see `00_stack-and-config.md` for exact pins)

Next 16.2.3 · React 19.2.4 · TS ^5 · Tailwind v4 · shadcn `base-nova` · @supabase/ssr 0.12.0 + @supabase/supabase-js 2.108.2 · server-only 0.0.1 · **@sanity/client 7.22.1 (exact)** · token encryption via Node `node:crypto` (AES-256-GCM). Dev: vitest 4.1.9, tsx 4.22.4. Hosted on Vercel.

## Routes

Unchanged set from B.02: `/` → `/login`; `/login` functional; `/posts` (now the real per-tenant read path, dynamic `ƒ`); `(portal)` layout gate; `proxy.ts` session refresh. B.04 added **no** routes (the read is a Server Component data call — see Decision).

## Risks & follow-ups

- **Branch/merge order:** B.02 (#2) and B.03 (#3) are still open, not merged to `main`. B.04 is on `b04-sanity-read`, based on `b03-registry` — it continues the stack. Confirm the base when opening the B.04 PR; the same merge-order caveat the B.03 report raised still applies.
- **The live `/posts` render is operator-pending** (no `.env.local` / Supabase project is reachable by the agent). With the test client pointed at a placeholder project, a signed-in visit to `/posts` is expected to show the **read-error** state (the placeholder project can't be fetched) with the **client label** in the top bar — confirming resolve→read→render and the non-crashing failure path. Seeing real posts render is the optional operator smoke-check / **M.02**. The **offline isolation test is the authoritative B.04 proof** (per the B.04 decision).
- **Token-handling for B.05:** the write path will reuse `resolveTenant` (same ownership guarantee) and must extend `isolation.test.ts` to writes before any mutation ships (the §5 invariant). The decrypted token must stay out of every `'use client'` module — keep the `server-only` guards.
- **Pre-existing `npm audit` advisories on `next@16.2.3`** (+ a transitive `postcss`) — **not** introduced by B.04 (`@sanity/client@7.22.1` added zero advisories). A `next` 16.2.x bump still belongs in a dedicated maintenance PR.
- **AI review** (CodeRabbit/Codex) still an owner one-time step. Strongly recommended before B.05's write path lands.

## Next phase

**B.05 — Editor (create / edit / delete / draft / publish):** the branded, config-driven editor writing through the B.04 bridge (same per-tenant client + ownership check), with localized field tabs when the client config says multi-language, and the **isolation test extended to writes** (user A cannot write to client B). *Done when:* the test user can create, edit, delete, draft, and publish on the test client and the write-isolation test passes. See `dashboard-Phase-Plan.md`.
