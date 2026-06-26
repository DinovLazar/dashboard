import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Wordmark } from "@/components/portal/wordmark"
import { createClient } from "@/lib/supabase/server"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage() {
  // If a valid session is already present, skip the form and go straight in.
  // Reading the session here also opts this route into dynamic rendering, so a
  // session-bearing response is never statically cached.
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) {
    redirect("/posts")
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Subtle brand glow behind the card — the bright accent token at low
          alpha, the same family of treatment the marketing site uses. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(62% 48% at 50% 0%, rgba(245,245,245,0.06), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-6 text-center">
          <Wordmark tag="Client Portal" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-h2 text-foreground">Sign in</h1>
            <p className="text-small text-muted-foreground">
              Manage your website&rsquo;s blog from one place.
            </p>
          </div>
        </div>

        {/*
          Real authentication: the form submits to a Supabase email + password
          Server Action (see ./actions.ts) and redirects into the portal on
          success. There is no sign-up link or form here — accounts are created
          by Vertex in the Supabase dashboard.
        */}
        <LoginForm />

        <p className="mt-6 text-center text-micro text-muted-foreground">
          Accounts are created by Vertex. Contact your Vertex representative for
          access.
        </p>
      </div>
    </main>
  )
}
