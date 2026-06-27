# Part B · Phase 06 · Code — Completion Report

**Date:** 2026-06-28 · **Outcome (one line):** Clients can now add a featured image to a post — they pick an image in the editor, it uploads server-side into their own Sanity project through the same locked per-tenant token path as every other write, and it attaches to the post; an already-attached image is shown when editing.

---

## 1. What shipped (plain language)

The editor's featured-image field is no longer a placeholder. A logged-in client can choose an image (JPG, PNG, WebP, or GIF, up to 4 MB), see it upload and preview, and Remove or Replace it. When they Save or Publish, the image is attached to the post. Re-opening a post that already has an image shows it. The upload is validated and runs entirely on the server through that one client's own Sanity project and token — the token never touches the browser — and the automated safety test that proves one client can never reach another client's project now also covers image uploads and image writes.

## 2. Definition of Done

- ✅ **`npm run build` passes; `npm run test` passes (105 prior + new).** — evidence: `npm run build` → "✓ Compiled successfully", "Finished TypeScript", all routes emitted. `npm run test` → **Test Files 9 passed (9), Tests 130 passed (130)** (was 105).
- ✅ **`npm run lint` passes.** — evidence: `eslint` exits clean (0 problems). (A first pass tripped `react-hooks/set-state-in-effect`; the upload was refactored from `useActionState`+`useEffect` to `useTransition`, which is lint-clean — see §3.)
- ✅ **No `'use client'` file imports any token/resolver/mutation/Sanity module; `assets.ts` is `server-only` and only reached server-side; no secret value in the diff.** — evidence: `head -1 src/lib/sanity/assets.ts` → `import 'server-only'`. The only `'use client'` code files are `login-form.tsx`, `label.tsx`, `post-editor.tsx`; grep shows none import a `@/lib/(sanity|registry|crypto)` / `resolve-tenant` / `admin` module (the editor reaches the upload only through the `'use server'` `uploadImageAction`). `grep` for importers of `lib/sanity/assets` → only `actions.ts` (a `'use server'` module) and `isolation.test.ts`. A diff scan for secret-shaped strings (`sk-`, long base64/hex) returned nothing.
- ✅ **`src/lib/sanity/assets.ts` exists, is `server-only`, uploads via the per-tenant client, converts `File` → `Buffer`, validates 4 MB + the allowlist, returns `{ assetId, url }` without leaking the token.** — evidence: the module + `assets.test.ts` (validation rejects empty/oversize/bad-type before any uploader is built; accepts each allowed type; dispatch carries the owner's project+token, `type: 'image'`, the converted bytes, and `{ filename, contentType }`; the result never contains the token).
- ✅ **`uploadImageAction` re-resolves the tenant and returns a non-leaking `ImageUploadState`; oversize/unsupported get specific friendly messages; all else generic.** — evidence: `actions.ts` → `uploadImageAction` calls `resolveTenant()` then `uploadImage`; `friendlyImageError` maps `too-large`/`unsupported-type`/`empty`; any other throw → `IMAGE_GENERIC_ERROR`. The token/project id/raw error are never placed on the returned state.
- ✅ **In the editor: select → upload → preview → Remove, with the chosen image carried into Save and Publish.** — evidence: `post-editor.tsx` → `FeaturedImageField` (file picker, `useTransition` upload, `next/image` preview from the `cdn.sanity.io` URL, Remove/Replace) + hidden `image`/`imageOriginal` inputs inside the main form. (Live click-through is M.02 — see the note at the end of this section.)
- ✅ **Saving/publishing writes the image reference onto `config.fieldMap.image`; an unchanged image is preserved; a removed image is absent from the written doc.** — evidence: `mutations.ts` → `applyImageIntent` (write reference / preserve on omit / `delete` the field on clear); `mutations.test.ts` cases: "writes the image reference when set", "drops the image field entirely when cleared", "preserves the stored image when omitted".
- ✅ **The edit form shows an already-attached image (read path surfaces `image.assetId` + `image.url`).** — evidence: `field-map.ts` `buildPostByIdQuery` projects `imageAssetId`/`imageUrl`; `posts.ts` `getPost` populates `PostDetail.image`; `posts.test.ts` "surfaces an already-attached featured image" + "reports nulls for a post with no image". `[id]/page.tsx` passes `initial.image = detail.image`.
- ✅ **`next.config.ts` allows `cdn.sanity.io` images and raises the Server Action body-size limit; values confirmed against in-repo docs.** — evidence: `next.config.ts` has `images.remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]` and `experimental.serverActions.bodySizeLimit: '5mb'`; both checked against `node_modules/next/dist/docs/.../05-config/01-next-config-js/images.md` (image component `remotePatterns`) and `.../serverActions.md` (Next 16.2.3). The build prints the expected "Experiments: serverActions" notice.
- ✅ **The isolation test now proves the image upload + image write dispatch only through the owner's project + token, take no caller-supplied project/token, and are denied for an unmapped/null session.** — evidence: `isolation.test.ts` new block "B.06 image upload + image write (the §5 gate)": recording-uploader seam (A→A / B→B, built-with + dispatched-through owner only), "the image reference is written only through the owner's per-tenant writer", "takes no caller-supplied client/project/token", and "fail closed before any upload" (unmapped → `no-client`, null → `unauthenticated`, before any uploader built or secret read).
- ✅ **The post list is unchanged (no image); the image is not localized.** — evidence: `buildPostListQuery` / `PostSummary` / `listPosts` / `posts-list.tsx` untouched; the image is a single `EditorFields.image` written as one flat field, never routed through the per-locale helpers.
- ✅ **State files updated and the completion report filed.** — evidence: `current-state.md`, `file-map.md`, `00_stack-and-config.md` updated (see §6); this report; the Decisions log got the mandated featured-image entry + a B.06 implementation-choices entry.

**Note on live verification (as in B.04/B.05):** the B.03 test client points at a placeholder Sanity project and no `.env.local`/Supabase is reachable by the agent, so a *live* upload against a real dataset (and a signed-in click-through of the editor) is **M.02**, not this phase. The authoritative B.06 proof is the offline upload/write-isolation + unit tests (130 green) plus a clean build/lint. A real image attaching to a real post end-to-end is verified per real client in M.02.

## 3. Decisions I made during this phase

Logged in `dashboard-Decisions.md` under "2026-06-27 — Featured image: single, non-localized, 4 MB cap, server-side upload only" (the mandated entry) and "2026-06-27 — B.06 implementation choices". In short:

- **Submitted asset id validated against the canonical Sanity shape** (`isValidAssetId`, `^image-<hash>-<w>x<h>-<ext>$`, 200-char bound) before it is trusted as a `_ref`; a malformed id fails generically. · Alternative rejected: trust the hidden field as-is (it's written as data, but garbage shouldn't reach the document).
- **Editor upload uses `useTransition` + a direct action call, not `useActionState`.** · Why: adopting the `useActionState` result into local state for the preview required a `useEffect` `setState`, which trips Next 16's `react-hooks/set-state-in-effect` rule. `useTransition` runs the `setState` in an event-driven callback — lint-clean, same UX. · The brief explicitly allowed either.
- **Image intent applied in a dedicated `applyImageIntent` on the final document** (separate from `buildEssentials`), because a CLEAR must actively `delete` the field — `createOrReplace` replaces the whole doc and the read-modify-write base carries the old image. The image field name is re-validated there for defense in depth on top of `assertWritableFieldPaths`.
- **The file `<input>` is unnamed** so its bytes are never serialized into the editor form (a Save never re-uploads); only the asset id rides along via hidden inputs.
- **4 MB cap is inclusive; read path coerces projected values to `string | null`.**

These refine the locked decisions; none reverse one.

## 4. Deviations from the brief / spec

None material. The brief offered `useActionState` *or* `useTransition` for the upload; I used `useTransition` (reason in §3). Everything else followed the task list (upload module → read path → write path → actions → editor UI → `next.config.ts` → isolation test → unit tests → close-out).

## 5. Changed files / deliverables

- **New code:** `src/lib/sanity/assets.ts` (server-only upload module), `src/lib/sanity/assets.test.ts`.
- **Edited code:** `src/lib/config/field-map.ts` (image projection + write-key validation), `src/lib/sanity/posts.ts` (`PostDetail.image` + read), `src/lib/sanity/mutations.ts` (`EditorFields.image` + `applyImageIntent`), `src/app/(portal)/posts/actions.ts` (`uploadImageAction` + image tri-state in `parseFields`), `src/components/editor/post-editor.tsx` (`FeaturedImageField` + hidden inputs), `src/app/(portal)/posts/[id]/page.tsx` + `src/app/(portal)/posts/new/page.tsx` (pass `image`), `next.config.ts` (image `remotePatterns` + `serverActions.bodySizeLimit`).
- **Edited tests:** `mutations.test.ts`, `field-map.test.ts`, `posts.test.ts`, `isolation.test.ts`.
- **Docs:** this report; `dashboard-Decisions.md` (2 entries); `current-state.md`, `file-map.md`, `00_stack-and-config.md`.
- **Branch/PR:** branch `b06-image-upload` off the head of `b05-editor`; PR to be opened against the open **B.05** branch (not `main`) unless B.05 has merged — confirm the base when opening it.
- **Secrets:** none added; no token/key/value appears anywhere in the diff or this report. The Sanity Editor token (the upload's only credential) lives server-side in the registry, exactly as before.

## 6. State updates done

The live state files now match reality:
- `current-state.md` — B.06 moved out of "NOT built yet"; one-line status, a "New in B.06" subsection, security posture (write + image-upload), data-loss/injection guards, stack/routes/risks, and "Next phase" (B.07) all updated; test count 130.
- `file-map.md` — added `src/lib/sanity/assets.ts` (+ test); noted the B.06 edits to `field-map.ts`/`posts.ts`/`mutations.ts`/`actions.ts`/`post-editor.tsx`/pages/`next.config.ts`; "Planned" list updated; completions list completed (added B.02, B.05, B.06).
- `00_stack-and-config.md` — status line + test count; the `next.config.ts` entry; a new "Per-tenant featured-image upload (B.06)" section. No new dependencies, no new env vars.

## 7. Risks, follow-ups, what the next phase needs to know

- **Security boundary (explicit flag): the upload now goes through the per-tenant token path, and the §5 isolation gate was extended to cover it.** Image bytes flow only through the session owner's project + token, validated server-side; the asset id is shape-checked before it is written as a `_ref`; the token/project id/raw error never reach the `ImageUploadState`. No browser-exposed token was introduced — a browser-direct upload (which would require one) is explicitly out of scope (Decisions 2026-06-27). Keep the `server-only` guards and re-run `isolation.test.ts` as the surface grows.
- **Size limits are two-layered:** the app rejects > 4 MB with a friendly message (server-side, before upload); Vercel's Function request-body ceiling (~4.5 MB, unraisable) is the hard physical limit and only bites in production. `bodySizeLimit: '5mb'` sits between them so the app's friendly check wins within budget. If a client needs larger images, that's a future browser-direct design — and a token-handling decision — not a config bump.
- **`experimental.serverActions` is now enabled** (for `bodySizeLimit` only). The build prints "Experiments (use with caution): serverActions" — expected; it configures the stable-since-14 Server Actions feature, not an unstable one.
- **Live end-to-end is M.02.** No real Sanity project/token is wired; a real upload→attach→render round-trip per real client is verified there. The provisional multi-locale storage shape (B.05) is unaffected — the image is a single non-localized field.
- **Branch/merge order** unchanged from prior phases: B.02–B.05 PRs are still open; base the B.06 PR on the open B.05 branch.
- **AI review** (CodeRabbit/Codex) remains an owner one-time step; recommended before this image-write phase merges.

## 8. What's now possible that wasn't before

A client can attach a real featured image to a post — uploaded into their own Sanity project through the same airtight per-tenant path as every other edit — which is the last essential editor field; B.07 (publish → live-site refresh) is the next step to make those edits appear on the client's public website.
