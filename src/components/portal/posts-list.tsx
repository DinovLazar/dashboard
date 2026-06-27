import type { PostSummary } from "@/lib/sanity/posts"

/**
 * Presentational post list (B.04). A plain Server Component that renders only
 * `PostSummary[]` — it never receives the tenant or the token (those stay in the
 * server-side read path). Each row shows the title, a draft/published badge with
 * a subtle "edited" hint for unpublished edits, and a last-updated time. Rows are
 * not yet links: the editor they will open is B.05.
 */

/** Short, human relative time (e.g. "2 hours ago", "Yesterday", "Mar 3, 2026"). */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""

  const diffMs = Date.now() - then
  const sec = Math.round(diffMs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)

  if (sec < 45) return "just now"
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  if (day === 1) return "Yesterday"
  if (day < 30) return `${day} days ago`

  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Absolute timestamp for the `title`/tooltip (full precision, never hidden). */
function formatAbsolute(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function StatusBadge({
  status,
  hasUnpublishedEdits,
}: {
  status: PostSummary["status"]
  hasUnpublishedEdits: boolean
}) {
  const published = status === "published"
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-secondary px-2.5 py-0.5 text-micro font-medium text-muted-foreground">
      <span
        className={
          "size-1.5 rounded-full " +
          (published ? "bg-accent-success" : "bg-accent-gold")
        }
        aria-hidden
      />
      {published ? "Published" : "Draft"}
      {hasUnpublishedEdits ? (
        <span className="text-muted-foreground/70">· Edited</span>
      ) : null}
    </span>
  )
}

export function PostsList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {posts.map((post) => (
        <li key={post.id}>
          <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-card/40 px-4 py-3.5 transition-colors hover:bg-card/70 sm:px-5">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="truncate font-heading text-body font-medium text-foreground">
                  {post.title}
                </h2>
                <StatusBadge
                  status={post.status}
                  hasUnpublishedEdits={post.hasUnpublishedEdits}
                />
              </div>
              {post.excerpt ? (
                <p className="truncate text-small text-muted-foreground">
                  {post.excerpt}
                </p>
              ) : null}
            </div>

            <time
              dateTime={post.updatedAt}
              title={formatAbsolute(post.updatedAt)}
              className="shrink-0 text-micro text-muted-foreground tabular-nums"
            >
              {formatRelativeTime(post.updatedAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  )
}
