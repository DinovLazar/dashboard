# File Map — Dashboard (Vertex client blog portal)

Where things live. **Build status: auth live (Phase B.02 complete).** Real paths below; every phase updates this file as files land.

## Repo root

- `README.md` — project overview + folder guide
- `CLAUDE.md` — imports `@AGENTS.md` + the implementation standard + the security override rule
- `AGENTS.md` — agent operating rules + the security boundary (paths point at `src/_project-state/`)
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`)
- `.env.local.example` — value-free template for the two browser-safe Supabase vars (B.02); copy to `.env.local` (gitignored) and fill in
- `package.json`, `tsconfig.json`, `next.config.ts`, `components.json`, `postcss.config.mjs`, `eslint.config.mjs` — config (B.01)
- `.claude/launch.json` — local preview server config (dev + prod)
- `docs/`, `briefs/`, `reports/`, `status/` — standard Vertex repo folders (B.01)

## src/  (Next.js root level)

- `proxy.ts` — **B.02** Next.js 16 proxy (renamed successor to `middleware.ts`): refreshes the Supabase session on every matched request + defense-in-depth redirect of unauthenticated requests; matcher excludes static assets

## docs/

- `README.md` — knowledge-base guide
- `runbooks/ai-review-setup.md` — CodeRabbit + Codex setup (owner one-time step)
- `architecture/`, `workflows/`, `integrations/` — `.gitkeep` placeholders for later phases

## briefs/ · reports/ · status/

- `briefs/README.md` + `_templates/brief-template.md` — phase-prompt home
- `reports/README.md` + `_templates/completion-report-template.md` — points at `src/_project-state/completions/` (the canonical report home)
- `status/README.md` + `STATUS.md` — high-level phase ledger pointing at `current-state.md`

## src/_project-state/  (canonical project memory)

- `README.md` — folder guide + session rules
- `current-state.md` — full snapshot (read first)
- `file-map.md` — this file
- `00_stack-and-config.md` — pinned versions, config, env inventory
- `dashboard-Project-Instructions.md`, `dashboard-Plan.md`, `dashboard-Phase-Plan.md`, `dashboard-Decisions.md`, `dashboard-Notion-Checklist.md` — planning docs
- `completions/` — one report per phase
  - `Part-X-Phase-YY-Completion.md` — the template
  - `Part-B-Phase-01-Completion.md` — B.01 report

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
- `supabase/` — **B.02** server-side auth modules:
  - `env.ts` — `requireEnv()` reader for the two browser-safe `NEXT_PUBLIC_*` vars (clear error if unset; statically inlined)
  - `client.ts` — `createClient()` browser client (`createBrowserClient`)
  - `server.ts` — `createClient()` server client (`createServerClient` + `cookies()` getAll/setAll)
  - `middleware.ts` — `updateSession()` session-refresh helper used by `proxy.ts`
- Per-tenant registry/Sanity modules land in B.03–B.04.

## Planned (not yet created)

- `src/app/(portal)/posts/new/`, `posts/[id]/` — create / edit (B.05)
- `src/app/api/posts/`, `api/publish/`, `api/upload/` — server route handlers (B.04–B.07)
- `src/lib/registry/`, `src/lib/sanity/`, `src/lib/config/` — server-only modules (B.03–B.05)
- `src/components/editor/` — config-driven post editor (B.05)
- Supabase (not a repo path): `clients` + `client_users` tables, RLS, encrypted token storage (B.03)
