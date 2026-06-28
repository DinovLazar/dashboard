import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js 16 proxy — the renamed successor to `middleware.ts` (the `middleware`
 * file convention was deprecated in Next.js 16; see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 * The Supabase guide still names this file `middleware.ts`; we follow the
 * framework's current convention per AGENTS.md ("Heed deprecation notices").
 *
 * Runs on every matched request to refresh the Supabase auth session (so
 * server-side `getClaims()` always sees a current session) and to bounce
 * unauthenticated visitors off protected routes as defense-in-depth. The
 * authoritative gate remains the `(portal)` layout's server-side check.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on every request path except the ones that never carry an auth
     * decision:
     * - _next/static (build output) and _next/image (image optimization)
     * - favicon.ico, icon.svg, and other static image assets
     * Everything else — including app routes and any future API routes — runs
     * through the proxy so a refreshed-session Set-Cookie is never missed.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
