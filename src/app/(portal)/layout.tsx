import { PortalNav } from "@/components/portal/portal-nav"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalTopbar } from "@/components/portal/portal-topbar"

// Authenticated-portal shell: branded sidebar + top bar wrapping every portal
// page. NOTE: these routes are NOT actually gated yet — the auth middleware
// that protects this segment and resolves the real signed-in client is wired
// in B.02. The client label below is a placeholder slot until then.
const PLACEHOLDER_CLIENT_LABEL = "Demo Client"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar clientLabel={PLACEHOLDER_CLIENT_LABEL} />

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
