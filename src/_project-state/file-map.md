# File Map — Dashboard (Vertex client blog portal)

Where things live. **Build status: scaffolded (Phase B.01 complete).** Real paths below; every phase updates this file as files land.

## Repo root

- `README.md` — project overview + folder guide
- `CLAUDE.md` — imports `@AGENTS.md` + the implementation standard + the security override rule
- `AGENTS.md` — agent operating rules + the security boundary (paths point at `src/_project-state/`)
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`)
- `package.json`, `tsconfig.json`, `next.config.ts`, `components.json`, `postcss.config.mjs`, `eslint.config.mjs` — config (B.01)
- `.claude/launch.json` — local preview server config (dev + prod)
- `docs/`, `briefs/`, `reports/`, `status/` — standard Vertex repo folders (B.01)

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
- `(auth)/login/page.tsx` — static branded login (real auth wired in B.02)
- `(portal)/layout.tsx` — authenticated-portal shell (sidebar + top bar + mobile nav); **not gated yet** (B.02)
- `(portal)/posts/page.tsx` — empty "Your posts" placeholder (real list = B.04; editor = B.05)

## src/components/

- `ui/` — shadcn `base-nova` primitives: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`
- `portal/` — shell pieces: `wordmark.tsx`, `portal-sidebar.tsx`, `portal-topbar.tsx`, `portal-nav.tsx`

## src/lib/

- `utils.ts` — `cn()` (clsx + tailwind-merge). Per-tenant Supabase/Sanity/registry modules land in B.02–B.04.

## Planned (not yet created)

- `src/app/(portal)/posts/new/`, `posts/[id]/` — create / edit (B.05)
- `src/app/api/posts/`, `api/publish/`, `api/upload/` — server route handlers (B.04–B.07)
- `src/lib/supabase/`, `src/lib/registry/`, `src/lib/sanity/`, `src/lib/config/` — server-only modules (B.02–B.05)
- `src/components/editor/` — config-driven post editor (B.05)
- Supabase (not a repo path): `clients` + `client_users` tables, RLS, encrypted token storage (B.03)
