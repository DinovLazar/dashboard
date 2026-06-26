# Dashboard — Phase Plan

The build sequence for the Vertex Consulting client blog portal. Specification is in `dashboard-Plan.md`; locked decisions are in `dashboard-Decisions.md`.

## Table of contents

1. How to read this document
2. Phase numbering conventions
3. Bucket B — Building (no external waits)
4. Bucket M — Make-it-work (connecting real clients)
5. Bucket P — Publishing (going live)
6. Critical path & dependencies
7. Defaults locked at draft time

---

## 1. How to read this document

Each phase is a self-contained unit of work that ends with a completion report in `_project-state/completions/` and a `current-state.md` update. A phase is not "done" until its report is filed and the live snapshot matches reality. Work one phase at a time; confirm anything ambiguous before starting and record the decision in `dashboard-Decisions.md`.

Phases are grouped into three buckets: **B — Building** (pure build, nothing external to wait on), **M — Make-it-work** (wiring real client tokens, accounts, and end-to-end tests), and **P — Publishing** (going public). Build B top-to-bottom; M needs per-client tokens and a Supabase project; P needs M.

---

## 2. Phase numbering conventions

- `B.01`, `B.02`, … building phases, in order.
- `M.01`, `M.02`, … make-it-work phases.
- `P.01`, `P.02`, … publishing phases.
- Sub-phases use a trailing letter when a phase splits mid-flight (`B.04a`).
- Completion reports: `_project-state/completions/Part-<Bucket>-Phase-<NN>-Completion.md` (copy the template in that folder).

---

## 3. Bucket B — Building (no external waits)

**B.01 — Project setup.** Bootstrap the repo to the Vertex standard (protected `main`, `docs/ briefs/ reports/ status/`, CodeRabbit + Codex review). Scaffold Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui. Copy Vertex brand tokens so the shell reads as Vertex. Deploy an empty authenticated-shell skeleton to Vercel on a preview URL. *Done when:* the skeleton deploys and renders the branded shell.

**B.02 — Supabase auth.** Wire Supabase Auth: login screen, session handling, protected portal routes, logout. **No public signup** — accounts are created by Vertex. *Done when:* an invited test user can log in, hit a protected page, and log out; an anonymous visitor is redirected to login.

**B.03 — Registry data model.** Create the `clients` and `client_users` tables in Supabase with the per-client config columns (`sanity_project_id`, `dataset`, `blog_doc_type`, `field_map`, `locales`, `revalidate_url`) and **encrypted token storage**. Apply Row-Level Security so a user reads only their own mapping. Seed one **test** client (a throwaway Sanity project, not a real client). *Done when:* the test user resolves to exactly one client config via an RLS-protected query.

**B.04 — Secure per-tenant Sanity bridge (read first).** Build the server-only module that resolves the logged-in user → their client config + Editor token, with the **authorization/ownership check**, and the per-tenant Sanity client factory. Implement the **read path**: list that client's posts. Write an automated test proving user A cannot read client B's posts. *Done when:* the post list shows only the logged-in client's posts and the isolation test passes.

**B.05 — Editor (create / edit / delete / draft / publish).** The branded, config-driven editor: post list → create/edit form (headline, body, summary, image field, status) → delete with confirm. Renders localized field tabs when the client config says multi-language. Writes go through the B.04 bridge. Extend the isolation test to writes (user A cannot write to client B). *Done when:* the test user can create, edit, delete, draft, and publish a post on the test client, and the write-isolation test passes.

**B.06 — Image upload.** Server-side upload of a featured image into the client's own Sanity dataset (via their token), wired into the editor's image field. *Done when:* an uploaded image attaches to a post and renders in the client's dataset.

**B.07 — Publish → live-site refresh.** On publish, call the client site's own `revalidate_url` so the client's live website updates. Handle the success/failure path gracefully (a failed refresh must not lose the publish). *Done when:* publishing on a real-ish client triggers its revalidate endpoint and the change appears on that site within minutes.

**B.08 — Accessibility & polish.** Keyboard/focus, labels, error states, empty states, loading states; mobile-first responsive pass. *Done when:* the portal is keyboard-navigable, has no obvious a11y violations, and reads cleanly on a phone.

---

## 4. Bucket M — Make-it-work (connecting real clients)

**M.01 — Onboard the real client projects.** For Vertex, Sunset Services, and Dalibor: generate a least-privilege **Editor** token in each client's Sanity project, add the registry row + per-client config, and map each client's fields (e.g. Sunset's `resourceArticle`/`blogPost`, EN+ES; Vertex's `blogPost`, EN+MK). *Done when:* all three resolve to working configs.

**M.02 — Per-client end-to-end test.** On a staging/test post in each real client's project, run create → edit → draft → publish → delete, and confirm the live-site refresh. Explicitly verify isolation: a user for client A cannot see or touch client B. *Done when:* every real client passes the full round-trip and isolation holds.

**M.03 — Security review.** Audit token handling (no leaks to the bundle, logs, or repo), Supabase RLS, the authorize-on-every-mutation check, and basic rate limiting on the write routes. Rotate any token that was ever pasted in plaintext during setup. *Done when:* the review checklist passes.

**M.04 — Client accounts & onboarding.** Create Supabase accounts for the real client editors; send credentials/login instructions. *Done when:* at least one real client editor can log in and reach their own posts.

---

## 5. Bucket P — Publishing (going live)

**P.01 — Production hardening.** Production env + secrets, Supabase RLS verified in prod, error handling, monitoring/notifications. *Done when:* a production deploy passes a smoke test end-to-end.

**P.02 — Subdomain go-live.** Point `portal.vertexconsulting.mk` (or the chosen subdomain) at the production deploy; verify SSL and auth on the real domain. *Done when:* the portal is reachable and working at its subdomain.

**P.03 — Client handover.** Ship the one-page "how to log in and write a post" guide; brief the first clients. *Done when:* clients have the guide and a working login.

---

## 6. Critical path & dependencies

- **Sequential core:** B.01 → B.02 → B.03 → B.04 → B.05. B.06 and B.07 build on B.05. B.08 follows.
- **M needs:** a real Supabase project (B.02/B.03) **and** one Editor token per client project (you generate these in each client's Sanity — an external step).
- **P needs:** M complete, plus the subdomain + DNS and client user emails.
- **External waits / inputs:** Dalibor repo URL (to finish its config in M.01), per-client Sanity Editor tokens, the Supabase project, the subdomain/DNS, client emails. Tracked in `dashboard-Notion-Checklist.md`.

---

## 7. Defaults locked at draft time

Called on the operator's behalf so the build can proceed without stalling; reverse any by adding a dated `dashboard-Decisions.md` entry:

- **No public signup.** Vertex provisions all accounts.
- **Editor scope is the essentials only** (headline, body, summary, image, draft/publish). Site-specific fields stay in the client's Sanity.
- **One Sanity project per client** (existing reality) — the portal never merges client content into a shared dataset.
- **Tokens stored server-side, encrypted**; the write path is the only way content is mutated.
- **Brand = Vertex** (tokens copied from the marketing site); no new palette.
- **Subdomain** for hosting (e.g. `portal.vertexconsulting.mk`), not a path on the main site.

---

## What's next

Pick up B.01. Read `_project-state/current-state.md` first, then this phase's entry, then build.
