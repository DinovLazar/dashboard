# Registry: apply the schema & verify (B.03)

This runbook sets up the portal's secure "address book" in Supabase: the three
tables that record which client each login belongs to, plus each client's
**encrypted** Sanity token. You (Lazar) run these steps once against the portal's
Supabase project. No coding needed — copy, paste, click, and run two commands.

**You will:**

1. Apply the database schema (paste SQL into Supabase, click Run).
2. Make sure a confirmed **test user** exists.
3. Fill in `.env.local` with four values.
4. Run the **seed** command (creates one throwaway test client).
5. Run the **verify** command (proves it all works and is isolated).

Nothing here uses a real client or a real token — only throwaway test values.

---

## Step 1 — Apply the schema

1. Open your portal Supabase project → **SQL Editor** → **New query**.
2. Paste the **entire** SQL block below and click **Run**. You should see
   "Success. No rows returned." It is safe to run more than once.

> This SQL is identical to the committed migration at
> `supabase/migrations/20260627120000_registry.sql`. If you use the Supabase CLI
> instead, `supabase db push` applies the same file.

```sql
-- ============================================================================
-- B.03 — Registry data model: clients, client_users, client_secrets
-- (identical to supabase/migrations/20260627120000_registry.sql)
-- ============================================================================

create table if not exists public.clients (
  id                uuid        primary key default gen_random_uuid(),
  label             text        not null,
  sanity_project_id text        not null,
  dataset           text        not null,
  blog_doc_type     text        not null,
  field_map         jsonb       not null,
  locales           text[]      not null,
  revalidate_url    text,
  created_at        timestamptz not null default now()
);

comment on table public.clients is
  'Per-client blog config (one row per client site). Readable only by that client''s own mapped user via RLS; all writes go through the service-role client.';

create table if not exists public.client_users (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  client_id  uuid        not null     references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.client_users is
  'Maps one auth user -> one client. user_id is the PK (one client per user, v1). Each user can SELECT only their own row via RLS.';

create index if not exists client_users_client_id_idx
  on public.client_users (client_id);

create table if not exists public.client_secrets (
  client_id        uuid        primary key references public.clients(id) on delete cascade,
  token_ciphertext text        not null,
  token_iv         text        not null,
  token_auth_tag   text        not null,
  created_at       timestamptz not null default now()
);

comment on table public.client_secrets is
  'Encrypted per-client Sanity token (AES-256-GCM; base64 ciphertext/iv/auth_tag). NEVER readable by anon/authenticated (RLS on, no policy, privileges revoked). Decryption needs the separate app key SANITY_TOKEN_ENC_KEY, which is not in the database. Service-role only.';

alter table public.clients        enable row level security;
alter table public.client_users   enable row level security;
alter table public.client_secrets enable row level security;

drop policy if exists "client_users_select_own" on public.client_users;
create policy "client_users_select_own"
  on public.client_users
  for select
  to authenticated
  using ( user_id = (select auth.uid()) );

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients
  for select
  to authenticated
  using (
    id in (
      select cu.client_id
      from public.client_users cu
      where cu.user_id = (select auth.uid())
    )
  );

revoke all on public.client_secrets from anon, authenticated;
```

3. (Optional sanity check) In **Table Editor**, confirm `clients`,
   `client_users`, and `client_secrets` now exist, each showing the green
   **RLS enabled** shield.

---

## Step 2 — Make sure a confirmed test user exists

This is the same test user from B.02. If you already have one, skip this.

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter an email and password you'll remember.
3. Turn **Auto Confirm User** ON (so the account is usable immediately).
4. Click the new user and copy its **UID** (a UUID). You'll need it in Step 4.

---

## Step 3 — Fill in `.env.local`

In the project, copy `.env.local.example` to `.env.local` (if you haven't) and
fill in these values. `.env.local` is never committed.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key (secret) |
| `SANITY_TOKEN_ENC_KEY` | Generate once in a terminal: `openssl rand -base64 32` |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | The test user's login from Step 2 |

> Set the SAME `SUPABASE_SERVICE_ROLE_KEY` and `SANITY_TOKEN_ENC_KEY` in the
> Vercel project (Preview + Production) later — they are server-only secrets and
> must never be `NEXT_PUBLIC_*`, logged, or committed. Keep `SANITY_TOKEN_ENC_KEY`
> safe: if you lose it, stored tokens can't be decrypted.

---

## Step 4 — Seed the throwaway test client

In the project folder, run (replace the UUID with your test user's UID from
Step 2):

```bash
npm run seed:test-client -- <TEST_USER_UUID>
```

Expected output (the client id will differ):

```
• Created client 7c9e... ("TEST — throwaway").
• Stored the encrypted dummy token (ciphertext not shown).
• Mapped user <uuid> -> client 7c9e....

✅  Seed complete. Now run:  npm run verify:registry
```

Re-running is safe — it updates the same test client instead of creating a
second one.

---

## Step 5 — Verify

```bash
npm run verify:registry
```

Expected output:

```
Signed in as test user <uuid> (<email>).

As the signed-in user (RLS applies):
  [PASS] clients returns exactly one row — got 1 ("TEST — throwaway")
  [PASS] client_users returns exactly one row (own mapping) — got 1
  [PASS] client_secrets returns zero rows (token unreachable by the user) — blocked: ...

As the service-role client (bypasses RLS):
  [PASS] seeded secret decrypts to the original dummy token — match

✅  ALL CHECKS PASSED — the test user resolves to exactly one client config and cannot read any token.
```

If every line says **PASS**, B.03 is verified: the signed-in user resolves to
exactly one client and **cannot** read any token, while the server (service-role)
can decrypt it. Paste this output to whoever is closing the phase.

---

## Troubleshooting

- **"Could not sign in as the test user"** — the user isn't confirmed, or the
  email/password in `.env.local` is wrong. Re-check Step 2 (Auto Confirm ON) and
  Step 3.
- **"Missing SUPABASE_SERVICE_ROLE_KEY / SANITY_TOKEN_ENC_KEY"** — a value is
  blank in `.env.local`. Re-check Step 3.
- **`clients returns ... got 0`** — the seed didn't run, or it used a different
  user UUID than the one you're signing in as. Re-run Step 4 with the correct UID.
- **`seeded secret decrypts ... mismatch`** — `SANITY_TOKEN_ENC_KEY` changed
  between seeding and verifying. Use the same key for both; if you rotated it,
  re-run the seed.
- **A policy error on Step 1** — you likely ran only part of the SQL. Paste the
  whole block and Run again (it's safe to re-run).

---

*dashboard | Registry apply & verify | B.03 | 2026-06-27*
