# Dashboard — Plan & Specification (v1)

The Vertex Consulting client blog portal. This document is the locked specification; the build sequence lives in `dashboard-Phase-Plan.md`, and the orientation/why lives in `dashboard-Project-Instructions.md`.

## Table of contents

1. Goals and success criteria
2. About the product and its users
3. Architecture and data model
4. Tech stack (locked)
5. File and folder structure
6. The editor (essentials-only) specification
7. Per-client configuration
8. Integrations and what each one does
9. Security model
10. Acceptance criteria — what "v1 launched" means
11. Pre-build inputs and parallel-track tasks

---

## 1. Goals and success criteria

**Goal.** A Vertex client logs in to a Vertex-branded portal and independently manages their own blog — headline, body, summary, image, draft/publish — without Vertex doing it for them and without touching Sanity directly.

**Success criteria (all required for v1):**
- A client sees and edits **only their own** posts.
- Create / edit / delete / save-as-draft / publish all work for the essential fields.
- Publishing refreshes the client's **live website** within minutes.
- Cross-tenant isolation is proven by an automated test.
- No Sanity write token ever reaches the browser.
- Works across the first three real clients despite differing blog schemas.

---

## 2. About the product and its users

**Vertex Consulting** is a web agency: it builds and markets client websites, each with a Sanity-backed blog in its **own** Sanity project. **Lazar** (Head of Marketing) is the operator; he has no coding background and works step-by-step.

**Two kinds of user:**
- **Client editors** — non-technical people at each client business who want to publish blog posts on their own site. They are the primary users. They never see Sanity, tokens, or another client's content.
- **Vertex operators** — Lazar / the Vertex team, who provision client accounts, onboard new client sites, and can manage content on a client's behalf.

**Scale:** 5–15 client sites at launch, growing.

---

## 3. Architecture and data model

A standalone Next.js app on its own subdomain. The browser holds only a Supabase session; every read and write of blog content goes through a **server route** that authenticates the session, resolves the user to their client (and that client's Sanity project + Editor token), and acts only on that client's project. On publish, the server pings the client site's own revalidation endpoint so the client's live site refreshes. (See the diagram in `dashboard-Project-Instructions.md` §3.)

**Tenant isolation is at the data layer:** each client's blog lives in a *different* Sanity project, so there is no shared dataset to leak across. The portal's job is to never hand a user the wrong project's token.

**Supabase data model (initial):**
- `clients` — one row per client site: label, `sanity_project_id`, `dataset`, `blog_doc_type`, `field_map` (JSON), `locales`, `revalidate_url`. The Sanity Editor token is stored **encrypted** (or referenced to a secret store), never in plaintext readable by the browser.
- `client_users` — maps a Supabase auth user to a client (the membership/ownership record that authorizes every request).
- Row-Level Security on both so a user can only ever read their own mapping.

---

## 4. Tech stack (locked)

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind v4** · **shadcn/ui** — brand tokens copied from the Vertex marketing site
- **Supabase** — auth + registry + encrypted token store (+ RLS)
- **Sanity** (`@sanity/client` / `next-sanity`) — a **per-tenant server-side write client** created at request time
- **Resend** (optional) — operator notifications, not core
- **Vercel** hosting at the portal subdomain
- Repo bootstrapped to the usual Vertex standard (protected `main`; `docs/ briefs/ reports/ status/`; CodeRabbit + Codex review)

Exact versions and config files: `_project-state/00_stack-and-config.md`.

---

## 5. File and folder structure

Indicative target shape (filled in as the build progresses; the live map is `_project-state/file-map.md`):

```
src/
  app/
    (auth)/login/            login screen (Supabase)
    (portal)/                authenticated portal shell (branded)
      posts/                 list of THIS client's posts
      posts/new/             create
      posts/[id]/            edit / delete / draft / publish
    api/
      posts/                 server route handlers: list/create/update/delete (per-tenant)
      publish/               publish → write + trigger client revalidate
      upload/                server-side image upload to the client's Sanity dataset
  lib/
    supabase/                server + browser clients, session helpers
    sanity/                  per-tenant write-client factory (server-only)
    registry/                resolve user → client config + token (server-only)
    config/                  field-map / locale helpers
  components/
    ui/                      shadcn primitives
    editor/                  the post editor (config-driven fields)
    portal/                  shell, nav, branding
```

---

## 6. The editor (essentials-only) specification

A single, branded editor that works across clients by reading the per-client config:

- **Post list** — the logged-in client's posts only, with status (draft/published), title, last-updated; create button.
- **Create / edit form** fields: **headline** (title), **body** (rich text / portable text), **summary** (excerpt), **featured image** (upload), and **status** (save as draft / publish).
- **Delete** with a confirm step.
- **Localized fields** when the client's config says the blog is multi-language (e.g. EN + MK, or EN + ES) — the form shows the relevant language tabs; otherwise single-language.
- Anything site-specific (e.g. Sunset's categories, FAQs, cross-links) is **out of scope** for the portal editor and stays editable in that client's own Sanity.

---

## 7. Per-client configuration

Onboarding a client is data, not code. Each client's config (stored in `clients`): `sanity_project_id`, `dataset`, `blog_doc_type`, `field_map { title, body, excerpt, image, status, slug }`, `locales`, `revalidate_url`, plus the Editor token (server-side). The editor renders from this, so a new client never requires editor code changes — only a new row + token. (Full shape in `dashboard-Project-Instructions.md` §6.)

---

## 8. Integrations and what each one does

### Auth & data
- **Supabase Auth** — client login/logout, sessions, protected routes. No public signup; Vertex creates accounts.
- **Supabase Postgres** — the `clients` + `client_users` registry, encrypted tokens, RLS.

### Content
- **Sanity (per client)** — a server-side write client built from the requesting user's client config + token. Reads (list posts) and writes (create/edit/delete/publish/image upload) for exactly that client's project.

### Live-site refresh
- **Per-client revalidation** — on publish, the portal calls the client site's own revalidate endpoint (each client site already has one, e.g. Sunset's) so the client's live website updates within minutes.

### Optional
- **Resend** — notify the operator of activity; not required for v1.

---

## 9. Security model

Summarized here, authoritative in `dashboard-Project-Instructions.md` §5 and `AGENTS.md`:

1. Per-client tokens are **server-only secrets** — never `NEXT_PUBLIC_*`, never in the bundle, logs, or commits.
2. **Authenticate then authorize on every mutation**, server-side; the user's record picks the one client/token they may touch; no client-supplied project id or token is trusted.
3. **Least-privilege** Editor tokens, one per client project.
4. Cross-tenant isolation is an **automated, tested invariant** before the editor ships.
5. **RLS** on registry tables.

---

## 10. Acceptance criteria — what "v1 launched" means

- Client logs in → sees only their posts.
- Create / edit / delete / draft / publish work for title, body, summary, image.
- Publish refreshes the client's live site within minutes.
- Verified: client A cannot see or modify client B's content.
- Verified: no write token is exposed to the browser.
- Works for Vertex, Sunset Services, and Dalibor via per-client config.

---

## 11. Pre-build inputs and parallel-track tasks

**Inputs needed (tracked in `dashboard-Notion-Checklist.md`):**
- Dalibor repo URL (or its `sanity.config.ts` + blog schema).
- A Supabase project for the portal.
- One Sanity **Editor** token per client project (generated during Make-it-work).
- The portal subdomain + DNS.
- Client user emails for account creation.

**Parallel-track (can run alongside building):** copying Vertex brand tokens into the portal; drafting the one-page "how to write a post" guide for clients; confirming each client's `revalidate_url`.

---

## What's next

Build sequence and phase-by-phase detail: `dashboard-Phase-Plan.md`.
