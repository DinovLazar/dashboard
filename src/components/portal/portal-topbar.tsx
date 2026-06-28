import { LogOut } from "lucide-react"
import { signOut } from "@/app/(portal)/actions"
import { Button } from "@/components/ui/button"
import { Wordmark } from "./wordmark"

function initialsFor(label: string) {
  // Labels can be a person/company name ("Demo Client") or, until the client
  // registry lands, an email ("you@company.com"). Derive up to two initials
  // from whichever shape we get.
  const base = label.includes("@") ? label.split("@")[0] : label
  const words = base.split(/[\s._-]+/).filter(Boolean)

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }

  return base.slice(0, 2).toUpperCase()
}

/**
 * Sticky top bar above the content column. On mobile it carries the brand mark
 * (the sidebar is hidden there); on every size it shows the signed-in client's
 * label and a sign-out affordance on the right.
 *
 * `clientLabel` comes from the authenticated Supabase session (the user's email
 * until the per-client registry lands in B.03). Sign-out posts to a Server
 * Action that ends the session and returns to `/login`.
 */
export function PortalTopbar({ clientLabel }: { clientLabel: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      <Wordmark className="md:hidden" tag={null} />

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Non-interactive account display (the signed-in client's label). It is
            not a menu, so it carries no menu affordance and is not a tab stop;
            sign-out is the adjacent button. */}
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
        </div>

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-9 text-muted-foreground hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
