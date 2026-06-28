# Stack and Configuration

The real, verified stack for the Vertex Consulting client blog portal as of **Phase B.06** (2026-06-28). Append changes as they land; keep it factual.

**Build status: building clean with auth + the registry data layer + the secure per-tenant Sanity read AND write path + featured-image upload (the config-driven editor).** `npm run build` passes (the `server-only` guard holds), `npm run lint` is clean, and `npm test` is green (**130 tests**: 10 crypto + the B.04 read-path suites + the B.05 write path + the B.06 image-upload suite — upload validation/dispatch + image set/clear/preserve + image projection + `getPost` image surfacing, and the cross-tenant isolation test now extended to the image upload + image write). The Supabase registry schema (three tables + RLS) lives in `supabase/migrations/`; the encrypted-token crypto module, the service-role client, the tenant resolver, the per-tenant Sanity read path, the **mutation module** (`src/lib/sanity/mutations.ts`), the **image-upload module** (`src/lib/sanity/assets.ts`), and the **Server Actions** (`src/app/(portal)/posts/actions.ts`) are in place. `/login`, `/posts`, `/posts/new`, and `/posts/[id]` are dynamic (`ƒ`), and the proxy is active. **B.06 added no new dependencies and no new environment variables; it made the first `next.config.ts` change since B.01** (image `remotePatterns` + `serverActions.bodySizeLimit`).

## Framework and runtime

- **Next.js 16.2.3** (App Router, Turbopack build)
- **React 19.2.4** / **react-dom 19.2.4**
- **TypeScript ^5** (strict)
- **Node:** built and verified on Node 26.x locally and on Vercel (Next 16 requires Node ≥ 20.9). B.03 scripts use `process.loadEnvFile` (Node ≥ 20.12). No `.nvmrc` pinned yet.
- **Hosting:** Vercel — project `dinovlazars-projects/dashboard` (preview for B.01; custom subdomain comes in Bucket P).

## Dependencies (production) — actual

| Package | Version (package.json) | Why |
|---|---|---|
| `next` | `16.2.3` | framework |
| `react` / `react-dom` | `19.2.4` | runtime |
| `shadcn` | `^4.2.0` | ships `shadcn/tailwind.css` (custom variants) + the `base-nova` CLI |
| `@base-ui/react` | `^1.6.0` | required peer of the `base-nova` primitives (Button/Input) — added during `shadcn add` |
| `class-variance-authority` | `^0.7.1` | variant styling for primitives |
| `clsx` | `^2.1.1` | className composition (`cn`) |
| `tailwind-merge` | `^3.5.0` | className merge (`cn`) |
| `tw-animate-css` | `^1.4.0` | animation utilities (imported in `globals.css`) |
| `lucide-react` | `^1.8.0` | icon set (`base-nova` icon library) |
| `@supabase/ssr` | `0.12.0` (exact) | **B.02** — server-side auth for Next.js App Router (browser/server/proxy clients, cookie-based sessions) |
| `@supabase/supabase-js` | `2.108.2` (exact) | **B.02** — Supabase JS client (`@supabase/ssr` peer); also used by the **B.03** service-role client + verify script |
| `server-only` | `0.0.1` (exact) | **B.03** — marker package: makes `import 'server-only'` in `admin.ts` / `tokens.ts` / the B.04 `lib/registry` + `lib/sanity` modules a build error if ever pulled into a client bundle (the version Next itself uses) |
| `@sanity/client` | `7.22.1` (exact) | **B.04** — the per-tenant Sanity client, built server-side per request from the resolved client's projectId + decrypted Editor token. `next-sanity` deliberately NOT added (see Decision 2026-06-27) |

All versions mirror the Vertex marketing site exactly, except `@base-ui/react` (Vertex pins `^1.4.0`; npm resolved `^1.6.0` here — compatible, satisfies Vertex's range). The `@supabase/*`, `server-only`, and `@sanity/client` packages are pinned **exact** (no caret), matching the `next`/`react` pinning convention.

**Token encryption uses Node's built-in `node:crypto` (AES-256-GCM)** — no third-party crypto library is added. **Sanity API version is pinned in code**, not a dependency: `SANITY_API_VERSION = '2026-03-01'` in `src/lib/sanity/client.ts` (hard-coded date, never dynamic; must be ≥ 2025-02-19 for the `perspective: 'raw'` draft/published semantics the editor list needs). **Intentionally NOT added:** `next-sanity` (rejected for a multi-tenant server-only-token portal — see Decisions 2026-06-27), a portable-text editor (B.05), `resend` (optional). No 3D/animation libraries (the portal has no public marketing surface).

## Dependencies (dev) — actual

`@tailwindcss/postcss ^4`, `tailwindcss ^4`, `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19`, `eslint ^9`, `eslint-config-next 16.2.3`, `typescript ^5`, **`vitest 4.1.9` (exact)** — test runner (B.03; B.04+ require automated tests), **`tsx 4.22.4` (exact)** — runs the TypeScript seed/verify scripts.

## Scripts

- `dev` → `next dev` · `build` → `next build` · `start` → `next start` · `lint` → `eslint`
- `test` → `vitest run` · `test:watch` → `vitest` — **B.03**; Vitest is the project test runner (selected here, ahead of B.04).
- `seed:test-client` → `tsx --tsconfig scripts/tsconfig.json scripts/seed-test-client.ts` — **B.03** operator seed (pass the test user UUID: `npm run seed:test-client -- <uuid>`).
- `verify:registry` → `tsx --tsconfig scripts/tsconfig.json scripts/verify-registry.ts` — **B.03** operator verification of the "done when" condition.

## Config files (present after B.03)

- `tsconfig.json` — path alias `@/*` → `./src/*` (mirrors Vertex)
- `scripts/tsconfig.json` — **B.03** tsx config: extends root, aliases `server-only`/`client-only` → the no-op stub so the scripts run under plain Node (the real bundle keeps the genuine guard)
- `vitest.config.ts` — **B.03** Vitest config: Node environment, `src/**/*.test.ts`, aliases `server-only`/`client-only` → the no-op stub; **B.04** also aliases `@` → `./src` (mirrors the `@/*` tsconfig path) so the cross-importing read-path modules resolve in tests
- `test/setup/server-guard-stub.ts` — **B.03** no-op stand-in for the `server-only`/`client-only` marker packages (used only by Vitest + the tsx scripts, never the real build)
- `supabase/migrations/20260627120000_registry.sql` — **B.03** the registry schema + RLS (applied by the operator; see `docs/runbooks/registry-apply.md`)
- `src/proxy.ts` — **B.02** Next.js 16 proxy (renamed successor to `middleware.ts`): session refresh + auth redirect; `config.matcher` excludes `_next/static`, `_next/image`, and common static assets
- `.env.local.example` — value-free template; **B.03** added the two server-only secrets + the verify-script test creds (names/placeholders only; tracked via the `!.env.local.example` allowlist in `.gitignore`)
- `next.config.ts` — **B.06** (first change since B.01): `images.remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]` (lets `next/image` render Sanity-CDN featured-image previews; any other host → 400) + `experimental.serverActions.bodySizeLimit: '5mb'` (raises the Server Action request-body cap above the 4 MB app-level image cap; the Vercel Function 4.5 MB body ceiling remains the hard physical limit). No i18n. Both keys/shapes confirmed against this Next version's in-repo docs
- `postcss.config.mjs` — `@tailwindcss/postcss` only (Tailwind v4, CSS-first; **no `tailwind.config.js`**)
- `eslint.config.mjs` — flat config extending `eslint-config-next` core-web-vitals + typescript
- `components.json` — shadcn: style `base-nova`, base color `neutral`, CSS vars on, css `src/app/globals.css`, lucide icons, RSC on
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`, `.claude/worktrees/`)
- `.claude/launch.json` — local preview dev/prod server config (not deployment)

## Data model (B.03 — in Supabase, not a repo path)

Three tables in the portal's Supabase project, all with **Row-Level Security enabled**:

- `clients` — one row per client site: `id` (uuid pk), `label`, `sanity_project_id`, `dataset`, `blog_doc_type`, `field_map` (jsonb), `locales` (text[]), `revalidate_url`, `created_at`. RLS: a user may `SELECT` only the client(s) they are mapped to.
- `client_users` — `user_id` (uuid **primary key** → one client per user) references `auth.users`, `client_id` references `clients`, `created_at`. RLS: a user may `SELECT` only their own row.
- `client_secrets` — `client_id` (uuid pk) references `clients`, plus `token_ciphertext` / `token_iv` / `token_auth_tag` (base64 text), `created_at`. **Deny-all to browser sessions:** RLS on + no policy + `revoke all ... from anon, authenticated`. Only the service-role client (BYPASSRLS) reads/writes it.

**Token-at-rest encryption:** per-client Sanity tokens are encrypted with **AES-256-GCM** (`src/lib/crypto/tokens.ts`) before storage — only base64 ciphertext/iv/auth_tag land in `client_secrets`. The 32-byte key lives only in `SANITY_TOKEN_ENC_KEY` (server env), never in the DB, so a DB or service-role compromise alone cannot reveal a token.

## Per-tenant Sanity read path (B.04 — `server-only` modules)

The server-side bridge that turns a session into one client's posts. All modules except `config/field-map.ts` start with `import 'server-only'`; none is imported by any `'use client'` file (verified).

- `src/lib/registry/types.ts` — `TenantConfig` (camelCase mirror of a `clients` row) + `TenantContext` (`{ config, token }`).
- `src/lib/registry/resolve-tenant.ts` — `resolveTenantWith(deps)` (pure, fail-closed core) + `cache()`d `resolveTenant` (real wiring: `getClaims().sub` → RLS-scoped mapping/config reads → service-role secret read → `decryptToken`). `TenantResolutionError` carries `reason ∈ {unauthenticated, no-client, config-missing, secret-missing}`. **No caller-supplied client/project id is ever accepted.**
- `src/lib/sanity/client.ts` — `SANITY_API_VERSION='2026-03-01'` + `createTenantSanityClient(config, token)` (`useCdn:false`, `perspective:'raw'`).
- `src/lib/sanity/posts.ts` — `listPosts(tenant, makeClient?)` reduces `raw`-perspective variants → `PostSummary[]` (draft/published status, `hasUnpublishedEdits`, `versions.*` ignored, newest-first) + `displayValue`.
- `src/lib/config/field-map.ts` — `assertSafeFieldPath` (GROQ-injection guard) + `buildPostListQuery` (`$type` bound as a parameter). Pure logic, no secret.

The Sanity project id + token come entirely from the registry (never env); B.04 adds **no** new environment variables.

## Per-tenant Sanity write path (B.05 — `server-only` write site + pure helpers)

The editor writes through the same B.04 bridge — built per request from the session-resolved tenant's project + token.

- `src/lib/sanity/mutations.ts` (`server-only`) — `createDraft` / `saveDraft` / `publishPost` / `deletePost`, the only write site. Injectable `SanityWriter` / `WriteTransaction` / `MakeWriter` seam; draft-id model; read-modify-write overlay; atomic publish/delete transactions; `{ visibility: 'sync' }`; token never returned/logged.
- `src/lib/sanity/doc-id.ts` (pure, no secret) — `normalizePostId` / `isValidDocId` / `draftId`: the single source of truth for id sanitization (strips `drafts.`/`versions.` prefixes; rejects non-plain ids).
- `src/lib/config/localize.ts` (pure) — `toFieldValue` / `fromFieldValue` / `fromLocalizedRaw` (+ `localeList` / `primaryLocale` / `isMultiLocale`): single-locale plain value ⇄ multi-locale `{ [locale]: value }`. The exact multi-locale storage shape is provisional (confirmed per real client in M.01).
- `src/lib/config/portable-text.ts` (pure) — `textToPortableText` / `portableTextToText` / `isEditableBody`: plain text ⇄ minimal Portable Text + the rich-body data-loss guard.
- `src/lib/config/field-map.ts` (extended) — `buildPostByIdQuery` (`$id`/`$draftId` bound; projects body), `assertWritableFieldPaths`, `slugContainerField`.
- `src/app/(portal)/posts/actions.ts` (`'use server'`) — the four mutating actions; each re-resolves + re-authorizes; `revalidatePath` on success; generic non-leaking errors.

B.05 adds **no** new dependencies and **no** new environment variables (no portable-text editor library — the body is plain text ⇄ minimal Portable Text in app code; no `next-sanity`). The image field was inert until B.06.

## Per-tenant featured-image upload (B.06 — `server-only` upload site + editor control)

Featured-image bytes go to the client's own dataset through the same B.04 bridge — built per request from the session-resolved tenant's project + token, never a browser token.

- `src/lib/sanity/assets.ts` (`server-only`) — `uploadImage(tenant, file, makeUploader?)`, the only image-upload site. Validates **before** any byte is sent (empty / > 4 MB / type outside JPG-PNG-WebP-GIF → typed `ImageUploadError`), converts the web `File` → Node `Buffer` (avoids the sanity-io/client #135 "body must be a string/buffer/stream" throw), and uploads via the per-tenant client's `assets.upload('image', buffer, { filename, contentType })`. Injectable `MakeUploader`/`AssetUploader` seam (mirrors `MakeWriter`). Returns `{ assetId, url }`; the token is never returned/logged. Also exports `isValidAssetId` (canonical `image-<hash>-<w>x<h>-<ext>`, 200-char bound).
- `src/lib/sanity/mutations.ts` (extended) — `EditorFields.image` (tri-state) + `applyImageIntent`: preserve (omit) / write `{ _type:'image', asset:{ _type:'reference', _ref } }` / actively delete on clear. Applied to `createDraft` + `saveDraft`.
- `src/lib/config/field-map.ts` (extended) — `buildPostByIdQuery` also projects `imageAssetId`/`imageUrl`; `assertWritableFieldPaths` also validates the image key.
- `src/app/(portal)/posts/actions.ts` (extended) — `uploadImageAction` (re-resolves + re-authorizes, returns a non-leaking `ImageUploadState`); `parseFields` derives the image tri-state from hidden `image` vs `imageOriginal` and rejects a malformed asset id.
- `src/components/editor/post-editor.tsx` (extended) — the `FeaturedImageField` control (pick → `useTransition` upload → `next/image` preview → Remove/Replace; unnamed file input; hidden `image`/`imageOriginal`).

B.06 adds **no** new dependencies and **no** new environment variables. The Sanity Editor token (least-privilege Editor on that one client's project) is the only credential the upload uses — it already came from the registry in B.04; no browser-exposed token is ever introduced.

## Theme / brand (in `src/app/globals.css`)

- Import header copied from Vertex: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@custom-variant dark`.
- The Vertex `@theme` brand tokens (grayscale core `--color-ink/surface/elevated/border/muted/bright`, consulting scale, brand scale, accents gold/terracotta/success/error, the fluid type scale, radius, animation tokens) — copied.
- The shadcn `base-nova` token bridge (`@theme inline`) maps the semantic tokens onto the HSL palette. **Deviation from Vertex:** the triplets are wrapped in `hsl(...)` here (Vertex uses bare `var(--x)`), because the portal actually renders shadcn primitives and the bare form yields invalid colors. See `dashboard-Decisions.md` (2026-06-26).
- Dark-only: `html { color-scheme: dark }` + `<html class="dark" data-theme="dark">`. No light palette, no theme toggle, no division system (all marketing-site-only machinery was intentionally dropped).
- Fonts via `next/font/google` in `src/app/layout.tsx`: **Archivo** → `--font-heading`, **Source Serif 4** → `--font-body` (latin + latin-ext subsets). Buttons + nav chrome use `--font-heading` (Archivo) to match Vertex's CTA language.

## Environment variables — (NEVER commit real values; repo is public)

**Browser-safe (B.02)** — set in `.env.local` locally and in Vercel (Preview/Production). Both are `NEXT_PUBLIC_*` on purpose (protected by Supabase RLS); see `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the browser-safe **publishable** key. (Current Supabase name for what older docs called the "anon" key; the portal reads only this name.)

**Server-only secrets (B.03)** — never `NEXT_PUBLIC_*`, never logged, never committed; set in `.env.local` and in Vercel:
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key. Lets server code read `client_secrets` (which RLS hides from users); bypasses RLS.
- `SANITY_TOKEN_ENC_KEY` — 32-byte base64 key (`openssl rand -base64 32`) for AES-256-GCM token encryption. Lives only here / in Vercel, never in the database.

**Local one-off, B.03 verify script only** — the test user's own login, used by `npm run verify:registry`; not used by the app itself:
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` (and optional `TEST_USER_ID` so the seed can run without a CLI arg).

**Coming later** — configured in Vercel/Supabase env, never in the repo:
- Per-client Sanity **Editor** tokens — server-only secrets, encrypted at rest via the above, onboarded in M.01.
- `RESEND_API_KEY` (optional).

See `dashboard-Project-Instructions.md` §5 for the token-handling rules.

## Security notes (B.03)

- Pre-existing `npm audit` advisories on the pinned `next@16.2.3` (and a transitive `postcss`) are **not** introduced by B.03's dev deps; bumping `next` is out of scope for this phase. Tracked as a follow-up (see `current-state.md` → Risks).
