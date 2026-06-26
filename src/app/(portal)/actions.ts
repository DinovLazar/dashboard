'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Sign out the current user and return to the login screen.
 *
 * Re-verifies on the server by going through the per-request Supabase client:
 * Server Actions are reachable by direct POST and a layout/page check does not
 * protect them (see the Next.js Data Security guide). `signOut()` ends whatever
 * session the request carries and clears its auth cookies; if there is no
 * session this is a harmless no-op. Either way the user lands on `/login`.
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
