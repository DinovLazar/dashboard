# Stack and Configuration

The real, verified stack for the Vertex Consulting client blog portal as of **Phase B.01** (2026-06-26). Append changes as they land; keep it factual.

**Build status: scaffolded and building clean.** `npm run build` passes; the branded shell deploys to a Vercel preview at https://dashboard-six-iota-33.vercel.app.

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

All versions mirror the Vertex marketing site exactly, except `@base-ui/react` (Vertex pins `^1.4.0`; npm resolved `^1.6.0` here — compatible, satisfies Vertex's range).

**Intentionally NOT yet added** (arrive in the phase that needs them): `@supabase/supabase-js` + `@supabase/ssr` (B.02), `@sanity/client` / `next-sanity` (B.04), a portable-text editor (B.05), `resend` (optional). No 3D/animation libraries (the portal has no public marketing surface).

## Dependencies (dev) — actual

`@tailwindcss/postcss ^4`, `tailwindcss ^4`, `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19`, `eslint ^9`, `eslint-config-next 16.2.3`, `typescript ^5`.

## Scripts

- `dev` → `next dev` · `build` → `next build` · `start` → `next start` · `lint` → `eslint`
- (A test runner is selected at B.04 when the cross-tenant isolation test lands.)

## Config files (present after B.01)

- `tsconfig.json` — path alias `@/*` → `./src/*` (mirrors Vertex)
- `next.config.ts` — minimal/empty for B.01 (no i18n, no image remotePatterns yet)
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

## Environment variables — intended (NEVER commit real values; repo is public)

None required for B.01 (no integrations wired yet). Coming later, all configured in Vercel/Supabase env, never in the repo:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe) — B.02
- `SUPABASE_SERVICE_ROLE_KEY` — server-only — B.03
- A server-only key for encrypting/decrypting per-client Sanity tokens at rest — B.03
- Per-client Sanity **Editor** tokens — server-only secrets, stored encrypted, never `NEXT_PUBLIC_*`, never logged — M.01
- `RESEND_API_KEY` (optional)

See `dashboard-Project-Instructions.md` §5 for the token-handling rules.
