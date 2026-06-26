import { redirect } from 'next/navigation'

// The portal has no public landing page — the root simply sends visitors to
// the sign-in screen. Once Supabase auth lands (B.02) this is where a live
// session check will route a signed-in user straight to /posts instead.
export default function RootPage() {
  redirect('/login')
}
