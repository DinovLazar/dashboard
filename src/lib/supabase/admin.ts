import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireEnv } from './env'

/**
 * Supabase **service-role** client — the privileged, server-only client.
 *
 * ⚠️  This client uses the service-role key and therefore **BYPASSES
 * Row-Level Security**. It is the ONLY thing in the app that can read the
 * `client_secrets` table (encrypted per-client tokens), which RLS hides from
 * every browser session. With great power, etc.:
 *
 *  - NEVER import this module into a Client Component, or into any code that can
 *    reach the browser. The `import 'server-only'` line above turns any such
 *    import into a build error — keep it.
 *  - The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY`, a
 *    server-only secret. It is NOT a `NEXT_PUBLIC_*` variable, so Next.js never
 *    inlines it into the client bundle; it stays a runtime lookup on the server.
 *  - Use it only where the request has already been authenticated AND the
 *    logged-in user has been authorized for the specific client being touched
 *    (the authorize-on-every-mutation rule — see `dashboard-Project-Instructions.md`
 *    §5). This client trusts whatever you ask it; the ownership check is the
 *    caller's job (wired in B.04).
 *
 * `persistSession` / `autoRefreshToken` are off: there is no end-user session
 * here — it authenticates purely with the service-role key — and a background
 * refresh timer would leak/keep the process alive in scripts and serverless.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY',
    ),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
