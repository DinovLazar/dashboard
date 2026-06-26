# Dashboard — Current State

> The full project snapshot. **Read this first every session.** Factual, not aspirational — it records what IS.
> Last updated: **2026-06-26** (end of Phase **B.01**).

## One-line status

The repo exists, the branded shell is built and deploys to a Vercel preview. **Nothing functional yet** — no auth, no data, no Sanity. B.01 delivered the safe foundation and the look only.

## Links

- **GitHub:** https://github.com/DinovLazar/dashboard (public, `main` protected)
- **Vercel preview:** https://dashboard-six-iota-33.vercel.app (renders the branded shell; `/` → `/login`)
- **Vercel project:** `dinovlazars-projects/dashboard`

## What is live (B.01)

- A public GitHub repo bootstrapped to the Vertex standard: protected `main` (PRs required, 0 approvals, no force-push/deletion, conversation-resolution required, admin-enforced), `docs/ briefs/ reports/ status/`, and the AI-review runbook (`docs/runbooks/ai-review-setup.md`).
- A Next.js 16 + React 19 + TypeScript + Tailwind v4 (CSS-first) + shadcn/ui (`base-nova`) app that builds clean (`npm run build`) and deploys to Vercel.
- The Vertex brand applied: `@theme` tokens copied from the marketing site, Archivo + Source Serif 4 via `next/font`, dark-only theme. The shell visibly reads as Vertex.
- **Branded shell (visual only, no behaviour):**
  - `/login` — static, on-brand sign-in screen (email + password + "Sign in"). Does nothing.
  - `(portal)` shell — branded sidebar + top bar, a slot for the signed-in client's label ("Demo Client" placeholder), a non-functional sign-out affordance. Responsive (sidebar collapses to a mobile nav).
  - `/posts` — empty "Your posts" placeholder: heading, empty-state, disabled "New post".
- `src/_project-state/` stood up as the canonical documentation home (mirroring Vertex), with the planning docs, this snapshot, the file map, stack/config, and `completions/`.

## What is NOT built yet (by design)

- **No authentication.** The login screen is a static placeholder; `(portal)` routes are **not gated**. → B.02 (Supabase).
- **No data / registry / tokens / Sanity / API routes / editor.** → B.03–B.07.
- **No custom subdomain / DNS.** The preview is a `*.vercel.app` URL. → Bucket P.
- **No i18n** in the portal chrome (English-only for v1; per-field content localisation arrives with the editor, B.05).

## Security posture (B.01)

No secrets exist in this repo or its history — there are no integrations yet, so there is nothing to leak. `.gitignore` ignores `.env*` and `.vercel`. The load-bearing token-handling rules (server-only per-client tokens, authenticate-then-authorize on every mutation, least-privilege Editor tokens, the cross-tenant isolation test) become active in B.02–B.04; they are documented in `AGENTS.md` and `dashboard-Project-Instructions.md` §5 and must be honoured before any write path ships.

## Stack (see `00_stack-and-config.md` for exact pins)

Next 16.2.3 · React 19.2.4 · TS ^5 · Tailwind v4 · shadcn `base-nova` (+ `@base-ui/react`) · lucide-react · clsx/tailwind-merge/cva/tw-animate-css. Hosted on Vercel.

## Routes

| Route | What it is | Status |
|---|---|---|
| `/` | redirect → `/login` | live |
| `/login` | static branded sign-in | visual only |
| `/posts` | empty "Your posts" placeholder | visual only |
| (portal layout) | branded sidebar + top bar wrapping portal pages | visual only, **ungated** |

## Risks & follow-ups

- **Owner one-time setup (not a blocker):** install the CodeRabbit GitHub app and connect Codex to `DinovLazar/dashboard` (see `docs/runbooks/ai-review-setup.md`); the Vercel↔GitHub app connect for automatic deploys-on-push (the B.01 preview was deployed via the Vercel CLI). Until CodeRabbit is installed, PRs are reviewed manually.
- **`(portal)` is reachable without auth** until B.02 — expected for the shell phase, but the very next phase must gate it.
- Brand `globals.css` deviates from Vertex in one spot (the shadcn token bridge wraps HSL triplets in `hsl()`); see `dashboard-Decisions.md`.

## Next phase

**B.02 — Supabase auth:** login, sessions, protected portal routes, logout. No public signup. See `dashboard-Phase-Plan.md`.
