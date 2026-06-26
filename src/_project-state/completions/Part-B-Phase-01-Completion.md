# Part B · Phase 01 · Code — Project setup (repo + branded shell on Vercel) — Completion Report

**Date:** 2026-06-26 · **Outcome (one line):** The portal now has its own public, protected GitHub repo and a Vertex-branded skeleton (login + portal shell + empty Posts) that builds clean and is live on a Vercel preview URL.

- **Repo:** https://github.com/DinovLazar/dashboard (public)
- **Vercel preview:** https://dashboard-six-iota-33.vercel.app
- **Branch / PR:** `b-01-project-setup` → [PR #1](https://github.com/DinovLazar/dashboard/pull/1) (squash-merged to `main`)

---

## 1. What shipped (plain language)

The client portal now has a clean, secure home of its own — a brand-new public GitHub repository, separate from the Vertex marketing site, with the `main` branch protected so nothing reaches it except through a reviewed pull request. Inside it is the first thing anyone can actually look at: a Vertex-branded skeleton of the app — a sign-in screen, the logged-in "portal" frame (sidebar, top bar, a spot for the client's name and a sign-out button), and an empty "Your posts" page — all styled to read as Vertex. It does not *do* anything yet (you can't really sign in, and there are no posts); this phase delivered the safe foundation and the look. It's deployed and viewable at a Vercel preview link.

## 2. Definition of Done

- ✅ **`DinovLazar/dashboard` exists, public, `main` protected** — evidence: repo at https://github.com/DinovLazar/dashboard; `gh api .../branches/main/protection` returns `prs_required:true, approvals:0, enforce_admins:true, force_push:false, deletions:false, conversation_resolution:true`.
- ✅ **`docs/runbooks/ai-review-setup.md` committed; `CLAUDE.md` + `AGENTS.md` present** — runbook covers CodeRabbit + Codex; `CLAUDE.md` carries the Vertex implementation standard + the security-override rule (imports `@AGENTS.md`); `AGENTS.md` carries PR-only rules, the before/after-work routine, and the full security boundary (server-only tokens, authenticate-then-authorize, least-privilege Editor tokens, the cross-tenant isolation test, public-repo zero-secrets).
- ✅ **`.gitignore` ignores `.env*` and `.vercel`; no secret anywhere** — copied from Vertex; verified no env/token/key values in the tree or history (there are no integrations yet, so nothing to leak).
- ✅ **App scaffolded with the pinned versions; `npm run build` passes clean** — `next@16.2.3`, `react`/`react-dom@19.2.4`, `typescript@^5`, `tailwindcss@^4` + `@tailwindcss/postcss@^4`, `shadcn@^4.2.0`, `clsx`/`tailwind-merge`/`class-variance-authority`/`tw-animate-css`/`lucide-react`. Build output: 5 routes prerendered, TypeScript clean (locally and on Vercel).
- ✅ **shadcn/ui initialised matching `components.json`** — style `base-nova`, base color `neutral`, css `src/app/globals.css`, lucide, RSC on; primitives `button/input/label/card` added via the CLI.
- ✅ **Vertex `@theme` tokens in `globals.css`; Archivo + Source Serif 4 via `next/font`; dark theme; reads as Vertex** — tokens copied from the marketing site; fonts loaded in `src/app/layout.tsx`; `html { color-scheme: dark }` + `<html class="dark" data-theme="dark">`. Verified in the browser (body `#141414`, text `#F5F5F5`, Archivo headings, serif body, white primary button, the real "V" mark).
- ✅ **Routes render: `/login`, the portal shell, `/posts`** — confirmed via the local preview (desktop + mobile screenshots) and the deployed URL.
- ✅ **A Vercel preview URL loads and renders the branded shell end-to-end** — https://dashboard-six-iota-33.vercel.app returns 200; `/login` serves the branded markup (VERTEX / Client Portal / Sign in), no auth wall.
- ✅ **`src/_project-state/` exists with the four planning docs, `00_stack-and-config.md`, `current-state.md`, `file-map.md`, `README.md`, and `completions/` with a template** — all present; planning docs moved under `src/` to mirror Vertex.
- ✅ **Completion report filed and `current-state.md` updated to match what shipped** — this file + `current-state.md`.

## 3. Decisions I made during this phase

Recorded in full in `dashboard-Decisions.md` (2026-06-26 — "B.01 implementation choices"). Summary:

1. **Canonical docs home is `src/_project-state/`** (per the brief + mirroring Vertex). Moved the root `_project-state/` and the five planning docs there; updated `AGENTS.md`/`CLAUDE.md` path references. → needs Decisions entry: **yes (logged).**
2. **shadcn token bridge wraps HSL triplets in `hsl()`.** Vertex's bare `var(--primary)` mapping yields invalid colors when a real shadcn primitive consumes it (Vertex's visible UI never uses the primitives; the portal does). → **yes (logged).**
3. **Portal chrome + buttons use Archivo (`font-heading`)** to match Vertex's CTA language (base-nova defaults to the body font). → **yes (logged).**
4. **`@base-ui/react` added** as the required peer of the base-nova primitives (resolved `^1.6.0`, satisfies Vertex's `^1.4.0`). → **yes (logged).**
5. **Repo history: one empty initial commit on `main`, then the whole phase via one PR** — to satisfy both branch protection (which needs `main` to pre-exist) and "one PR for the phase." → **yes (logged).**
6. **B.01 preview deployed via the Vercel CLI**; the Vercel↔GitHub auto-deploy connect remains an owner step. → **yes (logged).**
7. **`next.config.ts` kept minimal** (no Sanity image remotePattern yet). → **yes (logged).**

## 4. Deviations from the brief / spec

- **Token bridge `hsl()` wrap** (decision #2) is the only place `globals.css` diverges from a verbatim copy of Vertex — a necessary correctness fix so the primitives render, not a new palette.
- **Standard `briefs/ reports/ status/` folders created** in addition to `docs/`. The brief's tasks only named `docs/runbooks/ai-review-setup.md` explicitly, but the planning docs (`dashboard-Plan.md` §4, the file map) list `docs/ briefs/ reports/ status/` as the Vertex standard, so all four were created. `reports/` README points at `src/_project-state/completions/` as the canonical report home (per `AGENTS.md`).
- Nothing in the brief was skipped or deferred.

## 5. Changed files / deliverables

New repo, so everything is new. Highlights:
- **App:** `src/app/layout.tsx`, `globals.css`, `page.tsx` (→ `/login`), `icon.svg`; `(auth)/login/page.tsx`; `(portal)/layout.tsx` + `posts/page.tsx`.
- **Components:** `src/components/ui/{button,input,label,card}.tsx` (base-nova); `src/components/portal/{wordmark,portal-sidebar,portal-topbar,portal-nav}.tsx`; `src/lib/utils.ts`.
- **Config:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.gitignore`, `.claude/launch.json`.
- **Docs / state:** `README.md`, `CLAUDE.md`, `AGENTS.md` (paths reconciled), `docs/` (+ runbook), `briefs/`, `reports/`, `status/`, and `src/_project-state/` (planning docs + `current-state.md` + `file-map.md` + `00_stack-and-config.md` + `README.md` + `completions/`).
- **Ops:** GitHub repo `DinovLazar/dashboard` (public, protected `main`); Vercel project `dinovlazars-projects/dashboard` (preview deployed).
- **Secrets:** none created or stored. No tokens/keys exist yet; none appear anywhere in the repo or history.

## 6. State updates done

`current-state.md` (rewritten to the B.01 snapshot), `file-map.md` (real tree), `00_stack-and-config.md` (real pins + config), `dashboard-Decisions.md` (B.01 entry appended), `status/STATUS.md` (phase ledger). All match reality.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary is not yet exercised** — there are no tokens, no auth, no data in B.01, so there is nothing to leak. From B.02 onward the load-bearing rules become real: server-only per-client tokens, authenticate-then-authorize on **every** mutation, least-privilege Editor tokens, and the **cross-tenant isolation test** that must cover the write path before the editor ships. The `(portal)` routes are currently **reachable without auth** — B.02 must gate them first.
- **Owner one-time setup (non-blocking):** install the CodeRabbit GitHub app and connect Codex to the repo (`docs/runbooks/ai-review-setup.md`); connect the Vercel↔GitHub app so pushes auto-deploy (B.01's preview was a CLI deploy). Until CodeRabbit is installed, PRs are reviewed manually.
- **`globals.css` deviation** (the `hsl()` bridge wrap) is intentional and documented — keep it when extending the theme.

## 8. What's now possible that wasn't before

Every later phase now has a real, branded, deployable home to build inside — the next step (B.02) can wire Supabase auth straight into the existing login screen and portal shell.
