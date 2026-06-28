/**
 * The shared friendly-state card (B.08). One presentational primitive for every
 * non-crashing "nothing to show / something needs attention" surface in the
 * portal — the posts list's empty / not-linked / not-ready / read-error states
 * and the editor pages' not-linked / not-ready / not-found / read-error states
 * (via `editor-message.tsx`). Centralising it makes those states render
 * *consistently* (Task 4) and keeps the heading level correct on each page.
 *
 * It is a plain Server Component: it only ever receives the human copy the page
 * chose — never a tenant, token, project id, or raw error — so it cannot leak.
 *
 * `headingLevel` keeps the document outline sane: `2` (default) when the card
 * sits beneath a page `<h1>` (the posts list, which has its own "Your posts"
 * heading); `1` when the card *is* the whole page (the editor message screens),
 * so every page still has exactly one `<h1>`.
 */
export function MessageCard({
  icon,
  title,
  body,
  headingLevel = 2,
  children,
}: {
  icon: React.ReactNode
  title: string
  body: string
  headingLevel?: 1 | 2
  children?: React.ReactNode
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2"
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-card border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      <span
        className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <Heading className="text-h3 text-foreground">{title}</Heading>
        <p className="text-small text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  )
}
