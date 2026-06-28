import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { requireEnv } from './env'

/**
 * Supabase client for the server: Server Components, Server Actions, and Route
 * Handlers. It is bound to the incoming request's cookies, so it reads the
 * signed-in user's session and writes refreshed session cookies back.
 *
 * Every authenticated decision in this app (the `(portal)` layout gate, the
 * sign-in / sign-out Server Actions, and — from B.04 — every read/write of
 * client content) goes through a client created here, on the server. Reading
 * cookies also opts the calling route into dynamic rendering, which is exactly
 * what we want for auth-gated surfaces (see the no-cache hardening in the
 * `(portal)` layout and `proxy.ts`).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // `setAll` was called from a Server Component, where setting cookies
            // is not allowed. Safe to ignore: `proxy.ts` refreshes the session
            // and writes the cookies on every request.
          }
        },
      },
    },
  )
}
