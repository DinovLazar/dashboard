/**
 * The two browser-safe Supabase environment variables this phase uses.
 *
 * Both are `NEXT_PUBLIC_*` on purpose: the project URL and the *publishable*
 * key are designed to reach the browser and are protected by Supabase
 * Row-Level Security. No server-only secret (the service-role key, or any
 * per-client Sanity token) is read here or anywhere in B.02 — those are
 * introduced server-side in B.03+ and must never carry the `NEXT_PUBLIC_`
 * prefix. See AGENTS.md → Security boundary.
 *
 * Each value is read at its call site with the *static* `process.env.NAME`
 * form (e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`) so Next.js inlines it into
 * the client bundle — a dynamic `process.env[name]` lookup would NOT be inlined
 * and would read as `undefined` in the browser. `requireEnv` only validates the
 * already-read value, so it stays safe to call from both server and browser.
 */
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local for local development and in the ` +
        `Vercel project settings for the preview/production environments ` +
        `(see src/_project-state/00_stack-and-config.md → Environment variables).`,
    )
  }
  return value
}
