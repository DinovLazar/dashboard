# Part B · Phase 02 · Code — Completion Report

**Date:** 2026-06-26 · **Outcome (one line):** The portal now has a real locked door — Supabase email + password sign-in works, the `(portal)` routes are gated, and sign-out ends the session.

---

## 1. What shipped (plain language)

The login screen is no longer a picture — it actually logs you in. A person Vertex has created an account for can type their email and password at `/login` and land inside the portal; anyone who isn't signed in is sent straight back to `/login` if they try to open a portal page. The "Sign out" button now really ends the session and returns to the login screen. There is still no way for anyone to create their own account (accounts are made by Vertex), and there is still no blog data or editor yet — that comes next.

## 2. Definition of Done

- ✅ **`@supabase/ssr` + `@supabase/supabase-js` installed at pinned versions; `npm run build` passes.** — evidence: `package.json` → `"@supabase/ssr": "0.12.0"`, `"@supabase/supabase-js": "2.108.2"` (exact); `npm run build` → "✓ Compiled successfully", TypeScript clean; `npm run lint` → clean.
- ✅ **Three Supabase client utilities in `src/lib/supabase/`, reading only the two `NEXT_PUBLIC_*` values (no secret/service-role key).** — evidence: [client.ts](../../lib/supabase/client.ts), [server.ts](../../lib/supabase/server.ts), [middleware.ts](../../lib/supabase/middleware.ts) + the shared [env.ts](../../lib/supabase/env.ts); they reference only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service-role key anywhere (grep of `src/` for `service_role` → only a doc mention of the *name* for B.03).
- ✅ **A request hook refreshes the session on each applicable request and excludes static assets via its matcher.** — evidence: [src/proxy.ts](../../proxy.ts) calls `updateSession`; `config.matcher` excludes `_next/static`, `_next/image`, favicons, and common image assets. Build output lists "ƒ Proxy (Middleware)"; dev logs show a `proxy.ts: Xms` segment on every request. **Note:** the file is `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention (see §3/§4).
- ✅ **Wrong credentials show a clear, generic error on `/login`; the app does not crash.** — evidence: verified live against a local 400-returning auth stand-in — submitting `wrong@example.com` rendered the inline alert **"Incorrect email or password."**, the email stayed filled, the password cleared, the button reset, and the page stayed on `/login`. Screenshot captured during verification.
- ✅ **Visiting any `(portal)` route while signed out redirects to `/login`.** — evidence: `curl /posts` (no session) → `HTTP/1.1 307` + `location: /login` + `cache-control: no-store, max-age=0`. Authoritative gate is the `(portal)` layout's `getClaims()` check; the proxy redirects too (defense-in-depth).
- ✅ **No signup page, form, or link anywhere.** — evidence: accessibility snapshot of `/login` shows only Email, Password, "Sign in", and the notice "Accounts are created by Vertex…". No signup route exists; no signup affordance in any component.
- ✅ **Authenticated routes are non-cached.** — evidence: `(portal)/layout.tsx` exports `dynamic = 'force-dynamic'`; build output marks `/login` and `/posts` as `ƒ (Dynamic)`; the proxy sets `Cache-Control: no-store` on redirect responses (verified via curl). A session-refresh `Set-Cookie` cannot be statically/CDN-cached and replayed.
- ✅ **No `.env*` file or key value in the repo/history; `.gitignore` still excludes `.env*` and `.vercel`.** — evidence: `git check-ignore .env.local .env .vercel` returns all three; `git status` shows no `.env.local`; the only tracked env-named file is the value-free `.env.local.example` (allowed by the existing `!.env.local.example` rule).
- ✅ **`current-state.md` + `file-map.md` updated; completion report filed.** — this report + the three state files updated in the same change.
- ⚠️ **A confirmed test user can sign in and land inside the portal; sign-out ends the session and the portal is then unreachable.** — done in code and wired per the official Supabase guide, but **not exercised end-to-end locally** because it requires the operator's real Supabase project + a confirmed test user (an explicit phase prerequisite the agent must not create). Locally verified the surrounding behavior (gate redirect, error path, form). The operator should do one real sign-in → portal → sign-out round-trip in the Vercel preview to close this fully. See §4 and §7.
- ⚠️ **Merged via a PR into protected `main`.** — a PR is opened by this phase; the merge is the operator's click (and any required CodeRabbit/approval check). See §5.

## 3. Decisions I made during this phase

Full detail is appended to `dashboard-Decisions.md` (2026-06-26 — B.02). The load-bearing ones:

- **Root hook is `src/proxy.ts`, not `middleware.ts`.** Next.js 16 deprecated and renamed the `middleware` file convention to `proxy` (the function is `proxy()`). The brief and the Supabase guide predate this; `AGENTS.md` mandates heeding deprecation notices, so the root file follows Next 16. The session-refresh **helper** keeps the guide's name `src/lib/supabase/middleware.ts`. The behavior the brief asked for is unchanged. · Alternative rejected: literal `middleware.ts` (deprecation warning + day-one tech debt).
- **Env key name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (the modern Supabase name for the browser key; the stack doc's older `…_ANON_KEY` was corrected). `getClaims()` is used for the auth decision, as the brief requires.
- **Login split into Server Component page + `'use client'` form + `'use server'` action**; controlled email survives a failed attempt; one generic error for all failures (no user-enumeration).
- **Top-bar label = signed-in email** until the registry (B.03); **already-authed users on `/login` → `/posts`**; **`.env.local.example`** added as an operator aid.
- **No-cache = `force-dynamic` on the portal layout + `no-store` on proxy redirects.**

Each needs the `dashboard-Decisions.md` entry that was added; none reverse a prior locked decision.

## 4. Deviations from the brief / spec

- **`middleware.ts` → `proxy.ts`** (Task 3 / DoD wording). The brief names `middleware.ts`; shipped as `proxy.ts` per the Next.js 16 rename. Functionally equivalent; documented above and in `dashboard-Decisions.md`.
- **Success-path + sign-out not exercised end-to-end locally.** The brief's prerequisites state a Supabase project, the two env values, and a confirmed test user are operator-provided and the agent does not create them. Local verification used a gitignored placeholder `.env.local` plus a throwaway auth stand-in, which proves the gate redirect, the form, and the error path, but cannot mint a real verified session. Wiring follows the official guide and is code-verified; one operator round-trip in the preview closes it.
- Nothing else in scope was skipped. Out-of-scope items (signup, password reset, OAuth/magic links, registry tables/RLS/tokens, service-role key, Sanity/editor) were correctly **not** built.

## 5. Changed files / deliverables

**New files:**
- `src/lib/supabase/env.ts` — `requireEnv()` (clear error if a var is unset; statically inlinable).
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`).
- `src/lib/supabase/server.ts` — server client (`createServerClient` + `cookies()` getAll/setAll).
- `src/lib/supabase/middleware.ts` — `updateSession()` session-refresh helper (+ defense-in-depth redirect, `no-store`).
- `src/proxy.ts` — Next.js 16 proxy calling `updateSession`; matcher excludes static assets.
- `src/app/(auth)/login/actions.ts` — `'use server'` `signIn` (`signInWithPassword`; generic error; redirect to `/posts`).
- `src/app/(auth)/login/login-form.tsx` — `'use client'` form (`useActionState`, inline error, pending, controlled email).
- `src/app/(portal)/actions.ts` — `'use server'` `signOut` (`signOut()` + redirect to `/login`).
- `.env.local.example` — value-free template for the two browser-safe Supabase vars.

**Edited files:**
- `src/app/(auth)/login/page.tsx` — Server Component; redirects already-authed users to `/posts`; renders `<LoginForm />`.
- `src/app/(portal)/layout.tsx` — authoritative gate (`getClaims()` → `redirect('/login')`); `dynamic = 'force-dynamic'`; label from session email.
- `src/components/portal/portal-topbar.tsx` — sign-out wired to the `signOut` Server Action; `initialsFor()` handles email labels.
- `package.json` / `package-lock.json` — pinned `@supabase/ssr@0.12.0`, `@supabase/supabase-js@2.108.2`.
- State docs: `current-state.md`, `file-map.md`, `00_stack-and-config.md`, `dashboard-Decisions.md`.

**Branch / PR:** feature branch `b02-supabase-auth` → PR into protected `main` (link in the PR; merge is the operator's action).

**Secrets:** none committed. Per-client tokens and the service-role key are not part of this phase. The two Supabase values live in `.env.local` (local) and Vercel env (preview/prod) — **values are never in the repo.**

## 6. State updates done

- `current-state.md` — auth is live, `(portal)` is gated, routes table + security posture + next-phase updated. ✅
- `file-map.md` — all new files (proxy, supabase lib, login form/actions, portal actions) + edited files noted. ✅
- `00_stack-and-config.md` — Supabase deps added, env-var name corrected to `…_PUBLISHABLE_KEY`, `proxy.ts` + `.env.local.example` recorded, build status updated. ✅
- `dashboard-Decisions.md` — B.02 implementation choices appended. ✅

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary status:** This phase establishes authentication and the **server-side gate**, but does **not** yet introduce per-client tokens, the registry, or any cross-tenant write path — so the authorize-on-every-mutation check and the cross-tenant isolation **test** are still owed (B.03/B.04) and remain mandatory before any editor write ships. Important pattern locked in now and relied on later: **Server Actions re-verify on the server** (a proxy/layout check does not protect a Server Action, which is reachable by direct POST — per the Next.js Data Security guide). B.04+ write actions must `authenticate → authorize (ownership) → act`.
- **Operator action to fully close B.02:** ensure the real Supabase env values are set in `.env.local` and Vercel, create one confirmed test user, then do a sign-in → portal → sign-out round-trip in the preview. (Copy `.env.local.example` → `.env.local`.)
- **`getClaims()` performance note:** with Supabase **asymmetric** JWT signing keys it verifies locally (fast); with a legacy symmetric secret it calls the auth server on each check. Either works; asymmetric keys are preferable once the project is set up.
- **Consider tightening `main`** to require a green CodeRabbit check (or 1 approval) now that auth/security code is landing — B.03 brings real per-client tokens.
- **Tooling note for the next agent:** this repo is genuinely on **Next.js 16** — `middleware.ts` is `proxy.ts`, `cookies()` is async, Server Actions are direct-POST-reachable. Read `node_modules/next/dist/docs/` before writing, as `AGENTS.md` says.

## 8. What's now possible that wasn't before

Real, account-gated access — every later phase (registry, per-tenant Sanity bridge, the editor) can now assume "there is a known, authenticated user on the server" as its starting point.
