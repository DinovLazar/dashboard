# Dashboard — Decisions log

Append-only log of project-level decisions during the build of the Vertex Consulting client blog portal. New entries go at the **bottom**; older entries are never edited or removed.

Add an entry when:

- A project capability is deferred to a later phase (or post-launch).
- A tool/integration is replaced or skipped versus the plan.
- A non-obvious business or architecture decision is made that future contributors should know about.
- A previously logged decision is reversed or superseded (add a new dated entry; don't edit the old one).

---

## 2026-06-26 — Product approach: custom Vertex-branded portal (Path A)

Clients will manage their blogs through a **custom, Vertex-branded portal**, not by being invited into Sanity's own login UI.

**Two paths were weighed:**
- **Path A (chosen) — custom branded portal.** Clients log in at a Vertex address and get a clean, Vertex-styled editor. Premium, unified experience; but it's a real piece of software that holds editing keys to every client's blog, so it carries real security responsibility.
- **Path B (rejected) — Sanity's built-in logins.** Invite each client to their own site's Sanity with an Editor role. Same end result for the client with far less custom security work, but it's Sanity's UI (not Vertex-branded), one login per site, and past a handful of users may require a paid Sanity plan.

**Why A:** a single, Vertex-branded portal is something Vertex can put its name on and present to clients as part of its offering — the branded, unified experience is the point. Path B remains the documented fallback if priorities change; upgrading A later does not waste B's work because the data layer is the same.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Each client edits their own separate site's blog (tenant isolation at the data layer)

When a client logs in, they manage the blog on **their own website**, and **each client site is its own separate Sanity project** — confirmed by inspecting real client repos (e.g. Sunset Services = Sanity project `i3fawnrl`, distinct from Vertex's own project).

**Consequence:** tenant isolation is built in at the data layer — one client's content physically lives in a different Sanity project from another's, so there is no shared dataset to leak across. The portal's security job narrows to "never hand a logged-in user the wrong client's project/token." This is the single most reassuring fact about Path A and the reason the build is feasible.

**Decided by:** user (Lazar), in Chat. Verified by Claude against the Sunset Services repo.

---

## 2026-06-26 — Scale: 5–15 client sites

The portal targets a **growing handful of client sites — roughly 5–15** at launch.

**Consequence:** enough scale to justify a custom portal (Path A) over per-site Sanity invitations; small enough that a **light, one-time per-client setup** (a registry row + token + config) is perfectly manageable and does not need a self-serve client-onboarding system in v1.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Editor scope: essentials-only shared editor + light per-client config

The portal ships **one clean, shared editor covering the essentials** — headline, body, summary, featured image, and save-as-draft / publish — plus a **small per-client configuration** that tells the portal where each client keeps its blog and what its fields are called.

**Why (the wrinkle this solves):** client blogs are **not built identically**. Vertex's blog is a simple `blogPost`; Sunset's is richer and domain-specific (`resourceArticle` with eyebrow, dek, categories like "lawn care", FAQs, cross-links) and uses **English + Spanish**, where Vertex uses **English + Macedonian**. A single portal therefore cannot assume one fixed set of fields.

**Two options were weighed:**
- **Chosen — essentials editor + per-client config.** Edits the common fields across every client; a tiny config maps each client's blog shape (doc type, field names, languages). Anything site-specific (e.g. Sunset's categories/FAQs) stays editable in that client's own Sanity. Fastest to build, easiest to maintain, gives clients exactly what was asked for. Onboarding a new client is data, not code.
- **Rejected (for now) — standardize every client blog to one identical schema first.** Cleaner long-term but requires reworking existing client sites (like Sunset) before the portal works for them — noticeably more upfront work. Can be revisited later for clients who need full-fidelity editing.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Topology: separate repo + own subdomain (not inside the Vertex site)

Dashboard is built as a **new, separate repository** and deployed at its **own subdomain** (e.g. `portal.vertexconsulting.mk`) — **not** inside the Vertex marketing-site repo and not as a path on the main site.

**Why:**
1. **The public marketing site stays untouchable.** Frequent early portal changes can't risk breaking `vertexconsulting.mk`, and vice-versa — two separate projects are isolated by construction.
2. **Sensitive material is contained.** The portal holds editing keys to every client's blog; that secret-handling code should not sit inside the app that serves the public marketing site.
3. **The portal stays lean.** It needs none of the marketing site's animations, bilingual public pages, or routing weight; a fresh codebase keeps it a simple, fast "log in and write" tool.

**Cost accepted:** a one-time copy of Vertex's brand tokens (colors, fonts, a few UI pieces) so the portal still reads as Vertex. Spinning up a fresh repo is already the standard Vertex project-start pattern.

**This does not change any of the four product decisions above** — it only gives the portal a clean, safe home. "Vertex-branded portal" stays fully intact.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Auth via Supabase; no public signup; tokens stored server-side

- **Supabase** provides authentication and the per-client registry (with Row-Level Security). Supabase is already part of the Vertex ecosystem and is the natural fit for client logins.
- **No public signup.** Vertex provisions every client account; clients cannot self-register.
- **Per-client Sanity write tokens are server-side secrets** — stored encrypted in Supabase (or a secret store), never in a `NEXT_PUBLIC_*` variable, the client bundle, logs, or commits. Every mutating request is **authenticated and authorized on the server**, where the logged-in user's record selects the one client (and token) they may act on. No client-supplied project id or token is ever trusted. Tokens are **least-privilege Editor** on exactly one client's Sanity project.
- **Cross-tenant isolation is a tested invariant** — an automated test must prove user A cannot read or write client B's posts before the editor ships.

**Decided by:** user (Lazar) (Supabase + portal direction) and Claude (security pattern), in Chat. This is the load-bearing safety decision for Path A; treat any change to it as requiring a new entry here.

---

## 2026-06-26 — Open inputs flagged (not yet decisions)

Recorded so they're tracked, not silently dropped (see `dashboard-Notion-Checklist.md`):

- **Dalibor Plečić repo could not be auto-located** — its GitHub URL (or its `sanity.config.ts` + blog schema if private) is still needed to confirm that client's blog shape. Does not block planning; the essentials-editor + per-client-config approach absorbs whatever Dalibor's schema turns out to be.
- **`Master-Prompt.md` upload came through empty** — to be re-shared when convenient; the essentials are captured in `dashboard-Project-Instructions.md`.

**Decided by:** n/a — open items, pending operator input.

---

## 2026-06-26 — B.01 implementation choices (project setup + branded shell)

Choices made during B.01 that the phase prompt did not spell out:

- **Canonical docs home is `src/_project-state/` (not root `_project-state/`).** The phase brief and the Vertex marketing site both place project-state under `src/`, so the pre-seeded root `_project-state/` and the five `dashboard-*.md` planning docs were moved there. `AGENTS.md` and `CLAUDE.md` path references were updated to match. `dashboard-Notion-Checklist.md` was moved alongside the four named planning docs for consistency (it is the same class of artifact).
- **shadcn token bridge wraps HSL triplets in `hsl()`.** Vertex's `globals.css` maps the shadcn semantic tokens as bare `var(--primary)` etc., where the values are space-separated HSL triplets (`0 0% 96%`). That yields *invalid* colors when consumed by a real shadcn primitive (a transparent button). Vertex never hit this because its visible UI uses bespoke classes, not the primitives; the portal uses the primitives directly. Fix: wrap the bridge values in `hsl(...)` (the canonical shadcn pattern). This is a faithful adaptation of the Vertex tokens, not a new palette. Alternative rejected: storing full-color values in `:root` (more churn, diverges further from Vertex's source).
- **Portal chrome/buttons use the heading face (Archivo).** `base-nova` buttons inherit the body font (Source Serif 4); Vertex's CTAs and chrome are Archivo. Added `font-heading` to the Button primitive and the nav links so the portal reads as Vertex. Body prose stays serif.
- **`@base-ui/react` added as a dependency.** It is a required peer of the `base-nova` Button/Input primitives and was not pre-listed; npm resolved `^1.6.0` (satisfies Vertex's `^1.4.0`). Not one of the integrations the brief deferred.
- **Repo history: one empty initial commit on `main`, then the whole phase via one PR.** A brand-new repo needs `main` to exist before branch protection and before any PR can be opened. To keep the entire B.01 deliverable inside a single reviewable PR (per the brief's "one PR for the phase"), `main` was seeded with an empty `chore: initialize repository` commit, protection applied, then all of B.01 landed on a feature branch → PR → merge.
- **B.01 preview deployed via the Vercel CLI.** Produces a live, public preview URL now. Connecting the Vercel↔GitHub app for automatic deploys-on-push remains an owner one-time step (as the brief notes).
- **`next.config.ts` kept minimal/empty** (no `cdn.sanity.io` image remotePattern yet) to keep B.01 free of any Sanity reference; it is added in the phase that loads client images (B.06).

**Decided by:** Claude, during B.01 implementation. None reverse a prior locked decision; they refine how the locked stack/brand are realised.

---

## 2026-06-26 — B.02 implementation choices (Supabase auth)

Choices made during B.02 that the phase prompt did not spell out:

- **The root request hook is `src/proxy.ts`, NOT `middleware.ts`.** Next.js 16 **deprecated and renamed** the `middleware` file convention to `proxy` (see `node_modules/next/dist/docs/.../proxy.md` → "Migration to Proxy"; the function is `export function proxy(...)`). The phase brief and the official Supabase guide both still say `middleware.ts`, but `AGENTS.md` mandates heeding deprecation notices and the implementation standard forbids shipping a deprecated workaround when the real convention exists. So the root file follows Next 16. The session-refresh **helper** keeps its guide name `src/lib/supabase/middleware.ts` (it's just a module, and matches the Supabase guide's `utils/supabase/middleware.ts`). Net effect for the brief's intent — "a request-level session refresh with a static-asset-excluding matcher" — is identical. Alternative rejected: literal `middleware.ts` (would emit a deprecation warning and bake in tech debt on the very first auth phase).
- **`getClaims()` is the auth check, and the env key is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.** The brief specifies `getClaims()` (validates the JWT) over `getSession()`'s user — followed exactly, at both the proxy and the authoritative `(portal)` layout gate. The Supabase Next.js guide now names the browser key `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the modern name for what older docs called the "anon" key); the portal reads only this name. `00_stack-and-config.md` previously listed `NEXT_PUBLIC_SUPABASE_ANON_KEY` — corrected there.
- **Supabase packages pinned exact:** `@supabase/ssr@0.12.0` + `@supabase/supabase-js@2.108.2` (latest at build; ssr requires supabase-js `^2.108.0`). Exact pins (no caret) match the `next`/`react` convention rather than the carets used for the shadcn utility deps.
- **Login UI split into three files** to satisfy "Server Action + inline error": `page.tsx` (Server Component — also redirects already-authed users to `/posts`), `login-form.tsx` (`'use client'`, `useActionState` + `useFormStatus` for the inline generic error and pending state), `actions.ts` (`'use server'`). The email input is **controlled** so it survives a failed attempt; the password is intentionally not retained. The generic "Incorrect email or password." is returned for *every* failure (no user-enumeration), per the brief.
- **The redirect of already-authenticated users away from `/login` to `/posts`** (a small UX nicety) lives in the login page, not the proxy, keeping the proxy focused on protecting routes.
- **Top-bar label shows the signed-in user's email** until the client registry lands (B.03). The brief said the label is "populated from the authenticated session" without naming a source; pre-registry, the email is the only identity available. `initialsFor()` was extended to derive sensible initials from an email.
- **No-cache hardening = `export const dynamic = 'force-dynamic'` on the `(portal)` layout + `Cache-Control: no-store` on the proxy's redirect responses.** The brief asked for "an explicit dynamic marker where appropriate"; the layout marker cascades to every portal page, and the proxy header guarantees a session-bearing redirect is never shared-cached. (Dynamically rendered portal pages also carry Next's own `no-cache, must-revalidate`.)
- **Defense-in-depth redirect added in the proxy** (the brief said the middleware "may also" do this) — unauthenticated requests to non-public routes are bounced to `/login` at the proxy as well as the layout. Public routes the proxy leaves alone: `/`, `/login`, `/auth/*`.
- **`.env.local.example` added** (operator aid for the non-technical owner; tracked via the existing `!.env.local.example` `.gitignore` allowlist). Contains variable names + placeholders only — no values.

**Decided by:** Claude, during B.02 implementation. None reverse a prior locked decision; they implement the locked "Supabase auth, no public signup, tokens server-side" decision (2026-06-26) and honour `AGENTS.md` (deprecation notices) and `dashboard-Project-Instructions.md` §5 (server-side auth, Server Actions re-verify).

---

## 2026-06-27 — Token encryption: AES-256-GCM at the app layer (not Supabase Vault)

Per-client Sanity write tokens are encrypted **in the application** with **AES-256-GCM** before they are stored. Only the base64 ciphertext, IV, and GCM auth tag land in the database (a dedicated `client_secrets` table). The 32-byte key lives **only** in a server-side env var (`SANITY_TOKEN_ENC_KEY`) — never in the database.

**Why this over Supabase Vault / `pgsodium`:**
- **Separation of trust.** With the key outside the database, a database dump — or even a service-role-key leak — **alone** cannot reveal a token. An attacker would also need the separate app key. Vault stores the key material inside the same database, so a sufficient DB/service-role compromise can decrypt.
- **No dependency on an evolving feature.** App-layer crypto using Node's built-in `node:crypto` depends on nothing that Supabase might change or deprecate.
- **Defence in depth, not either/or.** This sits *on top of* the `client_secrets` RLS lockdown (deny-all to browser sessions): the ciphertext table is unreadable by users, and even the ciphertext is useless without the app key.

**Cost accepted:** the app must hold and protect `SANITY_TOKEN_ENC_KEY` (server env only, in `.env.local` and Vercel; lose it and stored tokens can't be decrypted). Key **rotation** is deferred to a later phase. Decrypting and *using* tokens is wired in B.04; B.03 only seals and stores them.

**Decided by:** user (Lazar) + Claude (security pattern), in planning. This refines the locked 2026-06-26 "tokens stored server-side, encrypted" decision with the specific mechanism; treat any change as requiring a new entry.

---

## 2026-06-27 — B.03 implementation choices (registry data model)

Choices made during B.03 that the phase prompt did not spell out:

- **RLS policies use `(select auth.uid())`, not bare `auth.uid()`.** Functionally identical to the brief's `using (user_id = auth.uid())`, but the sub-select form is evaluated once per query (initplan) instead of once per row — Supabase's recommended pattern, and it avoids the `auth_rls_initplan` advisor warning. Alternative rejected: bare `auth.uid()` (slower at scale, lints with a warning).
- **Migration hardened for the non-technical operator:** `create table if not exists`, `drop policy if exists` before each `create policy`, `comment on table` documenting the security intent, and an index on `client_users(client_id)` (Postgres doesn't auto-index FKs; this speeds the `clients` RLS sub-query and cascade deletes). Effect: the operator can copy-paste-Run the SQL more than once without errors. None of this changes the spec's table shape or policies.
- **`server-only` is a production dependency** (pinned `0.0.1`, the version Next itself uses), because app code (`admin.ts`, `tokens.ts`) imports it. Token encryption uses Node's built-in `node:crypto` — **no third-party crypto library** is added.
- **Vitest is the test runner, added now (not deferred to B.04).** The brief allowed adding it if none was configured; B.04+ need it, and B.03's crypto module must be tested. Pinned `vitest@4.1.9`. Scripts run with `tsx@4.22.4` (pinned), per the brief.
- **`server-only` is aliased to a no-op stub for Vitest and the tsx scripts.** The real `server-only` package throws unless resolved under the Next bundler's `react-server` export condition; Vitest and tsx run in plain Node and would throw. They alias it to `test/setup/server-guard-stub.ts` (via `vitest.config.ts` `resolve.alias` and `scripts/tsconfig.json` `paths`). The genuine guard still protects the real client bundle (verified: `npm run build` passes and neither module is imported by a `'use client'` file). Alternative tried and rejected: running tsx/Node with `--conditions=react-server` — empirically it does **not** work under tsx (tsx uses its own resolver), so the alias is the reliable mechanism.
- **Scripts load `.env.local` via Node's built-in `process.loadEnvFile`** (Node ≥ 20.12) — no `dotenv` dependency. Guarded so it's a no-op when the vars are already in the environment (e.g. CI).
- **The seed script is idempotent:** it reuses the user's existing `client_users` mapping if present (updating that client) instead of inserting a second client, so re-runs converge to exactly one client per user with no orphans.
- **The verify script treats a permission-denied error on `client_secrets` as "zero rows readable."** Because `client_secrets` privileges are revoked from `authenticated`, a user's `select` is rejected outright rather than returning an empty set; both satisfy the "0 rows" invariant, and the stronger error is logged as evidence.
- **Test-user creds for the verify script** (`TEST_USER_EMAIL` / `TEST_USER_PASSWORD`, optional `TEST_USER_ID`) are documented in `.env.local.example` (names/placeholders only) under a clearly-labelled verify-only section, so the operator can run `npm run verify:registry`. They are the test user's own login, not app config.
- **Local isolation proof via an in-process Postgres (pglite).** No Docker / Supabase CLI was available locally, so the *actual* migration was run against pglite under a faithful simulation of Supabase's roles + `auth.uid()` to prove cross-tenant isolation offline (not committed — a throwaway harness). The committed, operator-run proof remains `verify-registry.ts` against the real Supabase; the *formal automated* cross-tenant test on the read path is B.04's deliverable.

**Decided by:** Claude, during B.03 implementation. None reverse a prior locked decision; they implement the locked encryption decision (above) and §5 of the project instructions (server-only tokens, RLS, isolation as a tested invariant).

---

## 2026-06-27 — B.04: read/write to Sanity via `@sanity/client` directly (per-tenant, per-request), not `next-sanity`

The portal builds a **server-side `@sanity/client` instance per request**, from the resolved client's projectId + decrypted Editor token. `@sanity/client@7.22.1` is pinned exact (matching the `@supabase/*` pinning convention); `apiVersion` is hard-coded `2026-03-01`.

**Alternatives considered:** `next-sanity` with `defineLive` / `<SanityLive>` (the standard Next.js + Sanity pattern) — **rejected**: it is built around a *single* project client, a *browser* token, and a live-overlay model, none of which fit a multi-tenant portal where every request targets a different project with a different server-only token. We explicitly do not want a browser token (the security boundary forbids it).

**Consequences:** we forgo the Live Content API's automatic real-time refresh and Visual Editing. Acceptable: this is a private editor that re-fetches on navigation and (from B.05) after each write; freshness is guaranteed by `useCdn: false`. Downside accepted: manual re-fetch instead of live updates.

**Decided by:** Claude (orchestrator), in Chat.

## 2026-06-27 — B.04: the read path is a Server Component data call; mutation API routes deferred to B.05

Listing posts is done by the `/posts` Server Component calling a `server-only` data function (`listPosts`) directly, not via an `/api/*` route.

**Alternatives considered:** introduce `/api/posts` now — **rejected**: unnecessary indirection for a server-side read, and it would invite the client to call it directly. Mutations (create/edit/delete/publish) are where request handlers earn their place; those land in B.05.

**Consequences:** B.04 adds no routes. Downside: none material; the `app/api/*` folders planned in the spec simply arrive with the phase that needs them.

**Decided by:** Claude (orchestrator), in Chat.

## 2026-06-27 — B.04: tenant resolution derives everything from the validated session; RLS-scoped config + service-role-only secret; injectable seams for an offline isolation test

The resolver reads the user id from the validated `getClaims()` session (`sub`), looks up the user→client mapping and the client config through the **RLS-scoped** Supabase client, and reads the encrypted token **only** through the service-role client, keyed on the already-resolved client id. A caller can never supply a client/project id or token. The resolver and read path take their external dependencies (session, registry reads, decrypt, Sanity client factory) through small interfaces so the cross-tenant isolation test runs fully offline.

**Alternatives considered:** (a) use the service-role client for *everything*, keyed on the session user id — **rejected**: it discards RLS as an active second control on config reads. (b) Prove isolation only with mocked unit tests and no DB-level evidence — **addressed** by keeping `scripts/verify-registry.ts` as the live RLS proof against the real Supabase, complementary to the offline test.

**Consequences:** the offline test trusts that the production wiring matches the seams; that residual risk is covered by `verify-registry.ts` (live RLS) and by the M.02 end-to-end run. Downside accepted: a thin layer of wiring is exercised live rather than in CI.

**Decided by:** Claude (orchestrator), in Chat.

## 2026-06-27 — B.04: draft/published status derived from Sanity's draft model (`raw` perspective + reduce), not the schema `status` field

The post list reads with `perspective: 'raw'` + token + `useCdn: false`, then reduces the returned variants by logical id: a `drafts.`-only post is `draft`, a published post is `published`, and a post with both is `published` plus `hasUnpublishedEdits: true`. `versions.*` (Content Releases) variants are ignored.

**Alternatives considered:** the `drafts` perspective — **rejected**: it collapses to one entry per post and hides whether a post is published, which the list must display. The schema-level `status` field (present in `field_map`) — **rejected for the list**: its publish semantics are a B.05 write concern and clients do not populate it uniformly.

**Consequences:** status reflects Sanity's actual publish state, which is the source of truth the live site uses. Downside: a published post with unpublished edits shows as `published` (the edit is captured in `hasUnpublishedEdits` for richer display later).

**Decided by:** Claude (orchestrator), in Chat.

## 2026-06-27 — B.04: a live read against a real Sanity project is NOT part of B.04's automated Definition of Done

B.04's authoritative proof of "shows only the logged-in client's posts" is the **offline automated isolation test** plus the `/posts` page rendering correctly from the resolver. The B.03 test client points at a placeholder project, so a live fetch errors by design (handled by the page's error state). Real Editor tokens are onboarded in **M.01**; the full live round-trip per real client is **M.02**.

**Alternatives considered:** require a live read in B.04 — **rejected**: real projects/tokens are a Make-it-work concern by plan, and faking a live read would be dishonest. An optional operator smoke-check (throwaway Sanity project + Editor token, re-seed, view real posts) is available but not a DoD item.

**Consequences:** the security guarantee is proven structurally now and live in M.02. Downside accepted: CI does not exercise a real Sanity fetch until the M bucket.

**Decided by:** Claude (orchestrator), in Chat.

---

## 2026-06-27 — B.04 implementation choices (secure per-tenant Sanity bridge)

Choices made during B.04 that the phase prompt did not spell out (none reverse a locked decision; they implement the five B.04 decisions above and §5 of the project instructions):

- **The `/posts` page computes a render-state object inside try/catch, then renders JSX outside it.** Next 16's `react-hooks/error-boundaries` lint rule forbids *constructing JSX inside a try/catch* (a rendering error there would escape the catch). So `loadPostsState()` returns a discriminated `PostsState` (`not-linked` | `not-ready` | `read-error` | `empty` | `list`) and the component renders from it. Same behaviour the brief asked for, lint-clean. Alternative rejected: returning JSX from within the catch (lints as an error and is genuinely unsafe).
- **`config-missing` / `secret-missing` resolve to a distinct "Your site isn't ready yet" state**, separate from the `no-client` "not linked" state. The brief named the friendly state only for `no-client`; these two mean the account *is* linked but its registry setup is incomplete, so a different, still-non-leaking message is clearer. Neither leaks the project id or any error text.
- **`field-map.ts` is intentionally NOT `server-only`** — it holds no secret (pure GROQ-string logic) and imports `TenantConfig` via `import type` (erased at compile time, so it does not pull in the `server-only` guard from `types.ts`). It is only ever imported by the `server-only` read path. The brief's file list did not mark it `server-only`; this matches.
- **`displayValue` skips Sanity system keys (`_type`, `_key`, …) when reading a localized object**, returning the first *content* locale value rather than a stray `_type` string. Forward-compatible with real localized clients (M.01/B.05); a no-op for the plain-string test client. A missing/te­xt-less title coerces to **"Untitled"** so `PostSummary.title` is always a string.
- **Production registry reads use Supabase `.maybeSingle()`** (0 rows → `null`, not an error), so an unmapped user / missing config / missing secret cleanly yields the fail-closed `null` the resolver checks for, instead of throwing a PostgREST "no rows" error.
- **Two extra offline test files beyond the mandated `isolation.test.ts`:** `src/lib/sanity/posts.test.ts` (the `raw`-perspective reduce: status, `hasUnpublishedEdits`, draft-value preference, `versions.*` ignored, sort, `displayValue`) and `src/lib/config/field-map.test.ts` (the GROQ-injection guard + `$type`-as-parameter). Strengthens the read path and the injection guard; the implementation standard calls for tests on what ships.
- **`@` is aliased to `src/` in `vitest.config.ts`** (mirroring the `@/*` → `./src/*` tsconfig path) so the B.04 modules, which import each other via `@/lib/...`, resolve under Vitest exactly as in the Next build. The existing crypto test used relative imports and never needed it.

**Decided by:** Claude, during B.04 implementation.
