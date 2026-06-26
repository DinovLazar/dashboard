import Link from "next/link"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// The portal's primary navigation. Only "Posts" exists in v1 — the editor and
// any future sections are added in later phases. "Posts" is marked active
// statically because it is the only portal surface; a live `usePathname()`
// active check arrives once there is more than one destination.
const NAV_ITEMS = [
  { label: "Posts", href: "/posts", icon: FileText, active: true },
] as const

export function PortalNav({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal"
}) {
  return (
    <nav
      aria-label="Portal"
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row"
      )}
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "focus-ring inline-flex items-center gap-2.5 rounded-button px-3 py-2 font-heading text-small font-medium transition-colors",
            active
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
