# Dashboard — Project Instructions

> The orientation doc. Read this first, then `dashboard-Plan.md`, then `dashboard-Phase-Plan.md`.
> Project codename: **Dashboard**. Full name: the **Vertex Consulting client blog portal**.

---

## 0. What this is, in one paragraph

Vertex Consulting builds and markets websites for clients. Every client site has a blog, and every blog is stored in **Sanity** — each client in their **own separate Sanity project**. Today, editing a client's blog means going into Sanity directly. Dashboard replaces that with a clean, **Vertex-branded portal** at its own subdomain where a client logs in and manages the blog on *their* website — write, edit, delete, save-as-draft, publish — without ever seeing Sanity or any secret keys. One portal, many clients, each client seeing and touching only their own posts.

---

## 1. Goals & success criteria

**Goal:** a client can log in to a Vertex-branded portal and independently manage their own blog (the essentials: headline, body, summary, image, draft/publish) without Vertex doing it for them and without touching Sanity directly.

**"v1 is launched" means all of:**
1. A client logs in and sees **only their own** blog posts.
2. They can **create, edit, delete, save-as-draft, and publish** a post (title, body, summary, featured image).
3. Publishing refreshes their **live site** within a few minutes.
4. A client **cannot see or modify any other client's** content — verified, not assumed.
5. **No Sanity write token is ever exposed to the browser.**
6. It works for the first real clients (Vertex, Sunset Services, Dalibor Plečić) despite their **differing blog schemas**, via per-client config.

---

## 2. The locked decisions (the "why" behind the build)

These are settled. Details and dates are in `dashboard-Decisions.md`; the short version:

- **Separate repo + own subdomain.** Dashboard is NOT built inside the Vertex marketing-site repo. It's a fresh codebase deployed at a subdomain (e.g. `portal.vertexconsulting.mk`). Keeps the public site untouchable, walls off the sensitive token material, and lets the portal stay lean.
- **Path A — a custom Vertex-branded portal**, chosen over inviting clients into Sanity's own login UI. The branded, unified experience is the point.
- **Scale: 5–15 client sites** (a growing handful). Enough that a custom portal is worth it; small enough that a light per-client setup is fine.
- **Each client edits their own separate site's blog.** Confirmed by inspecting real client repos — every client site is its own Sanity project (e.g. Sunset Services = project `i3fawnrl`). This gives **clean tenant isolation at the data layer**: one client's content physically lives in a different project from another's.
- **Essentials-only shared editor + a light per-client config.** Client blogs are NOT built identically (Sunset's blog is richer and domain-specific, and even uses English+Spanish where Vertex uses English+Macedonian). So the portal edits a small common set of fields, and a tiny per-client config tells it where each client keeps its blog and what its fields are called. Anything site-specific stays editable in that client's own Sanity.
- **Auth via Supabase.** No public signup — Vertex provisions client accounts.

---

## 3. Architecture (plain version)

```
  Client (browser)
        │  logs in (Supabase session). Sees a branded editor. NEVER sees tokens.
        ▼
  Dashboard portal  (Next.js, on portal.vertexconsulting.mk, Vercel)
        │  every read/write goes through a SERVER route that:
        │    1. authenticates the Supabase session
        │    2. looks up THIS user's client → that client's Sanity project + token
        │    3. acts ONLY on that client's project
        ▼
  Per-client registry + encrypted tokens   (Supabase)
        │
        ▼
  Client A's Sanity project   Client B's Sanity project   Client C's Sanity project   …
  (e.g. Vertex)               (e.g. Sunset i3fawnrl)      (e.g. Dalibor)
        │                            │                           │
        └─ on publish, the portal pings THAT client site's own revalidate endpoint
           so the client's live website refreshes.
```

> **Revised 2026-06-28 (B.07):** revalidation is Sanity-webhook-driven; the portal sends nothing on publish (the diagram's last step is delegated to each client's Sanity → site webhook) and holds no revalidation secret — see the Decisions log (2026-06-28) and `docs/runbooks/live-site-revalidation.md`.

The **server-side lookup + ownership check** is the heart of the whole thing. Get it right and tenants are isolated; get it wrong and one client can edit another's site.

---

## 4. Tech stack (locked — mirrors the Vertex ecosystem)

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind v4** + **shadcn/ui** — brand tokens copied from the Vertex marketing site so the portal reads as Vertex
- **Supabase** — authentication + the per-client registry and encrypted token store
- **Sanity** via `@sanity/client` / `next-sanity` — a **server-side write client built per tenant** at request time
- **Resend** (optional) — operator notifications; not core to v1
- **Hosting:** Vercel, at the portal subdomain
- Repo bootstrapped with the usual Vertex pattern: protected `main`, `docs/ briefs/ reports/ status/`, and AI code review (CodeRabbit + Codex)

Exact versions and config live in `_project-state/00_stack-and-config.md`.

---

## 5. Security model (read before writing any write-path code)

This portal concentrates the ability to edit every client's blog. Treat it accordingly.

1. **Tokens are server-only secrets.** Per-client Sanity tokens never appear in a `NEXT_PUBLIC_*` var, the client bundle, logs, or commits. Stored encrypted in Supabase (or as Vercel secrets keyed per client with a DB mapping). On a public repo, never write a token's value anywhere — only say where it lives.
2. **Authenticate then authorize, server-side, on every mutation.** The Supabase session identifies the user; the user's record determines the one client (and token) they may act on. No client-supplied project id or token is ever trusted.
3. **Least privilege.** Each token is an **Editor** on exactly one client's Sanity project. Never an admin token, never a cross-project token.
4. **Isolation is a tested invariant.** There must be an automated test proving user A cannot read or write client B's posts before the editor ships.
5. **Supabase RLS** on the registry tables so a row only exposes the requesting user's own client mapping.

---

## 6. The per-client config (how schema differences are absorbed)

Onboarding a client = giving the portal a small description of that client's blog plus an Editor token. Shape (stored in the registry):

```
{
  clientId,                     // internal id
  label,                        // e.g. "Sunset Services"
  sanityProjectId, dataset,     // that client's Sanity project
  blogDocType,                  // which Sanity document is "the blog post" (e.g. blogPost, resourceArticle)
  fieldMap: {                   // what that client calls each essential field
    title, body, excerpt, image, status, slug
  },
  locales,                      // e.g. ["en","mk"] for Vertex, ["en","es"] for Sunset
  revalidateUrl                 // the client site's own refresh endpoint, called on publish
}
```

The editor renders from this config, so the same UI works across clients with different schemas. Adding a client never requires touching the editor — only adding a row + token + config.

---

## 7. How we work on this project

- **Front-load context before building.** Confirm architecture decisions before implementation; record them in `dashboard-Decisions.md`.
- **Identify which files are needed** rather than dumping everything; for client repos, fetch directly from GitHub (`git clone --depth 1 …`) rather than asking for files by hand.
- **The operator (Lazar) has no coding background** and relies on clear, step-by-step guidance. Explain in plain language; keep secrets and terminal steps copy-pasteable and unambiguous.
- **Phase discipline:** one phase at a time, each closed by a completion report (`_project-state/completions/`) and a `current-state.md` update. See `AGENTS.md`.

---

## 8. Open inputs still needed (not blockers for planning)

- **Dalibor Plečić repo URL** — couldn't be auto-located; needed to confirm that client's blog schema (or paste its `sanity.config.ts` + blog schema if the repo is private).
- **`Master-Prompt.md`** — Lazar's standard project prompt; the original upload came through empty. Paste or re-attach when convenient (this file already captures the essentials).
- **Per-client Sanity Editor tokens** and a **Supabase project** — generated during the Make-it-work phase, not before.

---

## 9. Reference: the known client sites

| Client | Sanity project | Blog shape (as observed) | Languages |
|---|---|---|---|
| Vertex Consulting | own project (`vertex-blog`) | `blogPost` (title, slug, excerpt, body, author, division, status) | EN + MK |
| Sunset Services | `i3fawnrl` | `blogPost` **and** richer `resourceArticle` (eyebrow, dek, category, FAQs, cross-links) | EN + ES |
| Dalibor Plečić | *pending repo URL* | *to confirm* | likely MK |

The variation across these three is exactly why the editor is config-driven (§6).
