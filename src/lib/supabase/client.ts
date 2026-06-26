import { createBrowserClient } from '@supabase/ssr'

import { requireEnv } from './env'

/**
 * Supabase client for use in the browser (Client Components).
 *
 * Reads only the two browser-safe `NEXT_PUBLIC_*` values. There is no
 * server-only secret here — the browser never receives a service-role key or a
 * per-client Sanity token. In B.02 the sign-in path runs through a Server
 * Action (so it uses the server client), but the browser client is part of the
 * standard `@supabase/ssr` setup and is used by Client Components in later
 * phases.
 */
export function createClient() {
  return createBrowserClient(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
  )
}
