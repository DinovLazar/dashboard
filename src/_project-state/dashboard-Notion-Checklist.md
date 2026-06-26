# Dashboard — Notion Checklist

A copy-into-Notion checklist for the Vertex Consulting client blog portal. Mirrors `dashboard-Phase-Plan.md`. Tick items as they land; the source of truth for *what's actually built* is `_project-state/current-state.md`.

## Pre-build inputs (gather these; most aren't needed until Bucket M)

- [ ] Dalibor Plečić repo URL (or paste its `sanity.config.ts` + blog schema if the repo is private)
- [ ] `Master-Prompt.md` re-shared (original upload came through empty)
- [ ] A Supabase project created for the portal
- [ ] Chosen subdomain confirmed (e.g. `portal.vertexconsulting.mk`) + DNS access
- [ ] One least-privilege **Editor** Sanity token per client project (Vertex, Sunset, Dalibor) — generated during Make-it-work
- [ ] Each client site's `revalidate_url` confirmed
- [ ] Client editor email addresses for account creation
- [ ] Vertex brand tokens (colors, fonts, key UI pieces) exported from the marketing site

## Bucket B — Building

- [ ] **B.01** Repo bootstrap (protected `main`, `docs/ briefs/ reports/ status/`, CodeRabbit + Codex) + Next.js 16 / React 19 / TS / Tailwind v4 / shadcn scaffold + Vertex brand tokens + empty shell deployed to Vercel
- [ ] **B.02** Supabase auth — login, sessions, protected routes, logout (no public signup)
- [ ] **B.03** Registry tables (`clients`, `client_users`) + per-client config columns + encrypted token storage + RLS + one test client seeded
- [ ] **B.04** Per-tenant Sanity bridge (resolve user → client config + token, authorize, factory) + read path (list this client's posts) + isolation test (A can't read B)
- [ ] **B.05** Editor — list / create / edit / delete / draft / publish (essentials), config-driven, localized tabs when needed + write-isolation test
- [ ] **B.06** Server-side image upload into the client's own Sanity dataset
- [ ] **B.07** Publish → trigger the client site's `revalidate_url`; graceful failure handling
- [ ] **B.08** Accessibility + polish (keyboard, labels, empty/error/loading states, mobile pass)

## Bucket M — Make-it-work

- [ ] **M.01** Onboard Vertex, Sunset, Dalibor — Editor token + registry row + field map per client
- [ ] **M.02** Per-client end-to-end test (create → edit → draft → publish → delete + live refresh) and isolation check across clients
- [ ] **M.03** Security review (no token leaks, RLS, authorize-on-every-mutation, rate limiting) + rotate any token pasted in plaintext during setup
- [ ] **M.04** Create real client editor accounts + send login instructions

## Bucket P — Publishing

- [ ] **P.01** Production hardening (prod env/secrets, RLS verified in prod, error handling, monitoring)
- [ ] **P.02** Point the subdomain at production; verify SSL + auth on the real domain
- [ ] **P.03** Client handover — ship the one-page "how to log in and write a post" guide; brief first clients

## Definition of "v1 launched"

- [ ] A client logs in and sees only their own posts
- [ ] Create / edit / delete / draft / publish work for title, body, summary, image
- [ ] Publishing refreshes the client's live site within minutes
- [ ] Verified: client A cannot see or modify client B's content
- [ ] Verified: no Sanity write token reaches the browser
- [ ] Works for Vertex, Sunset Services, and Dalibor via per-client config
