# Part B · Phase 04 · Code — Secure per-tenant Sanity bridge (read path) — Completion Report

**Date:** 2026-06-27 · **Outcome (one line):** A signed-in user is now resolved server-side to the **one** client they own — their config + **decrypted** Sanity Editor token — and `/posts` lists **that** client's blog posts from **that** client's own Sanity project, with the cross-tenant isolation guarantee proven by an automated offline test.

- **Branch / PR:** `b04-sanity-read`, based on **`b03-registry`** (the B.02/B.03 stack isn't merged to `main` yet — confirm the base when opening the PR; same merge-order caveat as B.03).
- **Live status:** code-complete and **locally verified** (35 Vitest tests, `npm run build`, `npm run lint` all green). The *live* `/posts` render against the real Supabase + a real session is an **operator step** (the agent has no `.env.local` / Supabase project) — exactly as B.02/B.03 left their live checks. Per the B.04 decision, the **offline isolation test is the authoritative proof** for this phase.

---

## 1. What shipped (plain language)

When a client logs in and opens **Your posts**, the portal now quietly figures out *which* client they are, unlocks that one client's Sanity key **on the server** (never in the browser), and shows that client — and only that client — their own blog posts, each marked draft or published. If the account isn't linked to a website yet, or its setup is incomplete, or the blog can't be reached, the page shows a calm, plain-English message instead of crashing — and never reveals any key or technical detail. Most importantly, this phase lands the **automated safety test** that proves one client can never reach another client's posts or key: it's the single guarantee the whole product rests on, and it now runs on every test run. Nothing here touches a real client or real key yet (still the throwaway test client), and there is still no way to *edit* — that's the next phase.

## 2. Definition of Done

- ✅ **`@sanity/client@7.22.1` pinned exact; `next-sanity` not added; lock updated** — `package.json` → `"@sanity/client": "7.22.1"` (no caret); `grep -c next-sanity package-lock.json` → `0`; `node_modules/@sanity/client/package.json` → `7.22.1`. The two `npm audit` advisories are the **pre-existing** `next@16.2.3` + transitive `postcss` ones (B.03); `@sanity/client` added zero.
- ✅ **`resolve-tenant.ts` (`server-only`) resolves user → `{ config, token }`, fail-closed, no caller-supplied id** — derives the user id from `getClaims().sub`; reads mapping + config via the RLS-scoped client and the encrypted token via the service-role client (columns `token_ciphertext/iv/auth_tag` → `EncryptedToken.ciphertext/iv/authTag`); decrypts with `decryptToken`. `resolveTenant` is `cache()`-wrapped. Failures throw `TenantResolutionError` with `reason ∈ {unauthenticated, no-client, config-missing, secret-missing}`. The pure core `resolveTenantWith(deps)` takes **only** injected deps — no client/project parameter exists.
- ✅ **`sanity/client.ts` (`server-only`) builds the per-tenant client** — `createTenantSanityClient(config, token)` → `createClient({ projectId, dataset, token, apiVersion: '2026-03-01', useCdn: false, perspective: 'raw' })`; throws on an empty token. `SANITY_API_VERSION` is a hard-coded constant.
- ✅ **`config/field-map.ts` validates paths + parameterizes `$type`** — `assertSafeFieldPath` enforces `/^[A-Za-z_][A-Za-z0-9_.]*$/`; `buildPostListQuery` binds `$type` as a parameter and interpolates only the validated `title/excerpt/slug`. Proven by `field-map.test.ts` (injection rejected; `blogPost` never appears in the query string).
- ✅ **`sanity/posts.ts` (`server-only`) returns `PostSummary[]`** — one row per logical post; `status ∈ {draft, published}`; `hasUnpublishedEdits`; `updatedAt`; `versions.*` ignored; newest-first; `makeClient` injectable; token never returned/logged. Proven by `posts.test.ts` (7 reduce + 4 `displayValue` cases).
- ✅ **`/posts` renders from the resolved tenant** — shows `tenant.config.label` (no more "Demo Client"), a populated list when posts exist, the existing empty state at zero posts, a friendly **not-linked** state on `no-client`, a **not-ready** state on `config-missing`/`secret-missing`, and a non-crashing **read-error** state on a Sanity failure — none leaking the project id or error text. Both "New post" buttons remain disabled. The presentational `posts-list.tsx` receives only `PostSummary[]` (a Server Component; never the tenant/token).
- ✅ **`layout.tsx` top-bar label = resolved client label, email fallback, no extra query** — wrapped in try/catch; uses the shared `cache()`d `resolveTenant` (one resolution per request); reads only `config.label` (never the token).
- ✅ **`isolation.test.ts` passes and proves every required property** — A→A / B→B; the Sanity client is constructed with the **session owner's** projectId + token (never the other tenant's); **no caller override** (resolving the same registry under each identity yields exactly that owner's client); the **secret read is keyed** to the owner's client id; and the read path is **unreachable** for an unmapped (`no-client`) / null (`unauthenticated`) session — plus `config-missing` / `secret-missing` / decrypt-failure fail-closed paths. `scripts/verify-registry.ts` is **unchanged**.
- ✅ **`npm test`, `npm run build`, `npm run lint` all pass** —
  ```
  npm test    →  Test Files  4 passed (4) | Tests 35 passed (35)
                 (10 crypto + 9 isolation + 11 posts/displayValue + 5 field-map)
  npm run build → ✓ Compiled successfully; TypeScript clean; routes: / ○, /login ƒ, /posts ƒ
  npm run lint  → clean (exit 0)
  ```
- ✅ **No secret value / key in the diff** — grep sweep over all new + modified `.ts`/`.tsx`/`.json` files found nothing token-/key-shaped; the isolation test uses only invented strings (`invented-token-for-A`, `cipher-A`, …). `SUPABASE_SERVICE_ROLE_KEY` / `SANITY_TOKEN_ENC_KEY` live only in the operator's `.env.local` / Vercel. No `'use client'` file imports any token/resolver/Sanity module (verified).
- ✅ **State files updated** — `current-state.md`, `file-map.md`, `00_stack-and-config.md` to end-of-B.04; the five decision entries (+ a B.04 implementation-choices entry) appended to `dashboard-Decisions.md`; this report filed.

## 3. Decisions I made during this phase

The five briefed decisions are appended verbatim to `dashboard-Decisions.md` (direct-`@sanity/client`; Server-Component read; session-derived resolution with injectable seams; status from the `raw` draft model; live read not in the DoD). Beyond those, a single **"B.04 implementation choices"** entry records the choices the brief did not spell out:

1. **`/posts` computes a render-state object inside try/catch, then renders JSX outside it** — Next 16's `react-hooks/error-boundaries` rule forbids constructing JSX inside try/catch (it would escape the catch). Same behaviour, lint-clean. Alternative rejected: returning JSX from the catch (lints + is genuinely unsafe).
2. **`config-missing`/`secret-missing` → a distinct "Your site isn't ready yet" state**, separate from `no-client`'s "not linked" — the account is linked but its registry setup is incomplete; both still leak nothing.
3. **`field-map.ts` is intentionally NOT `server-only`** (pure logic, no secret; imports `TenantConfig` via `import type`, which is erased) — matches the brief's file list, which didn't mark it `server-only`.
4. **`displayValue` skips Sanity system keys (`_`-prefixed)** when reading a localized object, and a missing title coerces to **"Untitled"** so `PostSummary.title` is always a string.
5. **Production registry reads use `.maybeSingle()`** so 0 rows → `null` (the fail-closed value the resolver checks) rather than a PostgREST error.
6. **Two extra offline test files beyond the mandated `isolation.test.ts`** — `posts.test.ts` (reduce) and `field-map.test.ts` (injection guard) — for completeness on the read path and the guard.
7. **`@` aliased to `src/` in `vitest.config.ts`** so the cross-importing `@/lib/...` modules resolve under Vitest as they do in the Next build.

None reverse a locked decision.

## 4. Deviations from the brief / spec

- **The live `/posts` render is not verified by the agent** — no `.env.local` / Supabase project is reachable here, and a signed-in session is required to pass the `(portal)` gate. The wiring (resolve → read → render → states) is proven by `npm run build` + the offline isolation/reduce tests; the live smoke-check (expected: the **read-error** state + the client **label** in the top bar, because the test client points at a placeholder project) is operator-pending, consistent with B.02/B.03. Per the B.04 decision, the offline test is the authoritative DoD proof.
- **Additions beyond the literal spec** (the two extra test files, the `@` Vitest alias, the distinct not-ready state, the JSX-outside-try/catch refactor) — all documented in §3 / Decisions; none change the briefed shape.
- Nothing in the brief was skipped.

## 5. Changed files / deliverables

- **Registry:** `src/lib/registry/types.ts`, `src/lib/registry/resolve-tenant.ts`, `src/lib/registry/isolation.test.ts` (the load-bearing test).
- **Sanity:** `src/lib/sanity/client.ts`, `src/lib/sanity/posts.ts`, `src/lib/sanity/posts.test.ts`.
- **Config:** `src/lib/config/field-map.ts`, `src/lib/config/field-map.test.ts`.
- **UI:** `src/components/portal/posts-list.tsx` (new); `src/app/(portal)/posts/page.tsx` (rewired); `src/app/(portal)/layout.tsx` (label).
- **Config/deps:** `package.json` + `package-lock.json` (`@sanity/client@7.22.1`); `vitest.config.ts` (`@` alias).
- **State:** `current-state.md`, `file-map.md`, `00_stack-and-config.md`, `dashboard-Decisions.md`, this report.
- **Secrets:** none created or committed. The decrypted token exists only server-side at runtime; `SUPABASE_SERVICE_ROLE_KEY` / `SANITY_TOKEN_ENC_KEY` / any real Sanity token live only in the operator's `.env.local` / Vercel — never in the repo. The isolation test's "tokens" are invented, meaningless strings.

## 6. State updates done

`current-state.md` (rewritten to end-of-B.04), `file-map.md` (the `lib/registry` + `lib/sanity` + `lib/config` modules, `posts-list.tsx`, the rewired page/layout, the `@sanity/client` pin + `@` alias notes, the new completion report), `00_stack-and-config.md` (`@sanity/client 7.22.1`, `SANITY_API_VERSION`, the per-tenant read-path module map, the `@` Vitest alias, test count 35), `dashboard-Decisions.md` (the five briefed entries + the B.04 implementation-choices entry). All match reality.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary status:** B.04 closes the **read** side of the boundary. The decrypted token is server-only end-to-end (no `'use client'` file imports it; `server-only` guards in force through the build), authorization is derived from the session on every access (no caller-supplied id), and **cross-tenant isolation is now a tested invariant** (offline). **B.05 must extend `isolation.test.ts` to writes before any mutation ships** (the §5 rule) and reuse `resolveTenant` so writes inherit the same ownership guarantee.
- **Live verification is operator-pending** (same as B.02/B.03): the agent can't reach the real Supabase. A signed-in `/posts` visit should render without crashing — the **read-error** state with the **client label** in the top bar (the placeholder project can't be fetched). Real Editor tokens → **M.01**; the live round-trip → **M.02**.
- **Branch/merge order:** B.04 stacks on `b03-registry` (B.02 #2, B.03 #3 still open). Confirm the PR base; if B.02/B.03 merge to `main` first, rebase B.04 onto `main`.
- **`perspective: 'raw'` is deliberate** — the editor list must show draft vs published vs published-with-edits, which the `drafts`/`published` perspectives hide. Keep `apiVersion ≥ 2025-02-19` (currently `2026-03-01`); a future bump must preserve the raw draft/published split the reduce relies on.
- **Pre-existing `npm audit` advisories on `next@16.2.3`** (+ transitive `postcss`) are not from B.04; a `next` 16.2.x bump still belongs in a small maintenance PR.
- **AI review** (CodeRabbit/Codex) remains an owner one-time step — strongly recommended before B.05's write path.

## 8. What's now possible that wasn't before

B.05 can build the config-driven editor on top of a proven, server-only ownership boundary: it reuses `resolveTenant` for the same `{ config, token }`, writes through a per-tenant `@sanity/client`, and extends the existing isolation test to writes — with the read path already showing each client only their own posts.
