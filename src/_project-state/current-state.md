# Dashboard — Current State

> The full project snapshot. **Read this first every session.** Factual, not aspirational — it records what IS.
> Last updated: **2026-06-27** (end of Phase **B.03**).

## One-line status

The portal now has its **secure address book**: three Supabase tables (`clients`, `client_users`, `client_secrets`) with Row-Level Security so a signed-in user can read only their own client + config and **cannot read any token**, plus app-layer **AES-256-GCM** encryption for per-client Sanity tokens (the key lives only in a server env var, never in the DB). The schema, the crypto module, the service-role client, the seed/verify scripts, and an operator runbook are all in place and locally verified. Still **no Sanity, no editor** — the read path + isolation test is B.04. No public signup (by design).

## Links

- **GitHub:** https://github.com/DinovLazar/dashboard (public, `main` protected)
- **Vercel preview:** https://dashboard-six-iota-33.vercel.app (renders the branded shell; `/` → `/login`)
- **Vercel project:** `dinovlazars-projects/dashboard`

## What is live

**From B.01 (foundation + look):** public protected repo to the Vertex standard; Next 16 + React 19 + TS + Tailwind v4 + shadcn (`base-nova`) app that builds clean and deploys to Vercel; Vertex brand applied (dark-only); `src/_project-state/` as the docs home.

**From B.02 (Supabase auth — the locked door):** server-side Supabase auth (`@supabase/ssr` + `@supabase/supabase-js`); `src/proxy.ts` session refresh + redirect; functional `/login` (email + password Server Action, no signup, generic error); `(portal)` gated by a `getClaims()` server check; sign-out; no-cache hardening.

**New in B.03 (registry data model — the secure address book):**
- **Three Supabase tables**, defined in `supabase/migrations/20260627120000_registry.sql`:
  - `clients` — per-client config (`label`, `sanity_project_id`, `dataset`, `blog_doc_type`, `field_map` jsonb, `locales` text[], `revalidate_url`).
  - `client_users` — `user_id` (**primary key** → one client per user) → `client_id`.
  - `client_secrets` — the encrypted token: base64 `token_ciphertext` / `token_iv` / `token_auth_tag`.
- **Row-Level Security on all three.** A signed-in user can `SELECT` only their own mapping (`client_users`) and only the client(s) they're mapped to (`clients`). `client_secrets` is **deny-all to browser sessions**: RLS on + no policy + `revoke all ... from anon, authenticated`. Only the service-role client (which bypasses RLS) can read it. No insert/update/delete policies for users — all writes go through the service-role client.
- **App-layer token encryption** (`src/lib/crypto/tokens.ts`, `server-only`): AES-256-GCM `encryptToken` / `decryptToken`, fresh 12-byte IV per encryption, 32-byte key from `SANITY_TOKEN_ENC_KEY` (never in the DB). Tampering or a wrong key throws (GCM auth). 10 passing unit tests.
- **Service-role client** (`src/lib/supabase/admin.ts`, `server-only`): created with `SUPABASE_SERVICE_ROLE_KEY`, `persistSession:false`, `autoRefreshToken:false`; the only thing that can read `client_secrets`; never imported by a client component (the `server-only` guard enforces this at build time).
- **Operator tooling:** `scripts/seed-test-client.ts` (seed one throwaway test client + encrypted **dummy** token + mapping; idempotent), `scripts/verify-registry.ts` (sign in as the test user and assert the isolation invariant + service-role decrypt), and `docs/runbooks/registry-apply.md` (copy-paste SQL, test-user click-path, exact commands).

## What is NOT built yet (by design)

- **No Sanity read/write path, no resolver, no editor.** The user→config **resolver** (with the authorize/ownership check), the per-tenant Sanity client, and the **read path** (+ the cross-tenant isolation **test**) are **B.04**; the editor is **B.05+**. Decrypting and *using* tokens is wired in B.04 — B.03 only stores them sealed.
- **No real client or real token.** B.03 uses only throwaway test values; real clients + least-privilege Editor tokens are onboarded in **M.01**.
- **No multi-client operators.** v1 is one user → one client (enforced by the `client_users.user_id` primary key).
- **No password reset, key rotation, or rate limiting** — later phases.
- **No public signup, ever.** No custom subdomain/DNS yet (→ Bucket P). No portal-chrome i18n.

## Security posture (B.03)

- **No secrets in the repo or its history.** The two new vars (`SUPABASE_SERVICE_ROLE_KEY`, `SANITY_TOKEN_ENC_KEY`) are **server-only**, documented by name only in `.env.local.example`, never `NEXT_PUBLIC_*`, never logged. The seeded token is a literal dummy (`DUMMY-NOT-A-REAL-TOKEN`); the two AES keys in the crypto test are throwaway test keys that protect nothing. Verified by grep: no service-role/enc key reference outside server files; `admin.ts`/`tokens.ts` are imported by no `'use client'` file.
- **Defense-in-depth on tokens:** encrypted at the app layer **before** the DB sees them, and the ciphertext table is itself unreadable by users. A DB dump or a service-role-key leak **alone** cannot reveal a token without the separate `SANITY_TOKEN_ENC_KEY`.
- **Isolation proven, not assumed (locally):** the actual migration was run against an in-process Postgres (pglite) under a faithful simulation of Supabase roles + `auth.uid()`; an authenticated user A sees only their own client/mapping and **cannot** read `client_secrets` (permission denied), while a second user B sees only theirs and `service_role` can read the secrets. The committed, operator-run proof is `verify-registry.ts` against the real Supabase (see Risks). The *formal* automated cross-tenant test on the read path lands in **B.04**.

## Stack (see `00_stack-and-config.md` for exact pins)

Next 16.2.3 · React 19.2.4 · TS ^5 · Tailwind v4 · shadcn `base-nova` · **@supabase/ssr 0.12.0 + @supabase/supabase-js 2.108.2** · **server-only 0.0.1** · token encryption via Node `node:crypto` (AES-256-GCM). Dev: **vitest 4.1.9**, **tsx 4.22.4**. Hosted on Vercel.

## Routes

Unchanged from B.02: `/` → `/login`; `/login` functional; `/posts` gated placeholder; `(portal)` layout gate; `proxy.ts` session refresh. (B.03 added no routes — it is data + server modules only.)

## Risks & follow-ups

- **B.02 PR is still open (#2), not merged to `main`.** `main` is at B.01; B.02 lives on `b02-supabase-auth`. B.03 builds on top of B.02, so the B.03 PR's base/merge order depends on whether B.02 merges to `main` first (operator decision — see the B.03 completion report).
- **Operator must apply B.03 to the real Supabase to make it live.** The agent cannot reach the real project. Follow `docs/runbooks/registry-apply.md`: run the schema SQL, confirm the test user, fill the 4 env values in `.env.local`, then `npm run seed:test-client -- <uuid>` and `npm run verify:registry`. Paste the PASS output into the completion report. (Set `SUPABASE_SERVICE_ROLE_KEY` + `SANITY_TOKEN_ENC_KEY` in Vercel too, server-only.)
- **What was verified locally vs. pending:** crypto unit tests pass; `npm run build`/`lint` clean; the migration + RLS isolation pass against a local pglite simulation of Supabase. **Pending the operator:** the end-to-end `verify-registry.ts` PASS against the real Supabase (its wiring mirrors the simulation exactly).
- **Pre-existing `npm audit` advisories on `next@16.2.3`** (+ a transitive `postcss`) — not introduced by B.03; a `next` bump is out of scope here. Consider bumping `next` within 16.2.x in a dedicated maintenance PR.
- **Owner one-time setup (not a blocker):** install CodeRabbit + connect Codex (`docs/runbooks/ai-review-setup.md`); connect Vercel↔GitHub. **Strongly consider requiring a green review check on `main` before B.04** (the read path will decrypt and use real-shaped tokens).

## Next phase

**B.04 — Secure per-tenant Sanity bridge (read first):** the server-only module that resolves the logged-in user → their client config + Editor token (with the **authorize/ownership check**), the per-tenant Sanity client factory, and the **read path** (list that client's posts) — plus the **automated cross-tenant isolation test** proving user A cannot read client B's posts. *Done when:* the post list shows only the logged-in client's posts and the isolation test passes. See `dashboard-Phase-Plan.md`.
