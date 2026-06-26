import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { requireEnv } from './env'

/**
 * Session-refresh helper invoked from the root `proxy.ts` (Next.js 16's
 * renamed successor to `middleware.ts`). It runs on every matched request to:
 *
 *  1. Refresh the Supabase auth session and write the rotated cookies onto the
 *     outgoing response, so server-side `getClaims()` checks always observe a
 *     current session.
 *  2. As defense-in-depth, redirect an unauthenticated visitor away from any
 *     non-public route. This is the *second* line of defense — the authoritative
 *     gate is the `(portal)` layout's server-side `getClaims()` check, which
 *     also covers the case the framework warns about (layouts not re-running on
 *     every client-side navigation is covered here, because the proxy runs on
 *     every request).
 *
 * Security note (Next.js Data Security guide): a proxy matcher that excludes a
 * path also skips Server Actions on that path, so the proxy is never the sole
 * authorization check. Every mutating Server Action re-verifies auth itself.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
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
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do NOT run any code between createServerClient and getClaims().
  // A simple mistake here can make sessions intermittently drop, which is very
  // hard to debug. Do NOT remove getClaims().
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  // Routes that an unauthenticated visitor is allowed to reach. `/` immediately
  // redirects to `/login` (see app/page.tsx); `/auth/*` is reserved for future
  // auth callbacks (e.g. password reset in a later phase).
  const { pathname } = request.nextUrl
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/auth')

  if (!claims && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Carry over the refreshed auth cookies onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    // Never let a response that may carry a Set-Cookie be cached by a shared
    // CDN cache and replayed to another user.
    redirectResponse.headers.set('Cache-Control', 'no-store, max-age=0')
    return redirectResponse
  }

  // IMPORTANT: Return `supabaseResponse` as-is so the refreshed auth cookies are
  // preserved. If you ever build a different response, copy over
  // `supabaseResponse.cookies` first (as done in the redirect branch above).
  supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0')
  return supabaseResponse
}
