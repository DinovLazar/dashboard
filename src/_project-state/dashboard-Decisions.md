# Dashboard — Decisions log

Append-only log of project-level decisions during the build of the Vertex Consulting client blog portal. New entries go at the **bottom**; older entries are never edited or removed.

Add an entry when:

- A project capability is deferred to a later phase (or post-launch).
- A tool/integration is replaced or skipped versus the plan.
- A non-obvious business or architecture decision is made that future contributors should know about.
- A previously logged decision is reversed or superseded (add a new dated entry; don't edit the old one).

---

## 2026-06-26 — Product approach: custom Vertex-branded portal (Path A)

Clients will manage their blogs through a **custom, Vertex-branded portal**, not by being invited into Sanity's own login UI.

**Two paths were weighed:**
- **Path A (chosen) — custom branded portal.** Clients log in at a Vertex address and get a clean, Vertex-styled editor. Premium, unified experience; but it's a real piece of software that holds editing keys to every client's blog, so it carries real security responsibility.
- **Path B (rejected) — Sanity's built-in logins.** Invite each client to their own site's Sanity with an Editor role. Same end result for the client with far less custom security work, but it's Sanity's UI (not Vertex-branded), one login per site, and past a handful of users may require a paid Sanity plan.

**Why A:** a single, Vertex-branded portal is something Vertex can put its name on and present to clients as part of its offering — the branded, unified experience is the point. Path B remains the documented fallback if priorities change; upgrading A later does not waste B's work because the data layer is the same.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Each client edits their own separate site's blog (tenant isolation at the data layer)

When a client logs in, they manage the blog on **their own website**, and **each client site is its own separate Sanity project** — confirmed by inspecting real client repos (e.g. Sunset Services = Sanity project `i3fawnrl`, distinct from Vertex's own project).

**Consequence:** tenant isolation is built in at the data layer — one client's content physically lives in a different Sanity project from another's, so there is no shared dataset to leak across. The portal's security job narrows to "never hand a logged-in user the wrong client's project/token." This is the single most reassuring fact about Path A and the reason the build is feasible.

**Decided by:** user (Lazar), in Chat. Verified by Claude against the Sunset Services repo.

---

## 2026-06-26 — Scale: 5–15 client sites

The portal targets a **growing handful of client sites — roughly 5–15** at launch.

**Consequence:** enough scale to justify a custom portal (Path A) over per-site Sanity invitations; small enough that a **light, one-time per-client setup** (a registry row + token + config) is perfectly manageable and does not need a self-serve client-onboarding system in v1.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Editor scope: essentials-only shared editor + light per-client config

The portal ships **one clean, shared editor covering the essentials** — headline, body, summary, featured image, and save-as-draft / publish — plus a **small per-client configuration** that tells the portal where each client keeps its blog and what its fields are called.

**Why (the wrinkle this solves):** client blogs are **not built identically**. Vertex's blog is a simple `blogPost`; Sunset's is richer and domain-specific (`resourceArticle` with eyebrow, dek, categories like "lawn care", FAQs, cross-links) and uses **English + Spanish**, where Vertex uses **English + Macedonian**. A single portal therefore cannot assume one fixed set of fields.

**Two options were weighed:**
- **Chosen — essentials editor + per-client config.** Edits the common fields across every client; a tiny config maps each client's blog shape (doc type, field names, languages). Anything site-specific (e.g. Sunset's categories/FAQs) stays editable in that client's own Sanity. Fastest to build, easiest to maintain, gives clients exactly what was asked for. Onboarding a new client is data, not code.
- **Rejected (for now) — standardize every client blog to one identical schema first.** Cleaner long-term but requires reworking existing client sites (like Sunset) before the portal works for them — noticeably more upfront work. Can be revisited later for clients who need full-fidelity editing.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Topology: separate repo + own subdomain (not inside the Vertex site)

Dashboard is built as a **new, separate repository** and deployed at its **own subdomain** (e.g. `portal.vertexconsulting.mk`) — **not** inside the Vertex marketing-site repo and not as a path on the main site.

**Why:**
1. **The public marketing site stays untouchable.** Frequent early portal changes can't risk breaking `vertexconsulting.mk`, and vice-versa — two separate projects are isolated by construction.
2. **Sensitive material is contained.** The portal holds editing keys to every client's blog; that secret-handling code should not sit inside the app that serves the public marketing site.
3. **The portal stays lean.** It needs none of the marketing site's animations, bilingual public pages, or routing weight; a fresh codebase keeps it a simple, fast "log in and write" tool.

**Cost accepted:** a one-time copy of Vertex's brand tokens (colors, fonts, a few UI pieces) so the portal still reads as Vertex. Spinning up a fresh repo is already the standard Vertex project-start pattern.

**This does not change any of the four product decisions above** — it only gives the portal a clean, safe home. "Vertex-branded portal" stays fully intact.

**Decided by:** user (Lazar), in Chat.

---

## 2026-06-26 — Auth via Supabase; no public signup; tokens stored server-side

- **Supabase** provides authentication and the per-client registry (with Row-Level Security). Supabase is already part of the Vertex ecosystem and is the natural fit for client logins.
- **No public signup.** Vertex provisions every client account; clients cannot self-register.
- **Per-client Sanity write tokens are server-side secrets** — stored encrypted in Supabase (or a secret store), never in a `NEXT_PUBLIC_*` variable, the client bundle, logs, or commits. Every mutating request is **authenticated and authorized on the server**, where the logged-in user's record selects the one client (and token) they may act on. No client-supplied project id or token is ever trusted. Tokens are **least-privilege Editor** on exactly one client's Sanity project.
- **Cross-tenant isolation is a tested invariant** — an automated test must prove user A cannot read or write client B's posts before the editor ships.

**Decided by:** user (Lazar) (Supabase + portal direction) and Claude (security pattern), in Chat. This is the load-bearing safety decision for Path A; treat any change to it as requiring a new entry here.

---

## 2026-06-26 — Open inputs flagged (not yet decisions)

Recorded so they're tracked, not silently dropped (see `dashboard-Notion-Checklist.md`):

- **Dalibor Plečić repo could not be auto-located** — its GitHub URL (or its `sanity.config.ts` + blog schema if private) is still needed to confirm that client's blog shape. Does not block planning; the essentials-editor + per-client-config approach absorbs whatever Dalibor's schema turns out to be.
- **`Master-Prompt.md` upload came through empty** — to be re-shared when convenient; the essentials are captured in `dashboard-Project-Instructions.md`.

**Decided by:** n/a — open items, pending operator input.

---

## 2026-06-26 — B.01 implementation choices (project setup + branded shell)

Choices made during B.01 that the phase prompt did not spell out:

- **Canonical docs home is `src/_project-state/` (not root `_project-state/`).** The phase brief and the Vertex marketing site both place project-state under `src/`, so the pre-seeded root `_project-state/` and the five `dashboard-*.md` planning docs were moved there. `AGENTS.md` and `CLAUDE.md` path references were updated to match. `dashboard-Notion-Checklist.md` was moved alongside the four named planning docs for consistency (it is the same class of artifact).
- **shadcn token bridge wraps HSL triplets in `hsl()`.** Vertex's `globals.css` maps the shadcn semantic tokens as bare `var(--primary)` etc., where the values are space-separated HSL triplets (`0 0% 96%`). That yields *invalid* colors when consumed by a real shadcn primitive (a transparent button). Vertex never hit this because its visible UI uses bespoke classes, not the primitives; the portal uses the primitives directly. Fix: wrap the bridge values in `hsl(...)` (the canonical shadcn pattern). This is a faithful adaptation of the Vertex tokens, not a new palette. Alternative rejected: storing full-color values in `:root` (more churn, diverges further from Vertex's source).
- **Portal chrome/buttons use the heading face (Archivo).** `base-nova` buttons inherit the body font (Source Serif 4); Vertex's CTAs and chrome are Archivo. Added `font-heading` to the Button primitive and the nav links so the portal reads as Vertex. Body prose stays serif.
- **`@base-ui/react` added as a dependency.** It is a required peer of the `base-nova` Button/Input primitives and was not pre-listed; npm resolved `^1.6.0` (satisfies Vertex's `^1.4.0`). Not one of the integrations the brief deferred.
- **Repo history: one empty initial commit on `main`, then the whole phase via one PR.** A brand-new repo needs `main` to exist before branch protection and before any PR can be opened. To keep the entire B.01 deliverable inside a single reviewable PR (per the brief's "one PR for the phase"), `main` was seeded with an empty `chore: initialize repository` commit, protection applied, then all of B.01 landed on a feature branch → PR → merge.
- **B.01 preview deployed via the Vercel CLI.** Produces a live, public preview URL now. Connecting the Vercel↔GitHub app for automatic deploys-on-push remains an owner one-time step (as the brief notes).
- **`next.config.ts` kept minimal/empty** (no `cdn.sanity.io` image remotePattern yet) to keep B.01 free of any Sanity reference; it is added in the phase that loads client images (B.06).

**Decided by:** Claude, during B.01 implementation. None reverse a prior locked decision; they refine how the locked stack/brand are realised.
