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

---

## 2026-06-27 — B.05 editor: write model & scope (essentials-only, draft-id model, write through the B.04 bridge)

The portal's editor writes the **essentials only** (headline, body, summary, slug; image is B.06) through the **same B.04 secure bridge** as the read path — every write is built from the per-request, session-resolved tenant (`resolveTenant()` → `{ config, token }`) and nothing else. Publish state is governed by **Sanity's draft-id model**, identical to the B.04 read reduction:

- **Save-as-draft** writes `drafts.<id>` via `createOrReplace` (writing the published id directly would publish instantly and break the status reduction).
- **Publish** promotes the draft to the published id and deletes the draft in **one all-or-nothing transaction**; if there is no draft it is a no-op success.
- **Delete** removes both variants in one transaction.
- The schema-level `status` field is left in config for compatibility but **never written** (avoids two competing sources of truth; per-client `status` handling, if a real client needs it, is M.01).

**Edit preserves the client's non-essential fields** (image, author, categories, FAQs, cross-links): save does a read-modify-write overlay (`{ ...currentDoc, ...essentials }`), never a bare replace of only the essentials. **Body is plain-text ⇄ minimal Portable Text** (one paragraph block per blank-line-separated paragraph); a body richer than simple normal paragraphs is detected and shown **read-only** so a plain-text save can never silently strip rich content.

**Authorize on every mutation.** Server Actions are reachable by direct POST, so each action **re-resolves the tenant itself** (it never receives a tenant from the page) and acts only on that one client's project + token. No caller-supplied project/client/token is trusted; a submitted post id is normalized (prefixes stripped, non-plain ids rejected) and only ever applied through the owner's per-tenant client — so an attacker-shaped id can at most touch a doc in the attacker's own dataset. The cross-tenant isolation test is extended to writes (the §5 gate) and must pass before any editor write ships.

**Alternatives considered:** (a) write a `status` field as the source of truth — rejected (two competing sources; clients don't populate it uniformly). (b) Full-fidelity Portable Text editing — rejected for v1 (out of scope; the rich-body guard protects existing content). (c) Pass the resolved tenant from the page into the action — rejected (a page check doesn't protect a directly-POSTed action; re-resolution is mandatory).

**Decided by:** baked into the B.05 brief by the operator; implemented by Claude.

---

## 2026-06-27 — B.05 implementation choices (config-driven editor)

Choices made during B.05 that the phase prompt did not spell out (none reverse a locked decision; they implement the write-model decision above and §5 of the project instructions):

- **Two extra dedicated, tested modules beyond the brief's file list, each a single source of truth for security/data-loss-sensitive logic:** `src/lib/config/portable-text.ts` (text ⇄ minimal Portable Text + `isEditableBody`, the data-loss guard from Gotcha 6) and `src/lib/sanity/doc-id.ts` (`normalizePostId` / `isValidDocId` / `draftId`, the id-sanitization from §2). The brief described this logic inline; pulling each into its own pure, unit-tested module avoids duplicating it across the read path, the write path, and the actions. Both are pure (no secret) so neither is `server-only`. Each has its own test file (`portable-text.test.ts`, `doc-id.test.ts`).
- **The rich-body guard is conservative beyond the brief's enumerated list.** Besides marks/annotations/non-span children/non-`block` types, `isEditableBody` also treats a non-`normal` block `style` (headings), `listItem`/`level` (lists), and non-array bodies as **not editable**. Rationale: the standard is "never silently strip a client's rich content," so anything the plain-text round-trip cannot represent is shown read-only. The test client's plain bodies are unaffected.
- **A non-editable body is preserved by omission, not by writing it back.** When `bodyEditable` is false the editor sets a hidden `bodyEditable=false`; the action then **omits the body** from the mutation, so the save's read-modify-write overlay leaves the stored (rich) body untouched. `EditorFields.body` is optional precisely so "omit" means "preserve."
- **`toFieldValue` is generic over the value type** (string for title/excerpt, Portable Text array for body) rather than string-only as the brief's signature suggested — the single-vs-multi-locale wrapping logic is identical for both, so body localization reuses it. `fromFieldValue` stays string-specialized (the brief's named contract); `fromLocalizedRaw` is the generic read-back used for the body.
- **Slug is written only when non-empty** (as `{ _type: 'slug', current }` on the container field from `slugContainerField`); empty → omitted, so on save the overlay preserves any existing slug. The `image` and `status` fields are never written (B.06 / draft-id model).
- **The editor imports the four Server Actions directly** (like `login-form.tsx` imports `signIn`), rather than receiving them as props from the page. Equivalent for a module-level Server Action (it re-resolves and reads `FormData`; it carries no page closure), and simpler. The security-relevant constraint — the client boundary receives only non-secret serializable props, never the tenant/token — is honored: `post-editor.tsx` gets labels/locales/values only.
- **Multi-locale tabs keep every locale's inputs mounted** (inactive ones merely `hidden`) so a multi-locale submit always carries all languages; single-locale renders no tabs. Field inputs are named `title.<locale>` / `excerpt.<locale>` / `body.<locale>` (slug is `slug`), which the actions read back per `config.locales`.
- **Two `useActionState` hooks share one `<form>` on the edit screen:** the form's `action` is Save-draft and the Publish button uses `formAction` to target the publish action — so both submit the same fields while keeping independent pending/error state. Delete is its own form with a two-click confirm step. Create mode is a single form → `createPostAction`.
- **Publish = save-then-publish.** The Publish button submits the live edit form, so `publishPostAction` first **persists the on-screen edits** into the draft (same `parseFields` + `bodyEditable` rules and `titleMissing` guard as Save), then calls `publishPost` to promote that draft. This makes "Publish" mean "make exactly what I see live" — it never silently drops the user's in-form edits and never promotes a stale older draft. (This corrected a first-pass bug — caught by the B.05 adversarial review — where `publishPostAction` read only the id and promoted the pre-existing draft, so editing-then-Publish on a clean post was a reported-success no-op that lost the edits. The mutation-layer `publishPost(tenant, id)` itself is unchanged: it still promotes the draft + deletes it in one transaction.)
- **Action outcomes:** `createPostAction` redirects to `/posts/<newId>` (the editor for the fresh draft); `saveDraftAction`/`publishPostAction` `revalidatePath('/posts')` + `revalidatePath('/posts/<id>')` and return an `ok` result (the dynamic edit page re-renders with fresh status); `deletePostAction` revalidates `/posts` and redirects there. `redirect()` is always **outside** the try/catch so its control-flow signal is never swallowed into the generic error.
- **`normalizePostId` is strict:** after stripping a single `drafts.` or `versions.<release>.` prefix, the remainder must match `^[A-Za-z0-9_-]+$` (no dots, no path chars) or it throws. `getPost` treats a throw as not-found (a junk URL → friendly 404); the actions treat it as the generic error. Generated ids are UUIDs, so this strictness costs nothing and closes id-smuggling.
- **Friendly editor states mirror the `/posts` page:** `not-linked` / `not-ready` (resolution failure), `not-found` (no such post / foreign id), and `read-error`, via a shared presentational `EditorMessage` server component with a "Back to posts" link. None leak a project id, token, doc type, or raw error.
- **Whole-suite tests grew 35 → 105.** New offline files: `localize.test.ts`, `portable-text.test.ts`, `doc-id.test.ts`, `mutations.test.ts`; extended: `field-map.test.ts`, `posts.test.ts` (getPost), and `isolation.test.ts` (the write-path §5 gate).

**Decided by:** Claude, during B.05 implementation.

---

## 2026-06-27 — Featured image: single, non-localized, 4 MB cap, server-side upload only (B.06)

The portal's featured image is **one image per post and is not localized** (consistent with "featured image" in the spec and the single-image shape in client schemas, e.g. Sunset's `mainImage`). Per-locale or multiple images, if a client needs them, stay editable in that client's own Sanity.

**Uploads flow only through the server-side per-tenant Sanity client** — the same token path as every other write, never a browser-exposed token — via a Server Action that re-resolves and re-authorizes the tenant. The bytes upload to the client's own dataset; only the resulting asset reference is written onto the post.

**Validated max image size: 4 MB.** Server Actions run as Vercel Functions, which reject any request body over **4.5 MB** with a 413 — a hard platform limit that cannot be raised and that surfaces only in production. A 4 MB app-level cap (enforced server-side with a friendly error) stays safely under it. Raising it would require a browser-direct-to-Sanity upload with a browser-exposed token, which conflicts with the load-bearing "no Sanity token ever reaches the browser" invariant, so larger images are **out of scope for v1** and left as a possible future enhancement.

**Decided by:** user (Lazar) / Claude (orchestrator), in Chat; baked into `Part-B-Phase-06-Code`. Reverse by adding a new dated entry.

---

## 2026-06-27 — B.06 implementation choices (featured image upload)

Choices made during B.06 that the phase prompt did not spell out (none reverse a locked decision; they implement the featured-image decision above and §5 of the project instructions):

- **The submitted asset id is validated against the canonical Sanity shape (`isValidAssetId`).** The brief said "validate a submitted asset id is a sane bounded token." Concretely: `^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$` with a 200-char ceiling (lives in `src/lib/sanity/assets.ts`, exported and unit-tested). A malformed id makes `parseFields` throw → the action returns the generic error (never a junk `_ref` write). The id is written as document data, not interpolated into GROQ, but garbage is still refused.
- **The editor uploads via `useTransition` + a direct action call, not `useActionState`.** The brief allowed either. The `useActionState` result would have to be adopted into local state to drive the preview + hidden field; doing that in a `useEffect` trips Next 16's `react-hooks/set-state-in-effect` lint rule. `useTransition` lets the upload's `setState` run in the (event-driven) transition callback — lint-clean, same UX (spinner via the transition's `isPending`, friendly inline error on failure).
- **The featured-image control applies its intent onto the final document in `applyImageIntent`, separate from `buildEssentials`.** Because `createOrReplace` replaces the whole document and `saveDraft` carries a read-modify-write `base` that holds the stored image, a CLEAR must actively `delete` the field — a spread can't express "remove a key." `applyImageIntent` handles all three states (preserve / write / clear) on the built doc and **re-validates** the image field name (defense in depth) on top of `assertWritableFieldPaths`.
- **The file `<input>` is unnamed** so its bytes are never serialized into the main editor form — a Save/Publish never re-uploads the image. Only the chosen asset id rides along, via the hidden `image`/`imageOriginal` inputs; the upload is a separate POST.
- **The 4 MB cap is inclusive** (`size > 4*1024*1024` rejects; exactly 4 MB is allowed). The preview uses `next/image` with `fill` inside an `aspect-video` box (now that `cdn.sanity.io` is an allowed remote pattern); a post whose image ref resolves without a URL still renders a valid "Image attached" state.
- **Read path coerces the projected image values to `string | null`** (`asStringOrNull`), so a missing/odd projection becomes `{ assetId: null, url: null }` rather than leaking a non-string into the form.
- **Whole-suite tests grew 105 → 130.** New file: `src/lib/sanity/assets.test.ts`; extended: `mutations.test.ts` (image set/clear/preserve), `field-map.test.ts` (image projection + write-key validation), `posts.test.ts` (`getPost` image surfacing), and `isolation.test.ts` (the B.06 upload + image-write §5 gate).

**Decided by:** Claude, during B.06 implementation.

---

## 2026-06-28 — Live-site refresh is Sanity-webhook-driven; the portal sends nothing on publish (B.07)

On publish, the client's **live website is refreshed by the client's own Sanity → site webhook**, not by an outbound call from the portal. The portal's only job at publish time is what it already does: write the published document into the client's Sanity project (promote the draft, delete it, in one transaction). Sanity then fires the client site's existing revalidation webhook (`POST <client-site>/api/revalidate`), and the site rebuilds the affected pages within a couple of minutes. The portal makes **no HTTP request to any client endpoint** and therefore holds **no revalidation secret**.

This **revises the architecture described in `dashboard-Project-Instructions.md` §3 and `dashboard-Plan.md` §8**, which assumed the portal would POST to each client's `revalidate_url` on publish. The `clients.revalidate_url` column and `TenantConfig.revalidateUrl` field are **kept but intentionally unused by the portal** — left in place so a later switch to one of the rejected options needs no schema change, and documented as unused in `src/lib/registry/types.ts`.

**Why this is the right shape:** the portal already publishes *into* the client's Sanity project, and a Sanity → site publish webhook is the standard, already-present way a Next.js + Sanity site revalidates (confirmed against the Sunset Services site, which already runs exactly this receiver at `/api/revalidate`). Delegating the refresh to Sanity keeps the portal lean and — the decisive factor — means the portal stores **one fewer secret per client** (no revalidation key on top of the Sanity Editor token), shrinking the blast radius of the one app that holds editing keys to every client's blog.

**Alternatives considered:**
- **Portal calls each client's existing `/api/revalidate` itself, signed.** Honors the original "portal pings" plan and lets the portal confirm the refresh, but the portal would have to store a second per-client secret (the revalidation key) and reproduce Sanity's exact HMAC webhook-signing — more sensitive material inside the security-critical portal, and a fiddly crypto surface to get wrong. Rejected for v1.
- **Portal calls a new, simply-authed (bearer) endpoint added to each client site.** Simplest sending code (no signing), but requires a one-time code addition to every client website's repo — cross-repo work outside this project. Rejected for v1.

**Consequences / accepted downside:**
- Each client site must (a) expose a Sanity-webhook receiver at `/api/revalidate` and (b) hold its own `SANITY_REVALIDATE_SECRET`, and each client's **Sanity project must have the publish webhook configured** (manage.sanity.io → API → Webhooks). Sunset already has both; **Vertex and Dalibor must be verified / set up** — per-client onboarding work in **M.01**, documented in `docs/runbooks/live-site-revalidation.md`.
- The portal **cannot itself confirm** a refresh happened (there is no response to read); the editor's existing "Published — your live site will update shortly." copy reflects this honestly. The live end-to-end proof (publish in portal → change appears on the live site within minutes) is **M.02**.
- Until a client's webhook is configured, a portal publish still succeeds but the live site won't refresh until the webhook is switched on — closed per client in M.01.

**Decided by:** user (Lazar) / Claude (orchestrator), in Chat. Reverse by adding a new dated entry (to one of the rejected options above).
