# Part B · Phase 05 · Editor (create / edit / delete / draft / publish) — Completion Report

**Date:** 2026-06-27 · **Outcome (one line):** The portal now has a working, branded, config-driven **editor** — a logged-in client can create, edit, save-as-draft, publish, and delete a blog post on their own site, every write going through the same secure per-tenant bridge as the read path, with cross-tenant write isolation proven by an automated test.

---

## 1. What shipped (plain language)

Before B.05 a client could only *see* their posts. Now they can **write** them: create a new post, edit it, save it as a draft, publish it to their live site, and delete it — all from a clean Vertex-branded editor, without ever touching Sanity or seeing any keys. The portal absorbs each client's differing blog shape through their stored config (field names, languages), and shows language tabs when a client's blog is multi-language. Crucially, the safety guarantee the whole product rests on is now proven for writes too: an automated test demonstrates that one client's create/edit/publish/delete can only ever touch **their own** site's content — never another client's — and that the secret token never leaves the server.

## 2. Definition of Done

- ✅ **Create / edit / save-draft / publish / delete work through the editor + Server Actions.** — evidence: editor at [post-editor.tsx](src/components/editor/post-editor.tsx) wired to the four actions in [actions.ts](src/app/(portal)/posts/actions.ts) → [mutations.ts](src/lib/sanity/mutations.ts); offline behaviour proven by [mutations.test.ts](src/lib/sanity/mutations.test.ts) (dispatch shapes) and [isolation.test.ts](src/lib/registry/isolation.test.ts) (write path). *Live writes against the B.03 placeholder project surface the friendly error state by design — the live round-trip per real client is M.02; the offline tests are the authoritative B.05 proof, per the brief.*
- ✅ **Write-path isolation passes (the §5 gate).** — evidence: `isolation.test.ts` → "cross-tenant isolation — B.05 write path": every `createDraft`/`saveDraft`/`publishPost`/`deletePost` is built with **and** dispatched through the owner's project + token (asserted `.not.toBe('project-b')` / `.not.toBe(TOKEN_B)`); an attacker-controlled/foreign post id stays in the owner's dataset; an unmapped (`no-client`) / null (`unauthenticated`) session is denied before any writer is constructed or any secret read.
- ✅ **Draft/published governed by the draft-id model; publish promotes + deletes the draft in one transaction; delete removes both variants.** — evidence: `mutations.ts` (`saveDraft` → `createOrReplace('drafts.'+id)`; `publishPost` → `transaction().createOrReplace(publishedId).delete('drafts.'+id).commit()`; `deletePost` → `transaction().delete(id).delete('drafts.'+id)`); `mutations.test.ts` asserts each.
- ✅ **Save preserves non-essential client fields.** — evidence: `mutations.test.ts` "saveDraft … preserving non-essential client fields" seeds `mainImage`/`author`/`categories` and asserts they survive while only the essentials change; `_rev`/`_updatedAt` are dropped.
- ✅ **Language tabs render for multi-locale; single-locale plain-string write works.** — evidence: `post-editor.tsx` renders tabs when `locales.length > 1`, keeps every locale's inputs mounted; `localize.test.ts` + `mutations.test.ts` prove the single-locale plain-value path; `getPost`/`localize` handle the multi-locale object.
- ✅ **Image field present but inert; no image written; `next.config.ts` unchanged.** — evidence: `post-editor.tsx` "Image upload arrives soon" disabled card (no `name`, not submitted); `mutations.test.ts` asserts no `mainImage` key on create; `git diff` shows `next.config.ts` untouched.
- ✅ **Both "New post" buttons enabled → `/posts/new`; list rows link to `/posts/[id]`.** — evidence: [posts/page.tsx](src/app/(portal)/posts/page.tsx) (header + empty-state links) and [posts-list.tsx](src/components/portal/posts-list.tsx) (row `Link`).
- ✅ **No token/secret value in the diff; no `'use client'` file imports a token/resolver/mutation/Sanity module; `server-only` guard in force.** — evidence: grep audit (forbidden-import scan returns NONE; `sk…`-token scan returns NONE; all five server modules begin `import 'server-only'`); `npm run build` passes with the guard active.
- ✅ **`npm run test` and `npm run build` pass.** — evidence: `Test Files 8 passed (8) · Tests 105 passed (105)`; `next build` → compiled + TypeScript OK, routes `/posts/[id]` and `/posts/new` dynamic (`ƒ`).
- ✅ **`current-state.md`, `file-map.md`, `00_stack-and-config.md` updated; this report filed; `dashboard-Decisions.md` entries appended.**
- ⚠️ **Live editor render / write** — not exercised: no `.env.local`/Supabase project is reachable by the agent, and the test client points at a placeholder Sanity project (a live write errors by design). This is **M.02** by plan; the offline write-isolation + mutation unit tests are the authoritative B.05 proof (per the brief's DoD and the B.04/B.05 decisions).

## 3. Decisions I made during this phase

Recorded in full in `dashboard-Decisions.md` (two dated 2026-06-27 entries: the locked "B.05 editor: write model & scope", and "B.05 implementation choices"). Summary of the non-spelled-out choices:

- **Two extra dedicated, tested pure modules** as single sources of truth for sensitive logic the brief described inline: `src/lib/config/portable-text.ts` (text ⇄ minimal Portable Text + the `isEditableBody` data-loss guard) and `src/lib/sanity/doc-id.ts` (`normalizePostId`/`isValidDocId`/`draftId` id-sanitization). Each with its own test file. → needs a Decisions entry (added).
- **The rich-body guard is conservative beyond the brief's enumerated list** (also rejects heading styles, lists, and non-array bodies) — in the data-loss-safe direction. → Decisions entry (added).
- **A non-editable body is preserved by omission** (the action omits `body`, so the save overlay leaves the stored body untouched), driven by a hidden `bodyEditable` flag. → Decisions entry (added).
- **`toFieldValue` generalized over the value type** (string and Portable Text array) so body localization reuses the single/multi-locale logic. → Decisions entry (added).
- **Slug written only when non-empty; image/status never written.** → Decisions entry (added).
- **Editor imports the four Server Actions directly** (like `login-form.tsx`) rather than as props — equivalent for module-level actions; the no-secret-to-client constraint is honored. → Decisions entry (added).
- **`normalizePostId` strict** (`^[A-Za-z0-9_-]+$` after prefix-strip); `getPost` → not-found on a bad id, actions → generic error. → Decisions entry (added).
- **Publish = save-then-publish:** `publishPostAction` persists the on-screen edits into the draft (same parse + body-preserve + title guard as Save) before promoting it, so Publish makes exactly what the user sees live (corrected a first-pass no-op bug found by the adversarial review — see §7-review). → Decisions entry (added).
- **Action outcomes:** create → redirect to the new editor; save/publish → `revalidatePath` + `ok` result; delete → revalidate + redirect; `redirect()` always outside the try/catch. → Decisions entry (added).

## 4. Deviations from the brief / spec

- The brief's file list did not name `portable-text.ts` or `doc-id.ts`; I added them (with tests) rather than inline-duplicating the logic across the read path, write path, and actions (see §3). No behavioural deviation — both implement Gotcha 6 and the §2 id-normalization the brief mandated.
- The editor imports the Server Actions directly instead of receiving them as props (Gotcha 7 described passing them down). Functionally equivalent for module-level actions; the load-bearing constraint — the client boundary gets no tenant/token — is met. No security difference.
- Otherwise none. Image field is inert (B.06), no `status` write, no `revalidate_url` call (B.07) — all as the brief scoped.

## 5. Changed files / deliverables

- **Code (new):** `src/lib/sanity/mutations.ts` (+ `.test.ts`), `src/lib/sanity/doc-id.ts` (+ `.test.ts`), `src/lib/config/localize.ts` (+ `.test.ts`), `src/lib/config/portable-text.ts` (+ `.test.ts`), `src/app/(portal)/posts/actions.ts`, `src/app/(portal)/posts/new/page.tsx`, `src/app/(portal)/posts/[id]/page.tsx`, `src/components/editor/post-editor.tsx`, `src/components/editor/editor-message.tsx`.
- **Code (edited):** `src/lib/config/field-map.ts` (+ `.test.ts`) — `buildPostByIdQuery`/`assertWritableFieldPaths`/`slugContainerField`; `src/lib/sanity/posts.ts` (+ `.test.ts`) — `getPost`/`PostDetail`; `src/lib/registry/isolation.test.ts` — write-path §5 gate; `src/app/(portal)/posts/page.tsx` + `src/components/portal/posts-list.tsx` — enabled buttons + row links.
- **Branch / PR:** `b05-editor`, based on the head of `b04-sanity-read` (the stack continues). One commit: `B.05: config-driven editor …`. PR base must be confirmed when opened (B.02/B.03/B.04 still open).
- **Ops / manual:** none. No new env vars, no new dependencies, no `next.config.ts` change, no migration. **No secret value appears anywhere in this report or the diff** — tokens live only in the server-side resolver + Sanity modules (where, not what).

## 6. State updates done

`current-state.md` (end-of-B.05 snapshot, security posture for the write path), `file-map.md` (all new/modified files), and `00_stack-and-config.md` (write-path section, 105-test count, "no new deps/env") now match reality. `dashboard-Decisions.md` has the two new dated entries.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary (the one that matters):** the write path reuses `resolveTenant()` exactly as the read path — the only authorized way to obtain a tenant. Every Server Action **re-resolves and re-authorizes** (Server Actions are POST-reachable). The decrypted token stays server-only (verified: no `'use client'` import; build guard holds). Caller-supplied ids are sanitized and only applied through the owner's per-tenant client. **B.06 (image upload) and B.07 (revalidate) must preserve all of this** — upload through the same server-side per-tenant client (never a browser token), and re-run/extend `isolation.test.ts` as the write surface grows.
- **An internal adversarial multi-agent security review of the write-path diff was run during B.05** (5 dimensions — token-leak, write-isolation, action-authz, GROQ-injection, data-integrity — each finding independently verified). See §7-review below for the outcome.
- **Live verification is M.02** (real Supabase + real Editor token + real project). Until then the placeholder project makes a live write error into the friendly state — expected.
- **Branch/merge order** unchanged from B.04: confirm the PR base; `main` stays protected; pinned versions; small commits.
- **AI review (CodeRabbit/Codex)** remains an owner one-time step, strongly recommended before this phase merges.

### §7-review — adversarial security review outcome

A 5-dimension adversarial review (7 agents: 5 finders + independent verifiers) ran over the write-path diff: **token-leak**, **write-isolation**, **action-authz**, **GROQ-injection**, **data-integrity**. Three dimensions returned **zero findings** — confirming the security core: no token reaches the client, every action re-authorizes, and all ids/types are bound parameters with validated field names. Two findings survived verification; **both are fixed in this phase**:

- **HIGH — Publish discarded the user's in-form edits (fixed).** The Publish button submits the live form, but `publishPostAction` first read only the post id and promoted the *pre-existing* draft — so editing a clean published post and clicking Publish was a reported-success no-op that lost the edits (and editing a post with an older draft promoted the stale draft). **Fix:** `publishPostAction` now parses the submitted fields and `saveDraft`s them (same body-preserve + title guard as Save) **before** `publishPost` promotes the draft — "Publish" now reliably makes the on-screen content live. (No security impact — isolation was never affected; this was a data-loss/UX defect.) Recorded in `dashboard-Decisions.md` (the "Publish = save-then-publish" bullet).
- **LOW — the foreign-id publish isolation assertion was vacuous (fixed/hardened).** In the foreign-id case, `publishPost` no-ops (no seeded draft for the foreign id), so that specific dispatch loop iterated nothing — though the happy-path test *does* exercise a real publish dispatch through the owner. **Fix:** the main A→A / B→B test now asserts an exact per-mutation **dispatch count of 4** (create + save + publish + delete), so a silent publish no-op can no longer slip past the isolation assertions. Production `publishPost` was confirmed correctly isolated throughout (the verifier's own conclusion).

After both fixes: `npm run test` → **105 passed**, `npm run lint` clean, `npm run build` passes with the `server-only` guard in force.

## 8. What's now possible that wasn't before

A Vertex client can now independently write and publish their own blog from a branded portal — and we can prove they can only ever touch their own site. The remaining work is additive: a featured image (B.06) and the live-site refresh on publish (B.07).
