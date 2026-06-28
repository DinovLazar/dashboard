# Stack and Configuration

The real, verified stack for the Vertex Consulting client blog portal as of **Phase B.02** (2026-06-26). Append changes as they land; keep it factual.

**Build status: building clean with auth live.** `npm run build` passes and `npm run lint` is clean; `/login` and `/posts` are dynamic (`ƒ`), and the proxy is active.

## Framework and runtime

- **Next.js 16.2.3** (App Router, Turbopack build)
- **React 19.2.4** / **react-dom 19.2.4**
- **TypeScript ^5** (strict)
- **Node:** built and verified on Node 26.x locally and on Vercel (Next 16 requires Node ≥ 20.9). No `.nvmrc` pinned yet.
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
| `@supabase/supabase-js` | `2.108.2` (exact) | **B.02** — Supabase JS client (`@supabase/ssr` peer; satisfies its `^2.108.0` requirement) |

All versions mirror the Vertex marketing site exactly, except `@base-ui/react` (Vertex pins `^1.4.0`; npm resolved `^1.6.0` here — compatible, satisfies Vertex's range). The two `@supabase/*` packages are pinned **exact** (no caret), matching the `next`/`react` pinning convention.

**Intentionally NOT yet added** (arrive in the phase that needs them): `@sanity/client` / `next-sanity` (B.04), a portable-text editor (B.05), `resend` (optional). The Supabase **service-role key** and any token-encryption library are **not** added in B.02 — they arrive server-side in B.03. No 3D/animation libraries (the portal has no public marketing surface).

## Dependencies (dev) — actual

`@tailwindcss/postcss ^4`, `tailwindcss ^4`, `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19`, `eslint ^9`, `eslint-config-next 16.2.3`, `typescript ^5`.

## Scripts

- `dev` → `next dev` · `build` → `next build` · `start` → `next start` · `lint` → `eslint`
- (A test runner is selected at B.04 when the cross-tenant isolation test lands.)

## Config files (present after B.02)

- `tsconfig.json` — path alias `@/*` → `./src/*` (mirrors Vertex)
- `src/proxy.ts` — **B.02** Next.js 16 proxy (renamed successor to `middleware.ts`): session refresh + auth redirect; `config.matcher` excludes `_next/static`, `_next/image`, and common static assets
- `.env.local.example` — **B.02** value-free template for the two browser-safe Supabase vars (tracked via the `!.env.local.example` allowlist in `.gitignore`)
- `next.config.ts` — minimal/empty (no i18n, no image remotePatterns yet)
- `postcss.config.mjs` — `@tailwindcss/postcss` only (Tailwind v4, CSS-first; **no `tailwind.config.js`**)
- `eslint.config.mjs` — flat config extending `eslint-config-next` core-web-vitals + typescript
- `components.json` — shadcn: style `base-nova`, base color `neutral`, CSS vars on, css `src/app/globals.css`, lucide icons, RSC on
- `.gitignore` — copied from Vertex (ignores `.env*`, `.vercel`, `.next/`, `.claude/worktrees/`)
- `.claude/launch.json` — local preview dev/prod server config (not deployment)

## Theme / brand (in `src/app/globals.css`)

- Import header copied from Vertex: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@custom-variant dark`.
- The Vertex `@theme` brand tokens (grayscale core `--color-ink/surface/elevated/border/muted/bright`, consulting scale, brand scale, accents gold/terracotta/success/error, the fluid type scale, radius, animation tokens) — copied.
- The shadcn `base-nova` token bridge (`@theme inline`) maps the semantic tokens onto the HSL palette. **Deviation from Vertex:** the triplets are wrapped in `hsl(...)` here (Vertex uses bare `var(--x)`), because the portal actually renders shadcn primitives and the bare form yields invalid colors. See `dashboard-Decisions.md` (2026-06-26).
- Dark-only: `html { color-scheme: dark }` + `<html class="dark" data-theme="dark">`. No light palette, no theme toggle, no division system (all marketing-site-only machinery was intentionally dropped).
- Fonts via `next/font/google` in `src/app/layout.tsx`: **Archivo** → `--font-heading`, **Source Serif 4** → `--font-body` (latin + latin-ext subsets). Buttons + nav chrome use `--font-heading` (Archivo) to match Vertex's CTA language.

## Environment variables — (NEVER commit real values; repo is public)

**Required now (B.02)** — browser-safe, set in `.env.local` locally and in Vercel (Preview/Production). Both are `NEXT_PUBLIC_*` on purpose (protected by Supabase RLS); see `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the browser-safe **publishable** key. (This is the current Supabase name for the client key; the older docs called it the "anon" key. The portal reads only this name.)

**Coming later** — all configured in Vercel/Supabase env, never in the repo:
- `SUPABASE_SERVICE_ROLE_KEY` — server-only — B.03
- A server-only key for encrypting/decrypting per-client Sanity tokens at rest — B.03
- Per-client Sanity **Editor** tokens — server-only secrets, stored encrypted, never `NEXT_PUBLIC_*`, never logged — M.01
- `RESEND_API_KEY` (optional)

See `dashboard-Project-Instructions.md` §5 for the token-handling rules.
