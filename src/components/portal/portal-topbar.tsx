import { ChevronDown, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Wordmark } from "./wordmark"

function initialsFor(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Sticky top bar above the content column. On mobile it carries the brand mark
 * (the sidebar is hidden there); on every size it shows the signed-in client's
 * label and a sign-out affordance on the right.
 *
 * `clientLabel` is a presentational slot — in B.02 it is populated from the
 * authenticated Supabase session, and sign-out is wired to end that session.
 * Today the button is intentionally inert.
 */
export function PortalTopbar({ clientLabel }: { clientLabel: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      <Wordmark className="md:hidden" tag={null} />

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2.5 rounded-pill border border-border bg-card/60 py-1.5 pr-3 pl-1.5">
          <span
            className="grid size-7 place-items-center rounded-full bg-secondary text-micro font-semibold text-foreground"
            aria-hidden
          >
            {initialsFor(clientLabel)}
          </span>
          <span className="hidden text-small font-medium text-foreground sm:inline">
            {clientLabel}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </div>

        <Button
          type="button"
          variant="ghost"
          className="h-9 text-muted-foreground hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  )
}
