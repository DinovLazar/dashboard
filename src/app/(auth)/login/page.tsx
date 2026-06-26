import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wordmark } from "@/components/portal/wordmark"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
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
          Static placeholder. Real authentication (Supabase email + password,
          session handling, redirect to /posts) is wired in B.02 — the fields
          and button below are presentational only and do nothing yet.
        */}
        <form className="flex flex-col gap-5 rounded-card border border-border bg-card/60 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourcompany.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="button" className="mt-1 h-11 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-micro text-muted-foreground">
          Accounts are created by Vertex. Contact your Vertex representative for
          access.
        </p>
      </div>
    </main>
  )
}
