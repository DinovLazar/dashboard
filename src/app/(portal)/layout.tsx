import { redirect } from "next/navigation"
import { PortalNav } from "@/components/portal/portal-nav"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalTopbar } from "@/components/portal/portal-topbar"
import { createClient } from "@/lib/supabase/server"

// Authenticated routes must render dynamically and must never be statically
// prerendered or served from a shared/CDN cache — otherwise a session-refresh
// `Set-Cookie` could be cached and replayed to a different user. Reading the
// session below already forces dynamic rendering; this marker makes the
// guarantee explicit and applies to every page nested under this layout.
export const dynamic = "force-dynamic"

/**
 * Authenticated-portal shell: branded sidebar + top bar wrapping every portal
 * page. This layout is the **authoritative gate** for the `(portal)` route
 * group — it verifies the session server-side with Supabase's `getClaims()`
 * (which validates the JWT, not just the presence of a cookie) and redirects to
 * `/login` when there is no authenticated user. The proxy provides a second,
 * defense-in-depth redirect on every request.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/login")
  }

  // Until the per-client registry lands (B.03), the top-bar label shows the
  // signed-in user's email. It is replaced by the resolved client label then.
  const accountLabel =
    typeof claims.email === "string" && claims.email.length > 0
      ? claims.email
      : "Account"

  return (
    <div className="flex min-h-screen">
      <PortalSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar clientLabel={accountLabel} />

        {/* Mobile-only nav (the sidebar is hidden below `md`). */}
        <div className="border-b border-border px-4 py-2 md:hidden">
          <PortalNav orientation="horizontal" />
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
