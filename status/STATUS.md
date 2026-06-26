# dashboard — Project Status

> High-level phase ledger. The full, authoritative snapshot is
> [`src/_project-state/current-state.md`](../src/_project-state/current-state.md).

## Current Status

| Field | Value |
|-------|-------|
| **Current Phase** | B.02 complete (auth live) — next up B.03 (registry data model) |
| **Started** | 2026-06-26 |
| **Last Updated** | 2026-06-26 |
| **Working Branch** | `main` (single-env) |
| **Blockers** | None. Operator to set the two Supabase env vars + create one confirmed test user to exercise sign-in end-to-end (see `current-state.md` → Risks). |

## Phase History

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| B.01 — Project setup + branded shell | **DONE** | 2026-06-26 | Repo bootstrapped, Next.js 16 + Tailwind v4 + shadcn (base-nova) scaffold, Vertex brand, static login + portal shell + empty Posts, Vercel preview. |
| B.02 — Supabase auth | **DONE** | 2026-06-26 | `@supabase/ssr` clients, `proxy.ts` session refresh, functional email+password login (Server Action), `(portal)` gated via `getClaims()`, sign-out, no-cache hardening. No public signup. |
| B.03 — Registry data model | — | — | `clients` + `client_users` tables, per-client config + encrypted tokens, RLS, one seeded test client. |

## Next

- [ ] B.03 — Registry data model (see `src/_project-state/dashboard-Phase-Plan.md`)
- [ ] Owner: set Supabase env vars + create a confirmed test user; do one sign-in round-trip in the preview
- [ ] Owner: install CodeRabbit + connect Codex (`docs/runbooks/ai-review-setup.md`)

## Known Issues / Follow-ups

See `src/_project-state/current-state.md` → "Risks & follow-ups".

---

*dashboard | STATUS | 2026-06-26*
