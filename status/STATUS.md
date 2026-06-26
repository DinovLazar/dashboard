# dashboard — Project Status

> High-level phase ledger. The full, authoritative snapshot is
> [`src/_project-state/current-state.md`](../src/_project-state/current-state.md).

## Current Status

| Field | Value |
|-------|-------|
| **Current Phase** | B.01 complete — next up B.02 (Supabase auth) |
| **Started** | 2026-06-26 |
| **Last Updated** | 2026-06-26 |
| **Working Branch** | `main` (single-env) |
| **Blockers** | None (owner one-time setup: CodeRabbit + Codex connect — see `docs/runbooks/ai-review-setup.md`) |

## Phase History

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| B.01 — Project setup + branded shell | **DONE** | 2026-06-26 | Repo bootstrapped, Next.js 16 + Tailwind v4 + shadcn (base-nova) scaffold, Vertex brand, static login + portal shell + empty Posts, Vercel preview. |
| B.02 — Supabase auth | — | — | Login, sessions, protected routes, logout. No public signup. |

## Next

- [ ] B.02 — Supabase auth (see `src/_project-state/dashboard-Phase-Plan.md`)
- [ ] Owner: install CodeRabbit + connect Codex (`docs/runbooks/ai-review-setup.md`)

## Known Issues / Follow-ups

See `src/_project-state/current-state.md` → "Risks & follow-ups".

---

*dashboard | STATUS | 2026-06-26*
