# File Map — Dashboard (Vertex client blog portal)

Where things live. **Build status: auth + registry data layer (Phase B.03 complete).** Real paths below; every phase updates this file as files land.

## Repo root

- `README.md` — project overview + folder guide
- `CLAUDE.md` — imports `@AGENTS.md` + the implementation standard + the security override rule
- `AGENTS.md` — agent operating rules + the security boundary (paths point at `src/_project-state/`)
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`)
- `.env.local.example` — value-free template: browser-safe Supabase vars (B.02) + the two server-only secrets and the verify-script test creds (B.03); copy to `.env.local` (gitignored) and fill in
- `package.json`, `tsconfig.json`, `next.config.ts`, `components.json`, `postcss.config.mjs`, `eslint.config.mjs` — config (B.01); `package.json` gains `test`/`seed`/`verify` scripts + `vitest`/`tsx`/`server-only` (B.03)
- `vitest.config.ts` — **B.03** Vitest config (Node env; aliases `server-only`/`client-only` → the no-op stub)
- `.claude/launch.json` — local preview server config (dev + prod)
- `docs/`, `briefs/`, `reports/`, `status/` — standard Vertex repo folders (B.01)
- `scripts/`, `supabase/`, `test/` — **B.03** (see their own sections below)

## src/  (Next.js root level)

- `proxy.ts` — **B.02** Next.js 16 proxy (renamed successor to `middleware.ts`): refreshes the Supabase session on every matched request + defense-in-depth redirect of unauthenticated requests; matcher excludes static assets

## docs/

- `README.md` — knowledge-base guide
- `runbooks/ai-review-setup.md` — CodeRabbit + Codex setup (owner one-time step)
- `runbooks/registry-apply.md` — **B.03** operator runbook: apply the schema SQL, create/confirm the test user, fill `.env.local`, run seed + verify
- `architecture/`, `workflows/`, `integrations/` — `.gitkeep` placeholders for later phases

## briefs/ · reports/ · status/

- `briefs/README.md` + `_templates/brief-template.md` — phase-prompt home
- `reports/README.md` + `_templates/completion-report-template.md` — points at `src/_project-state/completions/` (the canonical report home)
- `status/README.md` + `STATUS.md` — high-level phase ledger pointing at `current-state.md`

## scripts/  (B.03 — operator one-off scripts, run with tsx)

- `tsconfig.json` — tsx config: extends root, aliases `server-only`/`client-only` → the no-op stub
- `test-fixtures.ts` — shared throwaway fixtures: `DUMMY_TOKEN` (a literal fake) + the test client config. **No real secret.**
- `seed-test-client.ts` — service-role seed of one throwaway client + its encrypted dummy token + the user→client mapping; idempotent (reuses an existing mapping); reads the test user UUID from a CLI arg / `TEST_USER_ID`
- `verify-registry.ts` — signs in as the test user (publishable key) and asserts RLS isolation (clients=1, client_users=1, client_secrets=0), then confirms the service-role can decrypt the seeded dummy token

## supabase/  (B.03 — not a repo runtime path; applied to the Supabase project)

- `migrations/20260627120000_registry.sql` — the registry schema: `clients`, `client_users`, `client_secrets` + RLS + the deny-all lockdown on `client_secrets`

## test/  (B.03)

- `setup/server-guard-stub.ts` — no-op stand-in for the `server-only`/`client-only` marker packages, used only by Vitest + the tsx scripts (never the real Next build)

## src/_project-state/  (canonical project memory)

- `README.md` — folder guide + session rules
- `current-state.md` — full snapshot (read first)
- `file-map.md` — this file
- `00_stack-and-config.md` — pinned versions, config, env inventory
- `dashboard-Project-Instructions.md`, `dashboard-Plan.md`, `dashboard-Phase-Plan.md`, `dashboard-Decisions.md`, `dashboard-Notion-Checklist.md` — planning docs
- `completions/` — one report per phase
  - `Part-X-Phase-YY-Completion.md` — the template
  - `Part-B-Phase-01-Completion.md` — B.01 report
  - `Part-B-Phase-03-Completion.md` — **B.03** report

## src/app/  (Next.js App Router)

- `layout.tsx` — root layout: `next/font` (Archivo + Source Serif 4), metadata, dark `<html>`, `<body>`
- `globals.css` — Vertex brand tokens + shadcn `base-nova` bridge + base layer + brand utilities
- `page.tsx` — `/` → redirects to `/login`
- `icon.svg` — favicon (the Vertex "V" mark)
- `(auth)/login/page.tsx` — branded login (Server Component): redirects already-authed users to `/posts`, else renders `<LoginForm />` (**B.02**)
- `(auth)/login/login-form.tsx` — **B.02** `'use client'` form: `useActionState(signIn)`, inline generic error, pending state, controlled email
- `(auth)/login/actions.ts` — **B.02** `'use server'` `signIn` action (`signInWithPassword`; generic error; redirect to `/posts` on success)
- `(portal)/layout.tsx` — authenticated-portal shell; **B.02 authoritative gate** (`getClaims()` → redirect anon to `/login`) + `export const dynamic = 'force-dynamic'`; top-bar label = signed-in email
- `(portal)/actions.ts` — **B.02** `'use server'` `signOut` action (`signOut()` + redirect to `/login`)
- `(portal)/posts/page.tsx` — empty "Your posts" placeholder (real list = B.04; editor = B.05)

## src/components/

- `ui/` — shadcn `base-nova` primitives: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`
- `portal/` — shell pieces: `wordmark.tsx`, `portal-sidebar.tsx`, `portal-topbar.tsx` (**B.02:** sign-out wired to the `signOut` Server Action; `initialsFor` handles email labels), `portal-nav.tsx`

## src/lib/

- `utils.ts` — `cn()` (clsx + tailwind-merge).
- `supabase/` — server-side Supabase modules:
  - `env.ts` — **B.02** `requireEnv()` reader for the two browser-safe `NEXT_PUBLIC_*` vars (clear error if unset; statically inlined)
  - `client.ts` — **B.02** `createClient()` browser client (`createBrowserClient`)
  - `server.ts` — **B.02** `createClient()` server client (`createServerClient` + `cookies()` getAll/setAll)
  - `middleware.ts` — **B.02** `updateSession()` session-refresh helper used by `proxy.ts`
  - `admin.ts` — **B.03** `createAdminClient()` service-role client (`import 'server-only'`; bypasses RLS; `persistSession:false`, `autoRefreshToken:false`) — reads `client_secrets`; never imported by a client component
- `crypto/` — **B.03**:
  - `tokens.ts` — `import 'server-only'`; AES-256-GCM `encryptToken` / `decryptToken` (12-byte IV, 32-byte key from `SANITY_TOKEN_ENC_KEY`)
  - `tokens.test.ts` — Vitest unit tests (round-trip, tamper-throws, wrong-key-throws, unique-IV, key validation)

## Planned (not yet created)

- `src/app/(portal)/posts/new/`, `posts/[id]/` — create / edit (B.05)
- `src/app/api/posts/`, `api/publish/`, `api/upload/` — server route handlers (B.04–B.07)
- `src/lib/registry/` — resolve user → client config + token, with the authorize/ownership check (B.04); `src/lib/sanity/` — per-tenant write-client factory (B.04); `src/lib/config/` — field-map / locale helpers (B.05)
- `src/components/editor/` — config-driven post editor (B.05)
- Supabase tables `clients` + `client_users` + `client_secrets` with RLS now EXIST (B.03); the read path that uses them + the cross-tenant isolation test land in B.04
