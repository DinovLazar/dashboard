-- ============================================================================
-- B.03 — Registry data model: clients, client_users, client_secrets
--
-- The portal's secure "address book": which client each login belongs to, plus
-- each client's Sanity config and its ENCRYPTED Sanity token. Three tables,
-- locked down with Row-Level Security so a signed-in user can read only their
-- own mapping + config, and CANNOT read any token.
--
-- Run this once on the portal's Supabase project (Dashboard → SQL Editor → Run,
-- or via the Supabase CLI). It is safe to re-run: tables use IF NOT EXISTS and
-- policies are dropped-then-created. See docs/runbooks/registry-apply.md.
--
-- Security boundary (AGENTS.md, dashboard-Project-Instructions.md §5):
--   * Tokens are encrypted at the app layer (AES-256-GCM) BEFORE they reach the
--     database — only base64 ciphertext/iv/auth_tag are stored here. The 32-byte
--     key lives only in the server env var SANITY_TOKEN_ENC_KEY, never in the DB.
--   * client_secrets is unreadable by anon/authenticated: RLS on + NO policy +
--     table privileges revoked. Only the server-side service-role client (which
--     bypasses RLS) can read or write it.
--   * No INSERT/UPDATE/DELETE policies for anon/authenticated on any table: every
--     write goes through the service-role client or the Supabase dashboard.
--
-- gen_random_uuid() is built into Postgres 13+ (no extension needed on Supabase).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- clients — one row per client site (the per-client config; §6 of the project
-- instructions). The Sanity Editor token is NOT here — it lives encrypted in
-- client_secrets.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- client_users — maps one Supabase auth user to exactly one client.
-- user_id is the PRIMARY KEY, which enforces the v1 invariant: one client per
-- user. (Multi-client operators are a future enhancement.)
-- ----------------------------------------------------------------------------
create table if not exists public.client_users (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  client_id  uuid        not null     references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.client_users is
  'Maps one auth user -> one client. user_id is the PK (one client per user, v1). Each user can SELECT only their own row via RLS.';

-- Index the FK so the clients RLS sub-query and cascade deletes stay fast.
create index if not exists client_users_client_id_idx
  on public.client_users (client_id);

-- ----------------------------------------------------------------------------
-- client_secrets — the encrypted per-client Sanity Editor token.
-- The three crypto parts are stored as base64 text (AES-256-GCM).
-- DENY-ALL to browser sessions: RLS on + no policy + privileges revoked.
-- ----------------------------------------------------------------------------
create table if not exists public.client_secrets (
  client_id        uuid        primary key references public.clients(id) on delete cascade,
  token_ciphertext text        not null,
  token_iv         text        not null,
  token_auth_tag   text        not null,
  created_at       timestamptz not null default now()
);

comment on table public.client_secrets is
  'Encrypted per-client Sanity token (AES-256-GCM; base64 ciphertext/iv/auth_tag). NEVER readable by anon/authenticated (RLS on, no policy, privileges revoked). Decryption needs the separate app key SANITY_TOKEN_ENC_KEY, which is not in the database. Service-role only.';

-- ----------------------------------------------------------------------------
-- Row-Level Security — enable on all three tables.
-- ----------------------------------------------------------------------------
alter table public.clients        enable row level security;
alter table public.client_users   enable row level security;
alter table public.client_secrets enable row level security;

-- client_users: a user may SELECT only their own mapping row.
-- (auth.uid() is wrapped in a sub-select so Postgres evaluates it once per
-- query, not once per row — Supabase's recommended RLS pattern.)
drop policy if exists "client_users_select_own" on public.client_users;
create policy "client_users_select_own"
  on public.client_users
  for select
  to authenticated
  using ( user_id = (select auth.uid()) );

-- clients: a user may SELECT only the client(s) they are mapped to.
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

-- client_secrets: NO policy at all => with RLS enabled, every row is denied to
-- anon and authenticated. Belt-and-suspenders — also strip table privileges so
-- the tokens are doubly unreachable even if a policy were ever added by mistake.
-- (service_role is intentionally NOT revoked: it bypasses RLS and is the only
-- path that reads/writes these tokens.)
revoke all on public.client_secrets from anon, authenticated;
