# Part B · Phase 07 · Code — Publish → live-site refresh — Completion Report

**Date:** 2026-06-28 · **Outcome (one line):** How a publish reaches the client's live site is now settled, recorded, and documented — the refresh is driven by each client's own Sanity → site webhook, so the portal sends nothing on publish and holds no revalidation secret. No portal feature code changed; the 130-test suite stays green.

---

## 1. What shipped (plain language)

When a client publishes a post in the portal, their public website needs to refresh so the new post appears within a couple of minutes. This phase decided **how** that happens and made the codebase and docs honest about it — it did **not** add a new feature. The decision: the portal already saves the published post into the client's own Sanity project, and **Sanity itself** then notifies the client's website (via a "webhook" the client site already supports) to refresh. So the portal never calls the client's website directly and never has to hold yet another password. We recorded that decision, wrote the step-by-step operator runbook for switching this on per client, marked the now-unused `revalidateUrl` setting as intentionally unused, and synced the project docs. Nothing about the portal's behaviour changed, so all 130 existing tests still pass.

## 2. Definition of Done

- ✅ **2026-06-28 decision appended verbatim to the bottom of `dashboard-Decisions.md`; no older entry edited.** — evidence: the new entry "Live-site refresh is Sanity-webhook-driven; the portal sends nothing on publish (B.07)" is the last entry in [dashboard-Decisions.md](src/_project-state/dashboard-Decisions.md); `git diff` shows the file is append-only (only additions after the prior last line).
- ✅ **`docs/runbooks/live-site-revalidation.md` created with the required content.** — evidence: [live-site-revalidation.md](docs/runbooks/live-site-revalidation.md) contains how-it-works (no portal call) + the ASCII flow, each client site's precondition (`/api/revalidate` receiver + its own `SANITY_REVALIDATE_SECRET`), the once-per-client manage.sanity.io setup including the draft-excluding filter `!(_id in path("drafts.**"))` and the `{_type, _id, "slug": slug.current}` projection, verification steps, and the per-client status table. No secret value appears (grep-verified, §5 below).
- ✅ **`TenantConfig.revalidateUrl` doc-comment states it is intentionally unused (Sanity-webhook model, 2026-06-28) and retained for a possible future change; field unchanged, no other code changed.** — evidence: [types.ts:41](src/lib/registry/types.ts) — the field type (`string | null`) is unchanged; only the doc-comment was expanded. `git diff` on the file touches only those comment lines.
- ✅ **`dashboard-Project-Instructions.md` §3 and `dashboard-Plan.md` §8 each carry a one-line pointer note; original prose intact.** — evidence: [dashboard-Project-Instructions.md](src/_project-state/dashboard-Project-Instructions.md) §3 (after the architecture diagram) and [dashboard-Plan.md](src/_project-state/dashboard-Plan.md) §8 (under "Live-site refresh") each gained a blockquote pointer to the 2026-06-28 decision + runbook; the surrounding prose and the diagram are unchanged.
- ✅ **`current-state.md` reflects B.07.** — evidence: [current-state.md](src/_project-state/current-state.md) header now reads "end of Phase B.07"; a "New in B.07" block, an updated "What is NOT built yet" bullet, a new Security-posture bullet ("the portal sends nothing on publish and holds no revalidation secret"), updated Stack/Routes/Risks lines, and "Next phase → B.08" all state: refresh delegated to each client's Sanity → site webhook; portal sends nothing and holds no revalidation secret; `revalidateUrl` retained-but-unused; webhook setup is M.01; live proof is M.02.
- ✅ **`npm run lint` passes, typecheck passes, `npm run build` passes.** — evidence: `npm run lint` → no output (clean); `npx tsc --noEmit` → exit 0; `npm run build` → "✓ Compiled successfully", routes table prints, no errors.
- ✅ **`npm test` passes with the same 130 tests green (no new test added).** — evidence: `vitest run` → "Test Files 9 passed (9) · Tests 130 passed (130)". No test file was added or changed (see §4 for why that is the correct outcome).
- ✅ **No secret values anywhere in the diff (grep-verified); no `'use client'` file imports a token/resolver/mutation/Sanity module.** — evidence: a grep over the B.07 diff + the new runbook for secret-shaped values returned only prose naming secrets by env-var name/concept (never a value); the three `'use client'` source files (`login-form.tsx`, `ui/label.tsx`, `editor/post-editor.tsx`) import no `lib/sanity` / `resolve-tenant` / `lib/registry` / mutations / assets module (unchanged from B.06, re-confirmed).
- ✅ **`Part-B-Phase-07-Completion.md` filed.** — evidence: this file.

## 3. Decisions I made during this phase

- **Where the pointer notes sit and their exact wording.** The brief asked for "a one-line pointer note" in §3 and §8 without dictating placement. I put each as a Markdown blockquote (`>`) immediately after the prose it qualifies — after the architecture diagram in Project-Instructions §3, and as a nested note under the "Per-client revalidation" bullet in Plan §8 — so the revision is visually attached to the old assumption without rewriting it. · Why: keeps the original prose verbatim (the brief's constraint) while making the revision impossible to miss. · Alternative rejected: editing the original sentences in place (the brief explicitly says keep the original prose intact). · Needs a Decisions entry? No — this is doc formatting, and the substantive decision is already the appended 2026-06-28 entry.
- **Runbook footer + ASCII-diagram formatting.** I matched the house style of the existing runbooks (`registry-apply.md`) by adding the `*dashboard | … | B.07 | 2026-06-28*` footer line and rendering the brief's flow sketch as a fenced code block. · Why: the brief said "adjust only formatting to match the other runbooks; keep all the substance." · Alternative rejected: none material. · Needs a Decisions entry? No.
- **Breadth of the `current-state.md` edit.** Beyond the items the brief named (B.07 status / What is live / What is NOT built yet / Next phase), I also refreshed the Security-posture heading + a new bullet, the Stack line, the Routes line, and the two now-stale Risks bullets (the old "Security boundary for B.07: publish → revalidate_url must not leak the token" follow-up is superseded by this decision). · Why: AGENTS.md requires current-state to "match reality"; leaving the old forward-looking B.07 risk in place would contradict the shipped decision. · Alternative rejected: touching only the four named sections (would leave self-contradicting text). · Needs a Decisions entry? No — it is documentation sync.

No decision here reverses a locked one; the single substantive decision is the appended 2026-06-28 Decisions entry, which itself records that it **revises** (not reverses without trace) the §3/§8 "portal pings" assumption and is reversible by a future dated entry.

## 4. Deviations from the brief / spec

**None.** Every Build-Approach step was done in order, and the out-of-scope list was respected: no portal-side `fetch` to `revalidate_url`, no `@sanity/webhook`/signing code, no per-client webhook configured (that is M.01), no live end-to-end run (M.02), no removal of `revalidate_url` from the schema/type, no edit to the applied SQL migration, and no change to the editor's publish copy, `publishPostAction`, or `publishPost`.

**On "no new test":** this is the correct outcome, not a gap. B.07 changes **no runtime code** — the publish path (`publishPostAction` → `publishPost`) and the editor's success copy were already correct for the Sanity-webhook model (baked in at B.05), and the refresh is delegated to Sanity, which the portal cannot exercise in an offline test. Inventing a test here would be theatre. The phase's verification is that the existing 130-test suite stays green and lint/typecheck/build stay clean — all confirmed (§2).

## 5. Changed files / deliverables

- **Code:** `src/lib/registry/types.ts` — doc-comment on `revalidateUrl` expanded to "intentionally unused (Sanity-webhook model, 2026-06-28), retained for a possible future change." The field's type is unchanged; no runtime behaviour changed.
- **Docs (new):** `docs/runbooks/live-site-revalidation.md` — the authoritative per-client revalidation runbook.
- **Docs (project-state):** `dashboard-Decisions.md` (appended the 2026-06-28 entry), `dashboard-Project-Instructions.md` §3 + `dashboard-Plan.md` §8 (one-line pointer notes), `current-state.md` (synced to B.07), `file-map.md` (added the new runbook).
- **Ops / manual:** none executed this phase. The runbook documents the once-per-client manage.sanity.io webhook setup that the operator performs in **M.01**; the per-client status table tracks it.
- **Branch / commit:** committed on the B.07 branch (continues the stack on the head of `b06-image-upload`). **No secrets pasted anywhere** — the runbook and report say only *where* `SANITY_REVALIDATE_SECRET` lives (each client site + that client's Sanity webhook config), never its value. The repo is public.

## 6. State updates done

Confirmed in sync with reality:
- `current-state.md` — header date → B.07; "New in B.07" block; updated "What is NOT built yet", Security posture, Stack, Routes, Risks; Next phase → B.08.
- `file-map.md` — added `runbooks/live-site-revalidation.md`.
- `00_stack-and-config.md` — **no change needed**: B.07 added no dependency, no environment variable, and no config change (verified — the only code touched is a TS doc-comment).
- `dashboard-Decisions.md` — appended the 2026-06-28 entry.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary — this phase *reduces* the surface.** The portal makes no new outbound call and holds **no** revalidation secret; `SANITY_REVALIDATE_SECRET` lives only on each client site and in that client's Sanity webhook config, never in the portal or this repo. The §5 write/upload isolation gate is unaffected (no new outbound call was added), the `server-only` guards across `lib/registry` and `lib/sanity` are unchanged, and the cross-tenant isolation test remains green (130/130). There is no new token-handling or authorize-on-mutation surface in B.07.
- **Per-client enablement is M.01, not done here.** Until a client's Sanity publish webhook is configured (and that client site has its `/api/revalidate` receiver + `SANITY_REVALIDATE_SECRET`), a portal publish still **succeeds** but that client's live site will not refresh. The runbook's status table records the starting point: Sunset already has the receiver + secret; Vertex and Dalibor are "to confirm." Dalibor's site repo is still pending (its `/api/revalidate` may need to be added in that repo — cross-repo work outside this project).
- **The portal cannot confirm a refresh.** There is no response for the portal to read, so the editor's existing "Published — your live site will update shortly." copy is deliberately the honest message (not "instant" or "confirmed"). The live publish → live-site round-trip proof is **M.02**.
- **Branch/merge order (unchanged caveat).** The B.02–B.06 PRs are still open against `main`; B.07 continues the stack on the head of `b06-image-upload`. Confirm the PR base when opening the B.07 PR (base on the open B.06 branch unless B.06 has merged by then).
- **AI review** (CodeRabbit/Codex) remains an owner one-time step; recommended before merge, though B.07 is docs-only and low-risk.

## 8. What's now possible that wasn't before

The team can onboard each client's live-site refresh from a single authoritative runbook — and the portal does it while holding one *fewer* secret per client than the original plan assumed.
