'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type SignInState = {
  error: string | null
}

/**
 * Sign in with email + password via Supabase, from the `/login` form.
 *
 * On success the server client writes the session cookies and we redirect into
 * the portal. On any failure we return a single, generic message — we never
 * reveal whether the email exists or which field was wrong, to avoid leaking
 * account information (no user enumeration).
 *
 * There is intentionally no sign-up path: accounts are provisioned by Vertex in
 * the Supabase dashboard (see dashboard-Decisions.md → "no public signup").
 */
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Incorrect email or password.' }
  }

  // Success: redirect throws a framework control-flow signal, so nothing below
  // runs. The `(portal)` layout re-verifies the session server-side on arrival.
  redirect('/posts')
}
