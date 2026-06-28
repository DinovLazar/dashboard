# Dashboard — Current State

> The full project snapshot. **Read this first every session.** Factual, not aspirational — it records what IS.
> Last updated: **2026-06-26** (end of Phase **B.02**).

## One-line status

The portal now has a **real locked door**: Supabase email + password auth is live. A user Vertex created can sign in at `/login` and reach the portal; everyone else is bounced to `/login`; sign-out ends the session. Still **no data, no Sanity, no editor** — those come in B.03+. There is still no public signup (by design).

## Links

- **GitHub:** https://github.com/DinovLazar/dashboard (public, `main` protected)
- **Vercel preview:** https://dashboard-six-iota-33.vercel.app (renders the branded shell; `/` → `/login`)
- **Vercel project:** `dinovlazars-projects/dashboard`

## What is live

**From B.01 (foundation + look):**
- A public GitHub repo bootstrapped to the Vertex standard: protected `main` (PRs required, 0 approvals, no force-push/deletion, conversation-resolution required, admin-enforced), `docs/ briefs/ reports/ status/`, and the AI-review runbook (`docs/runbooks/ai-review-setup.md`).
- A Next.js 16 + React 19 + TypeScript + Tailwind v4 (CSS-first) + shadcn/ui (`base-nova`) app that builds clean (`npm run build`) and deploys to Vercel.
- The Vertex brand applied: `@theme` tokens copied from the marketing site, Archivo + Source Serif 4 via `next/font`, dark-only theme. The shell visibly reads as Vertex.
- `src/_project-state/` stood up as the canonical documentation home (mirroring Vertex), with the planning docs, this snapshot, the file map, stack/config, and `completions/`.

**New in B.02 (Supabase auth — the locked door):**
- **Supabase server-side auth** via `@supabase/ssr` + `@supabase/supabase-js` (pinned). Three client utilities in `src/lib/supabase/`: `client.ts` (browser), `server.ts` (server — Server Components/Actions/Route Handlers), `middleware.ts` (the session-refresh helper).
- **`src/proxy.ts`** — Next.js 16's renamed successor to `middleware.ts` (the `middleware` file convention was deprecated in Next 16). Refreshes the session on every matched request; matcher excludes static assets/image optimization. Also redirects unauthenticated requests off non-public routes (defense-in-depth).
- **`/login` is functional:** email + password sign-in via a **Server Action** (`signInWithPassword`). Success → redirect to `/posts`; invalid credentials → a generic inline "Incorrect email or password." (no user-enumeration). **No signup link/form anywhere** — verified.
- **`(portal)` is gated:** the `(portal)` layout (a Server Component) is the authoritative gate — it verifies the user with **`getClaims()`** and `redirect('/login')` if there is no authenticated user. The top-bar label shows the signed-in user's email until the client registry lands (B.03).
- **Sign-out works:** the top-bar affordance posts to a **Server Action** that calls `signOut()` and returns to `/login`.
- **No-cache hardening:** the `(portal)` layout is `export const dynamic = 'force-dynamic'`; auth-bearing routes render per-request and are never statically/CDN-cached. The proxy sets `Cache-Control: no-store` on its redirect responses so a session-refresh `Set-Cookie` can't be cached and replayed.

## What is NOT built yet (by design)

- **No data / registry / tokens / Sanity / API routes / editor.** The `clients` + `client_users` tables, RLS, and encrypted per-client tokens are **B.03**; the read path + isolation test is **B.04**; the editor is **B.05+**.
- **No password reset / "forgot password"** — deferred to a later phase (out of scope for B.02).
- **No public signup, ever.** Accounts are created by Vertex in the Supabase dashboard.
- **No custom subdomain / DNS.** The preview is a `*.vercel.app` URL. → Bucket P.
- **No i18n** in the portal chrome (English-only for v1; per-field content localisation arrives with the editor, B.05).

## Security posture (B.02)

- **No secrets in the repo or its history.** This phase uses only the two browser-safe `NEXT_PUBLIC_*` values (URL + **publishable** key, protected by Supabase RLS). The server-only service-role key and per-client Sanity tokens are **not** introduced yet (B.03+). `.gitignore` still ignores `.env*` and `.vercel`; a value-free `.env.local.example` documents the two required vars.
- **Auth is verified with `getClaims()`** (validates the JWT), not the unverified `getSession()` user object — both at the proxy and at the authoritative `(portal)` layout gate.
- **Server Actions re-verify on the server.** Per the Next.js Data Security guide, a proxy/layout check does not protect a Server Action (reachable by direct POST), so the sign-out action goes through the server Supabase client itself. This pattern is load-bearing for B.04+ write paths (authenticate-then-authorize on every mutation; cross-tenant isolation test) — documented in `AGENTS.md` and `dashboard-Project-Instructions.md` §5.

## Stack (see `00_stack-and-config.md` for exact pins)

Next 16.2.3 · React 19.2.4 · TS ^5 · Tailwind v4 · shadcn `base-nova` (+ `@base-ui/react`) · lucide-react · clsx/tailwind-merge/cva/tw-animate-css · **@supabase/ssr 0.12.0 + @supabase/supabase-js 2.108.2**. Hosted on Vercel.

## Routes

| Route | What it is | Status |
|---|---|---|
| `/` | redirect → `/login` | live |
| `/login` | branded sign-in, **functional** (email + password Server Action; authed users redirected to `/posts`) | **live** |
| `/posts` | empty "Your posts" placeholder | visual only, now **gated** |
| (portal layout) | branded sidebar + top bar wrapping portal pages | **gated** — `getClaims()` redirects anon → `/login`; dynamic/no-cache |
| `proxy.ts` | session refresh + defense-in-depth redirect on every matched request | live |

## Risks & follow-ups

- **Operator prerequisites for B.02 to actually run (must be true in the deployed env):** a Supabase project exists; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in **`.env.local`** (local) and in **Vercel** (preview/prod); and **one confirmed test user** exists (Supabase → Authentication → Users → Add user, auto-confirm on). Copy `.env.local.example` → `.env.local` and fill in the two values. The agent does **not** create the project, keys, or users.
- **Local verification was done against placeholder/mocked Supabase** (a gitignored `.env.local` + a throwaway 400-returning auth stand-in). Proven locally: signed-out `/posts` → 307 → `/login` (with `no-store`); `/` → `/login`; the login form renders with no signup; wrong credentials → generic inline error, no crash, email preserved. **Not yet exercised end-to-end** (needs the real Supabase + confirmed user): a *successful* sign-in landing in the portal, the email label, and sign-out. The wiring follows the official Supabase guide and is code-verified; the operator should do one real round-trip in the preview.
- **Owner one-time setup (not a blocker):** install the CodeRabbit GitHub app and connect Codex to `DinovLazar/dashboard` (see `docs/runbooks/ai-review-setup.md`); the Vercel↔GitHub app connect for automatic deploys-on-push. **Now that auth code is landing, strongly consider requiring a green CodeRabbit check (or 1 approval) on `main`** before B.03 lands real per-client tokens.
- Brand `globals.css` deviates from Vertex in one spot (the shadcn token bridge wraps HSL triplets in `hsl()`); see `dashboard-Decisions.md`.

## Next phase

**B.03 — Registry data model:** the `clients` + `client_users` tables in Supabase (per-client config columns + **encrypted** token storage), Row-Level Security so a user reads only their own mapping, and one seeded **test** client. *Done when:* the test user resolves to exactly one client config via an RLS-protected query. See `dashboard-Phase-Plan.md`.
