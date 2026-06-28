# Part B · Phase 03 · Code — Registry data model (clients, mappings, encrypted tokens) — Completion Report

**Date:** 2026-06-27 · **Outcome (one line):** The portal now has its secure "address book" — three RLS-protected Supabase tables that map each login to exactly one client and store that client's Sanity token **encrypted** (AES-256-GCM) so no browser session can ever read it — plus the server-side crypto module, the service-role client, and operator seed/verify tooling.

- **Branch / PR:** `b03-registry` → [PR #3](https://github.com/DinovLazar/dashboard/pull/3), **base `b02-supabase-auth`** (stacked — B.02 isn't merged to `main` yet; see §7 for the merge-order note).
- **Live status:** code-complete and **locally verified** (crypto unit tests, build, and a real-Postgres RLS isolation simulation all pass). Applying the schema to the real Supabase and running the end-to-end verify is an **operator step** (runbook provided) — the agent has no access to the real project.

---

## 1. What shipped (plain language)

The portal can now remember **which client each login belongs to**, and it keeps each client's Sanity key under lock and key. Three new tables in Supabase do this: one lists each client's blog settings, one maps a user to their one client, and one holds that client's secret key **encrypted** — scrambled with a master key that lives only on the server, never in the database. The database is set up so that when a client logs in, they can see only their own settings and **cannot read any key at all** — not even their own. Only the server (using a privileged key) can unlock a token, and that only happens in the next phase. Nothing here touches a real client or a real key yet — it's all proven with a throwaway test client and a fake token. A short runbook tells you (Lazar) exactly what to click and run to switch it on against the real Supabase.

## 2. Definition of Done

- ✅ **Three tables with exactly the specified columns; migration committed under `supabase/migrations/`** — `supabase/migrations/20260627120000_registry.sql` defines `clients`, `client_users`, `client_secrets` with the exact columns/types/constraints from the brief. Verified to apply cleanly (see the pglite run in §2's isolation evidence below).
- ✅ **RLS enabled on all three; policies match the spec; `client_secrets` unreadable by `anon`/`authenticated` (verified, not assumed)** — RLS enabled on all three; `client_users`/`clients` have SELECT-only policies scoped to the user; `client_secrets` has **no** policy + `revoke all ... from anon, authenticated`. Proven by running the actual migration against an in-process Postgres (pglite) under a faithful simulation of Supabase roles + `auth.uid()`:

  ```
  As authenticated USER A:
    [PASS] clients: sees exactly 1 row — got 1
    [PASS] clients: that row is Client A (own), NOT Client B — Client A
    [PASS] client_users: sees exactly 1 row (own mapping) — got 1
    [PASS] client_users: own mapping only
    [PASS] client_secrets: unreachable (0 rows / permission denied) — blocked: permission denied for table client_secrets
  As authenticated USER B:
    [PASS] clients: sees only Client B (cross-tenant isolation holds) — Client B
  As anon (no session):
    [PASS] clients: 0 rows
    [PASS] client_users: 0 rows
    [PASS] client_secrets: unreachable — blocked: permission denied for table client_secrets
  As service_role (server-side):
    [PASS] client_secrets: readable by service_role (2 rows) — rows: 2
  ✅  RLS SIMULATION: ALL CHECKS PASSED.
  ```

- ✅ **`client_users.user_id` is the primary key (one client per user)** — `user_id uuid primary key references auth.users(id) on delete cascade`.
- ✅ **`src/lib/crypto/tokens.ts` is server-only AES-256-GCM `encryptToken`/`decryptToken`; unit tests pass (round-trip, tamper-throws, wrong-key-throws, unique-IV)** — `import 'server-only'`; 12-byte random IV per call; 32-byte key from `SANITY_TOKEN_ENC_KEY`. `npm test` output:

  ```
   Test Files  1 passed (1)
        Tests  10 passed (10)
  ```
  The 10 tests cover round-trip, base64 shape + no-plaintext-leak, unique IV/ciphertext, ciphertext-tamper-throws, auth-tag-tamper-throws, wrong-key-throws, missing-key-throws, wrong-length-key-throws, empty-plaintext-rejected, incomplete-input-rejected.
- ✅ **`src/lib/supabase/admin.ts` is a server-only service-role client, imported by no client component** — `import 'server-only'`; `persistSession:false`, `autoRefreshToken:false`; grep confirms no `'use client'` file imports `admin.ts` or `tokens.ts`.
- ✅ **Throwaway test client + encrypted dummy token + mapping seeded via `scripts/seed-test-client.ts`; no real secret anywhere** — the seed inserts the `TEST — throwaway` client, encrypts the literal `DUMMY-NOT-A-REAL-TOKEN`, and upserts the mapping; idempotent. No real secret exists in the repo (grep-verified).
- ⚠️ **"Done when" — signed in as the test user, `clients`=1, `client_users`=1, `client_secrets`=0; verify-registry PASS pasted here** — the script (`scripts/verify-registry.ts`) is complete and its logic is proven by the pglite simulation above (same assertions, same RLS). The **real-Supabase** PASS is **operator-pending**: the agent cannot reach the real project. The operator runs `npm run verify:registry` per `docs/runbooks/registry-apply.md` and pastes the output here. Expected output is shown in the runbook (§Step 5).
- ⚠️ **As service-role, the seeded `client_secrets` row decrypts back to the dummy token** — proven in two places locally: the crypto round-trip unit test, and the pglite sim's service_role read. The real-Supabase decrypt check is part of the same operator `verify:registry` run (also pending).
- ✅ **`.env.local.example` documents the two new vars (names only); `npm run build` passes; no secret values / no `NEXT_PUBLIC_*` secret** — `.env.local.example` documents `SUPABASE_SERVICE_ROLE_KEY` + `SANITY_TOKEN_ENC_KEY` (placeholders only). `npm run build` passes (TypeScript clean; 5 routes; `ƒ` for `/login` and `/posts`). `npm run lint` clean. No secret in the tree or history.
- ✅ **`docs/runbooks/registry-apply.md` exists and reproduces the verification** — step-by-step: paste SQL → confirm test user → fill `.env.local` → seed → verify, with the expected PASS output.
- ✅ **`current-state.md`, `file-map.md`, `00_stack-and-config.md` updated** — all three updated to end-of-B.03. ⚠️ **Landed via PR** — [PR #3](https://github.com/DinovLazar/dashboard/pull/3) opened (stacked on `b02-supabase-auth`); merge to `main` is gated on the B.02 branching decision (§7).

## 3. Decisions I made during this phase

Recorded in full in `dashboard-Decisions.md` (2026-06-27 — the token-encryption locked decision + "B.03 implementation choices"). Summary:

1. **First wrote the locked 2026-06-27 token-encryption decision into the log** — it had been decided in planning (AES-256-GCM at the app layer, key outside the DB, stronger than Supabase Vault) but was never recorded. → logged.
2. **RLS uses `(select auth.uid())`** (Supabase-recommended initplan form; identical logic to the spec, avoids the advisor warning). → logged.
3. **Migration hardened** with `if not exists` / `drop policy if exists` / table comments / a `client_users(client_id)` index — re-runnable and fast, same shape as spec. → logged.
4. **`server-only` is a production dep**; **encryption uses Node `node:crypto`**, no third-party lib. → logged.
5. **Vitest + tsx added (pinned)**; **`server-only` aliased to a no-op stub for Vitest/tsx** (the real package throws outside the Next bundler; `--conditions=react-server` was tried and does NOT work under tsx). The real bundle keeps the genuine guard. → logged.
6. **Scripts load `.env.local` via Node's built-in `process.loadEnvFile`** (no `dotenv` dep); **seed is idempotent**; **verify treats permission-denied as 0-rows-readable**. → logged.
7. **Local isolation proof via pglite** (throwaway, not committed) since no Docker/Supabase CLI was available. → logged.

## 4. Deviations from the brief / spec

- **The live `verify-registry.ts` PASS is not pasted from the real Supabase** — only from the faithful local pglite simulation + the crypto unit tests. The real run needs the operator's Supabase project (the agent has none), exactly as B.02's successful round-trip was left to the operator. The script and runbook are complete; the operator produces the final PASS line.
- **Additions beyond the literal spec** (the `(select auth.uid())` form, migration idempotency guards, the FK index, table comments, the `server-only` stub plumbing, the shared `test-fixtures.ts`) — all improvements that keep the spec's shape; documented in §3 / Decisions.
- Nothing in the brief was skipped.

## 5. Changed files / deliverables

- **Crypto:** `src/lib/crypto/tokens.ts`, `src/lib/crypto/tokens.test.ts`.
- **Supabase:** `src/lib/supabase/admin.ts` (service-role client); `supabase/migrations/20260627120000_registry.sql` (schema + RLS).
- **Scripts:** `scripts/seed-test-client.ts`, `scripts/verify-registry.ts`, `scripts/test-fixtures.ts`, `scripts/tsconfig.json`.
- **Test infra:** `vitest.config.ts`, `test/setup/server-guard-stub.ts`.
- **Docs / env:** `docs/runbooks/registry-apply.md`; `.env.local.example` (two server-only vars + verify-only test creds, names/placeholders only).
- **Config:** `package.json` (+`test`/`test:watch`/`seed:test-client`/`verify:registry` scripts; +`vitest`/`tsx` dev deps; +`server-only` prod dep), `package-lock.json`.
- **State:** `current-state.md`, `file-map.md`, `00_stack-and-config.md`, `dashboard-Decisions.md`, this report.
- **Secrets:** none created or committed. The seeded token is the literal `DUMMY-NOT-A-REAL-TOKEN`; the two AES keys in `tokens.test.ts` are throwaway test keys protecting nothing. `SUPABASE_SERVICE_ROLE_KEY` and `SANITY_TOKEN_ENC_KEY` are set by the operator in `.env.local` / Vercel only — never in the repo.

## 6. State updates done

`current-state.md` (rewritten to end-of-B.03), `file-map.md` (B.03 files: crypto, admin client, migration, scripts, test infra, runbook), `00_stack-and-config.md` (server-only/vitest/tsx pins, the two env vars, the three-table data model + RLS, AES-256-GCM), `dashboard-Decisions.md` (two 2026-06-27 entries). All match reality.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary status:** B.03 establishes the storage side of the boundary — tokens encrypted at rest + an RLS-locked, deny-all secrets table that only the service-role client can read. The **authorize-on-every-mutation / ownership check** and the **formal automated cross-tenant isolation test** are **B.04's** responsibility (the read path is where a user first resolves to a token). B.03's isolation was proven locally (pglite) but the committed automated test arrives in B.04.
- **B.02 PR (#2) is still open — not merged to `main`.** `main` is at B.01; B.02 and now B.03 stack on top. The operator must decide whether to merge B.02 first (then B.03 → `main`) or stack the B.03 PR on `b02-supabase-auth`. This affects the B.03 PR's base and merge order.
- **Operator must apply B.03 to make it live** (`docs/runbooks/registry-apply.md`): run the schema SQL, confirm the test user, fill four `.env.local` values, then `npm run seed:test-client -- <uuid>` and `npm run verify:registry`. Paste the PASS output back into §2 of this report. Also set `SUPABASE_SERVICE_ROLE_KEY` + `SANITY_TOKEN_ENC_KEY` in Vercel (server-only).
- **Keep `SANITY_TOKEN_ENC_KEY` safe and consistent.** Lose it and stored tokens can't be decrypted; change it between seed and verify and the decrypt check fails. **Key rotation** is a later phase.
- **Pre-existing `npm audit` advisories on `next@16.2.3`** (+ transitive `postcss`) are not from B.03; a `next` 16.2.x bump belongs in a small maintenance PR.
- **AI review:** CodeRabbit/Codex are still not connected (owner one-time step). In their place, B.03 was checked by an independent security reviewer (RLS, crypto, secret handling, idempotency — all clean) plus the pglite isolation proof, crypto unit tests, a secret-leakage grep sweep, and green build/lint. Strongly recommend connecting CodeRabbit before B.04's decrypt-and-use path lands.

## 8. What's now possible that wasn't before

B.04 can now resolve a logged-in user to their one client config + Editor token entirely server-side, decrypt the token with the existing `decryptToken`, and build a per-tenant Sanity client — with the registry already proven to hand each user only their own row and no token at all.
