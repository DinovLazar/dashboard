import { PortalNav } from "./portal-nav"
import { Wordmark } from "./wordmark"

// Left navigation column. Hidden on mobile (the top bar carries the brand mark
// and a horizontal nav there); a fixed-width rail from `md` upward.
export function PortalSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Wordmark />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <p className="overline px-3 text-muted-foreground">Manage</p>
        <PortalNav />
      </div>
      <div className="border-t border-border px-6 py-4">
        <p className="text-micro text-muted-foreground">
          Vertex Consulting · Client blog portal
        </p>
      </div>
    </aside>
  )
}
