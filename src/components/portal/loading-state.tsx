import { Loader2 } from "lucide-react"

/**
 * The portal's consistent loading state (B.08). Rendered by the route-level
 * `loading.tsx` boundaries while a `force-dynamic` page resolves its tenant and
 * fetches from Sanity, so a slow round-trip shows a branded, announced skeleton
 * instead of a blank frame.
 *
 * A plain presentational Server Component: it is a polite `role="status"` live
 * region with visible text, so the wait is announced to assistive tech (the
 * spinner is decorative and `aria-hidden`; if `prefers-reduced-motion` is set it
 * simply doesn't spin — the text still conveys the state). It receives only its
 * label — never a tenant, token, or raw error.
 */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex animate-fade-in flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-small text-muted-foreground">{label}</p>
    </div>
  )
}
