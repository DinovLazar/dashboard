# File Map — Dashboard (Vertex client blog portal)

Where things live. **Build status: auth + registry + secure per-tenant Sanity read AND write path + featured-image upload — the config-driven editor, now accessibility-polished with offline axe tests (Phase B.08 complete; B.07 publish-refresh decision is docs-only).** Real paths below; every phase updates this file as files land.

## Repo root

- `README.md` — project overview + folder guide
- `CLAUDE.md` — imports `@AGENTS.md` + the implementation standard + the security override rule
- `AGENTS.md` — agent operating rules + the security boundary (paths point at `src/_project-state/`)
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`)
- `.env.local.example` — value-free template: browser-safe Supabase vars (B.02) + the two server-only secrets and the verify-script test creds (B.03); copy to `.env.local` (gitignored) and fill in
- `package.json`, `tsconfig.json`, `next.config.ts`, `components.json`, `postcss.config.mjs`, `eslint.config.mjs` — config (B.01); `package.json` gains `test`/`seed`/`verify` scripts + `vitest`/`tsx`/`server-only` (B.03); **B.04** adds `@sanity/client` `7.22.1` (exact); **B.06** is the first `next.config.ts` change since B.01 (image `remotePatterns` for `cdn.sanity.io` + `experimental.serverActions.bodySizeLimit: '5mb'`) — no new deps; **B.08** adds **dev-only** a11y test deps, pinned exact (`jsdom` `29.1.1`, `@testing-library/react` `16.3.2`, `@testing-library/dom` `10.4.1`, `@testing-library/user-event` `14.6.1`, `jest-axe` `10.0.0`, `@types/jest-axe` `3.5.9`) — **no runtime dep, no env var, no `next.config.ts` change**
- `vitest.config.ts` — **B.03** Vitest config (Node env; aliases `server-only`/`client-only` → the no-op stub); **B.04** also aliases `@` → `./src` so the cross-importing `@/lib/...` modules resolve under Vitest; **B.08** splits into two projects sharing those aliases — **unit** (`*.test.ts`, Node) and **a11y** (`*.test.tsx`, jsdom + `test/setup/a11y-setup.ts`)
- `.claude/launch.json` — local preview server config (dev + prod)
- `docs/`, `briefs/`, `reports/`, `status/` — standard Vertex repo folders (B.01)
- `scripts/`, `supabase/`, `test/` — **B.03** (see their own sections below)

## src/  (Next.js root level)

- `proxy.ts` — **B.02** Next.js 16 proxy (renamed successor to `middleware.ts`): refreshes the Supabase session on every matched request + defense-in-depth redirect of unauthenticated requests; matcher excludes static assets

## docs/

- `README.md` — knowledge-base guide
- `runbooks/ai-review-setup.md` — CodeRabbit + Codex setup (owner one-time step)
- `runbooks/registry-apply.md` — **B.03** operator runbook: apply the schema SQL, create/confirm the test user, fill `.env.local`, run seed + verify
- `runbooks/live-site-revalidation.md` — **B.07** operator runbook: how a publish refreshes the client's live site (Sanity → site webhook, no portal call), each client site's `/api/revalidate` + `SANITY_REVALIDATE_SECRET` precondition, the once-per-client manage.sanity.io webhook setup (draft-excluding GROQ filter + projection), verification steps, per-client status table
- `architecture/`, `workflows/`, `integrations/` — `.gitkeep` placeholders for later phases

## briefs/ · reports/ · status/

- `briefs/README.md` + `_templates/brief-template.md` — phase-prompt home
- `reports/README.md` + `_templates/completion-report-template.md` — points at `src/_project-state/completions/` (the canonical report home)
- `status/README.md` + `STATUS.md` — high-level phase ledger pointing at `current-state.md`

## scripts/  (B.03 — operator one-off scripts, run with tsx)

- `tsconfig.json` — tsx config: extends root, aliases `server-only`/`client-only` → the no-op stub
- `test-fixtures.ts` — shared throwaway fixtures: `DUMMY_TOKEN` (a literal fake) + the test client config. **No real secret.**
- `seed-test-client.ts` — service-role seed of one throwaway client + its encrypted dummy token + the user→client mapping; idempotent (reuses an existing mapping); reads the test user UUID from a CLI arg / `TEST_USER_ID`
- `verify-registry.ts` — signs in as the test user (publishable key) and asserts RLS isolation (clients=1, client_users=1, client_secrets=0), then confirms the service-role can decrypt the seeded dummy token

## supabase/  (B.03 — not a repo runtime path; applied to the Supabase project)

- `migrations/20260627120000_registry.sql` — the registry schema: `clients`, `client_users`, `client_secrets` + RLS + the deny-all lockdown on `client_secrets`

## test/  (B.03, extended B.08)

- `setup/server-guard-stub.ts` — no-op stand-in for the `server-only`/`client-only` marker packages, used only by Vitest + the tsx scripts (never the real Next build)
- `setup/a11y-setup.ts` — **B.08** setup for the jsdom **a11y** Vitest project only: registers jest-axe's `toHaveNoViolations` on Vitest's `expect`, RTL `cleanup` after each test, and inert stand-ins for the browser APIs base-ui's dialog touches (`matchMedia`/`ResizeObserver`/`IntersectionObserver`/`scrollIntoView`) + a null `<canvas>` 2D context to silence axe's contrast probe
- `setup/vitest-axe.d.ts` — **B.08** TypeScript augmentation teaching Vitest's `Assertion` the `toHaveNoViolations` matcher (`@types/jest-axe` only augments Jest)

## src/_project-state/  (canonical project memory)

- `README.md` — folder guide + session rules
- `current-state.md` — full snapshot (read first)
- `file-map.md` — this file
- `00_stack-and-config.md` — pinned versions, config, env inventory
- `dashboard-Project-Instructions.md`, `dashboard-Plan.md`, `dashboard-Phase-Plan.md`, `dashboard-Decisions.md`, `dashboard-Notion-Checklist.md` — planning docs
- `completions/` — one report per phase
  - `Part-X-Phase-YY-Completion.md` — the template
  - `Part-B-Phase-01-Completion.md` — B.01 report
  - `Part-B-Phase-02-Completion.md` — **B.02** report
  - `Part-B-Phase-03-Completion.md` — **B.03** report
  - `Part-B-Phase-04-Completion.md` — **B.04** report
  - `Part-B-Phase-05-Completion.md` — **B.05** report
  - `Part-B-Phase-06-Completion.md` — **B.06** report
  - `Part-B-Phase-07-Completion.md` — **B.07** report
  - `Part-B-Phase-08-Completion.md` — **B.08** report

## src/app/  (Next.js App Router)

- `layout.tsx` — root layout: `next/font` (Archivo + Source Serif 4), metadata, dark `<html>`, `<body>`
- `globals.css` — Vertex brand tokens + shadcn `base-nova` bridge + base layer + brand utilities; **B.08:** `--muted-foreground` 45%→58% and `--destructive` 60%→66% (lightness-only AA-contrast fixes, same grayscale/hue), a `prefers-reduced-motion` block, and a `.skip-link` utility
- `page.tsx` — `/` → redirects to `/login`
- `icon.svg` — favicon (the Vertex "V" mark)
- `(auth)/login/page.tsx` — branded login (Server Component): redirects already-authed users to `/posts`, else renders `<LoginForm />` (**B.02**)
- `(auth)/login/login-form.tsx` — **B.02** `'use client'` form: `useActionState(signIn)`, inline generic error, pending state, controlled email; **B.08** the error is linked to both inputs via `aria-describedby`
- `(auth)/login/login-form.test.tsx` — **B.08** offline axe + label assertions (mocks `./actions`)
- `(auth)/login/actions.ts` — **B.02** `'use server'` `signIn` action (`signInWithPassword`; generic error; redirect to `/posts` on success)
- `(portal)/layout.tsx` — authenticated-portal shell; **B.02 authoritative gate** (`getClaims()` → redirect anon to `/login`) + `export const dynamic = 'force-dynamic'`; **B.04:** top-bar label = resolved client label (best-effort via the `cache()`d `resolveTenant`, email fallback); **B.08:** adds the skip-to-main link as the first focusable element + `<main id="main-content" tabIndex={-1}>`
- `(portal)/actions.ts` — **B.02** `'use server'` `signOut` action (`signOut()` + redirect to `/login`)
- `(portal)/posts/page.tsx` — **B.04** the per-tenant read path: resolves the tenant → `listPosts` → renders the client label + populated list, or the empty / not-linked / not-ready / read-error states. Computes a render-state object inside try/catch, renders JSX outside it (error-boundaries lint rule). **B.05:** both "New post" buttons are now links to `/posts/new`. **B.08:** the friendly states now render through the shared `MessageCard`; "New post" CTAs are ≥44px tall on mobile (`h-11 sm:h-9`)
- `(portal)/posts/loading.tsx` — **B.08** route loading UI (`<LoadingState label="Loading your posts…">`)
- `(portal)/posts/new/loading.tsx` — **B.08** route loading UI (`Loading the editor…`)
- `(portal)/posts/[id]/loading.tsx` — **B.08** route loading UI (`Loading this post…`)
- `(portal)/posts/actions.ts` — **B.05** `'use server'` mutating actions (`createPostAction` / `saveDraftAction` / `publishPostAction` / `deletePostAction`). Each **re-resolves the tenant** (`resolveTenant()`) — re-auth + re-authorize on every POST — parses per-locale fields from `FormData`, dispatches the matching `mutations.ts` function, `revalidatePath`s, and returns a generic non-leaking result or `redirect`s. `redirect()` is always outside the try/catch. **B.06** adds `uploadImageAction` (re-resolves → `uploadImage`, returns `ImageUploadState` with a friendly/non-leaking error) and the image tri-state in `parseFields` (hidden `image` vs `imageOriginal`; malformed asset id fails generically)
- `(portal)/posts/new/page.tsx` — **B.05** create-mode editor page (Server Component): resolves the tenant for its config (labels/locales) → renders `<PostEditor mode="create">`; resolution failure → friendly not-linked / not-ready notice. **B.06** `emptyInitial` includes `image: { assetId: null, url: null }`
- `(portal)/posts/[id]/page.tsx` — **B.05** edit-mode editor page (Server Component): `getPost(tenant, id)` → `<PostEditor mode="edit">` with the post's per-locale values + status; null → friendly not-found; read failure → friendly error. `params` is awaited (Next 16 async params). **B.06** passes `initial.image = detail.image`

## src/components/

- `ui/` — shadcn `base-nova` primitives: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`; **B.08** `alert-dialog.tsx` (`'use client'`; wraps `@base-ui/react` Alert Dialog → `role="alertdialog"` + `aria-modal`, focus trap, Escape-to-close, return-focus-to-trigger; imports only `@base-ui/react/alert-dialog` + `cn` — no server module)
- `portal/` — shell pieces: `wordmark.tsx`, `portal-sidebar.tsx`, `portal-topbar.tsx` (**B.02:** sign-out wired to the `signOut` Server Action; `initialsFor` handles email labels; **B.08:** removed the misleading non-interactive account chevron), `portal-nav.tsx`; **B.04** `posts-list.tsx` — presentational post list (Server Component; takes only `PostSummary[]` — never the tenant/token; title + draft/published badge with an "edited" hint + relative last-updated time; **B.08:** dropped the `/70` alpha on the "· Edited" hint for AA contrast) + **B.08** `posts-list.test.tsx` (offline axe, populated + empty + `LoadingState`); **B.05:** each row is now a `Link` to `/posts/[id]`; **B.08** `message-card.tsx` — the **shared** friendly-state card (icon + title + body, `headingLevel` 1|2) used by both the posts page states and `editor-message.tsx`; **B.08** `loading-state.tsx` — the branded `role="status"` loading skeleton used by the route `loading.tsx` boundaries
- `editor/` — **B.05/B.06/B.08** the config-driven editor:
  - `post-editor.tsx` — `'use client'` form: per-locale headline/summary/body + slug, locale tabs when multi-locale, Save-draft / Publish (shared form via `formAction`) + Delete-with-confirm. Uses `useActionState`; receives **only** serializable non-secret props (locales + per-locale values + status + image asset id/URL) — never the tenant/token; imports the Server Actions directly. **B.06** the `FeaturedImageField` control: pick → upload (own `useTransition` → `uploadImageAction`) → `next/image` preview → Remove/Replace; the file input is unnamed (bytes never ride with Save/Publish); hidden `image`/`imageOriginal` inputs carry the intent into the main form. **B.08** accessibility polish: a WAI-ARIA `LocaleTabs` (roving tabindex + arrow-key nav + `aria-controls`, panels stay mounted), `lang` on non-UI-language fields, visible pending verbs ("Saving…/Publishing…/Deleting…") + `aria-busy` + an `sr-only` `role="status"` region, the delete-confirm rebuilt on the `AlertDialog` primitive, ≥44px mobile tap targets (`h-11 sm:h-9`), and a focus ring on the "Back to posts" link
  - `post-editor.test.tsx` — **B.08** offline axe (create / edit / multi-locale / with-image / no-image) + semantics (one h1, labels, `lang`, named icon buttons) + keyboard (tab roving, delete-dialog Escape + focus return); mocks `@/app/(portal)/posts/actions` + `next/image`
  - `editor-message.tsx` — presentational Server Component for the editor pages' friendly not-linked / not-ready / not-found / read-error states (with a "Back to posts" link); never receives a tenant/token/raw error; **B.08** renders through the shared `MessageCard` (heading level 1 — it *is* the page) and gives the back link a focus ring
  - `editor-message.test.tsx` — **B.08** offline axe + heading-level assertions for `EditorMessage` (h1) and `MessageCard` (h2)

## src/lib/

- `utils.ts` — `cn()` (clsx + tailwind-merge).
- `supabase/` — server-side Supabase modules:
  - `env.ts` — **B.02** `requireEnv()` reader for the two browser-safe `NEXT_PUBLIC_*` vars (clear error if unset; statically inlined)
  - `client.ts` — **B.02** `createClient()` browser client (`createBrowserClient`)
  - `server.ts` — **B.02** `createClient()` server client (`createServerClient` + `cookies()` getAll/setAll)
  - `middleware.ts` — **B.02** `updateSession()` session-refresh helper used by `proxy.ts`
  - `admin.ts` — **B.03** `createAdminClient()` service-role client (`import 'server-only'`; bypasses RLS; `persistSession:false`, `autoRefreshToken:false`) — reads `client_secrets`; never imported by a client component
- `crypto/` — **B.03**:
  - `tokens.ts` — `import 'server-only'`; AES-256-GCM `encryptToken` / `decryptToken` (12-byte IV, 32-byte key from `SANITY_TOKEN_ENC_KEY`)
  - `tokens.test.ts` — Vitest unit tests (round-trip, tamper-throws, wrong-key-throws, unique-IV, key validation)
- `registry/` — **B.04** the tenant resolver (the ownership check):
  - `types.ts` — `import 'server-only'`; `TenantConfig` (camelCase mirror of a `clients` row) + `TenantContext` (`{ config, token }`; the `token` doc-comment forbids serializing it to the browser)
  - `resolve-tenant.ts` — `import 'server-only'`; `resolveTenantWith(deps)` pure core (fails closed: `unauthenticated`/`no-client`/`config-missing`/`secret-missing`) + `cache()`d `resolveTenant` wiring the real session/RLS/service-role/decrypt seams; `TenantResolutionError`; `mapRowToConfig`; the `RegistrySource`/`ResolveDeps`/`ClientRow` seam types
  - `isolation.test.ts` — **the load-bearing** offline cross-tenant isolation test (A→A/B→B, built-with-owner's-project+token, no caller override, secret keyed to owner, fail-closed paths)
- `sanity/` — **B.04/B.05/B.06** the per-tenant Sanity bridge (read + write + image upload):
  - `client.ts` — `import 'server-only'`; `SANITY_API_VERSION` (`'2026-03-01'`) + `createTenantSanityClient(config, token)` (`@sanity/client`; `useCdn:false`, `perspective:'raw'`; throws on empty token)
  - `posts.ts` — `import 'server-only'`; **B.04** `PostSummary`, `SanityReader` (injectable transport), `listPosts(tenant, makeClient?)` (raw-variant reduce → one row per logical post), `displayValue`; **B.05** `getPost(tenant, id, makeClient?)` + `PostDetail` (single-post load: draft-preferred reduce, per-locale field values, `bodyEditable`, id-normalized); **B.06** `PostDetail.image = { assetId, url }` surfaced via `asStringOrNull` (list unchanged)
  - `posts.test.ts` — offline reduce tests + **B.05** `getPost` tests (draft preference, per-locale, `bodyEditable`, normalization, not-found); **B.06** image-surfacing tests
  - `mutations.ts` — **B.05** `import 'server-only'`; the **only** write site: `createDraft` / `saveDraft` / `publishPost` / `deletePost` + the injectable `SanityWriter` / `WriteTransaction` / `MakeWriter` seam, `EditorFields`. Draft-id model; read-modify-write overlay; atomic publish/delete transactions; token never returned/logged; **B.06** `EditorFields.image` (tri-state) + `applyImageIntent` (preserve / write reference / actively delete on clear)
  - `mutations.test.ts` — **B.05** offline dispatch-shape tests (drafts.<id> target, non-essential preservation, publish/delete transactions, no token leak); **B.06** image set/clear/preserve tests
  - `assets.ts` — **B.06** `import 'server-only'`; the **only** image-upload site: `uploadImage(tenant, file, makeUploader?)` (validate 4 MB + JPG/PNG/WebP/GIF allowlist → `Buffer` → per-tenant `assets.upload`), `ImageUploadError`/`ImageUploadReason`, the injectable `AssetUploader`/`MakeUploader` seam, `isValidAssetId`; returns `{ assetId, url }`, token never returned/logged
  - `assets.test.ts` — **B.06** offline validation + dispatch-shape + no-token-leak + `isValidAssetId` tests
  - `doc-id.ts` — **B.05** NOT `server-only` (pure, no secret): `normalizePostId` (strip `drafts.`/`versions.` prefixes, reject non-plain ids) / `isValidDocId` / `draftId` — single source of truth for id sanitization
  - `doc-id.test.ts` — **B.05** offline id-sanitization tests (prefix stripping, injection/path rejection)
- `config/` — **B.04/B.05** field-map + locale + Portable Text helpers (NOT `server-only` — pure logic, no secret):
  - `field-map.ts` — `assertSafeFieldPath` (GROQ-injection guard) + `buildPostListQuery` (`$type` bound); **B.05** `buildPostByIdQuery` (`$id`/`$draftId` bound, projects body), `assertWritableFieldPaths` (validates mutation keys), `slugContainerField` (derives the slug container); **B.06** `buildPostByIdQuery` also projects the image (`imageAssetId`/`imageUrl`), `assertWritableFieldPaths` also validates the image key
  - `field-map.test.ts` — guard + query tests; **B.05** `buildPostByIdQuery` params, write-key validation, slug-container; **B.06** image projection + image write-key validation
  - `localize.ts` — **B.05** `toFieldValue` / `fromFieldValue` / `fromLocalizedRaw` + `localeList` / `primaryLocale` / `isMultiLocale` (single-locale plain value ⇄ multi-locale `{ [locale]: value }`; multi-locale storage shape provisional → M.01)
  - `localize.test.ts` — **B.05** single- vs multi-locale round-trip tests
  - `portable-text.ts` — **B.05** `textToPortableText` / `portableTextToText` / `isEditableBody` (plain text ⇄ minimal Portable Text; the data-loss guard — rich bodies flagged read-only)
  - `portable-text.test.ts` — **B.05** round-trip + rich-content-rejection tests

## Planned (not yet created)

- `src/app/api/*` — server route handlers, **if/when needed** (mutations + the B.06 image upload landed as Server Actions in `posts/actions.ts` — not route handlers; none needed so far)
- ~~`revalidate_url` call on publish~~ — **settled in B.07: the portal sends nothing on publish** (live-site refresh is delegated to each client's Sanity → site webhook; `revalidateUrl` is retained-but-unused). See `docs/runbooks/live-site-revalidation.md` and the 2026-06-28 Decisions entry. Per-client webhook enablement is **M.01**.
