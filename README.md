# dashboard

**Vertex Consulting client blog portal** — a standalone, Vertex-branded web app where Vertex's clients log in and manage the blog on their own website (write, edit, draft, publish) without ever touching Sanity or seeing any secret keys. One portal, many clients; each client sees and edits only their own posts.

> This is a separate repo from the Vertex marketing site and deploys to its own subdomain. Full context lives in [`src/_project-state/`](src/_project-state/).

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-first) · shadcn/ui (`base-nova`) · Supabase (auth + registry, later phases) · Sanity per-tenant write client (later phases) · Vercel hosting.

Pinned versions and config: [`src/_project-state/00_stack-and-config.md`](src/_project-state/00_stack-and-config.md).

## Branches

Single-environment. `main` is the canonical, protected branch — feature branches merge to `main` via PR (AI review by CodeRabbit + Codex). No `development`/staging branch.

## Security boundary (read before any write-path work)

This portal holds editing keys to **every** client's blog. Per-client Sanity tokens are **server-only secrets** — never in `NEXT_PUBLIC_*`, the bundle, logs, or commits. Every mutation is **authenticated then authorized** server-side; a user can only ever act on their own client's project. Cross-tenant isolation is a tested invariant. See [`AGENTS.md`](AGENTS.md) and [`src/_project-state/dashboard-Project-Instructions.md`](src/_project-state/dashboard-Project-Instructions.md) §5. **This repo is public — zero secret values, ever.**

## Getting Started

```bash
git clone https://github.com/DinovLazar/dashboard.git
cd dashboard
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

## Folder Guide

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router — `(auth)/login`, `(portal)` shell + `posts/` |
| `src/components/ui/` | shadcn primitives (`base-nova`) |
| `src/components/portal/` | Branded shell pieces (wordmark, sidebar, top bar, nav) |
| `src/lib/` | Shared utilities (`cn`); per-tenant Supabase/Sanity modules land in later phases |
| `src/_project-state/` | **Canonical project memory** — snapshot, file map, stack/config, planning docs, decisions, completion reports |
| `docs/` | Living knowledge base — architecture, workflows, runbooks, integrations |
| `briefs/` · `reports/` · `status/` | Standard Vertex repo folders (phase reports live in `src/_project-state/completions/`) |

## Conventions

See [`CLAUDE.md`](CLAUDE.md) → [`AGENTS.md`](AGENTS.md) for the full operating rules (PR-only to `main`, one phase = one PR = one completion report, the security model). Current state: [`src/_project-state/current-state.md`](src/_project-state/current-state.md).

---

*dashboard | Vertex Consulting | 2026-06-26*
