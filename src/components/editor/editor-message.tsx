import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * A friendly, non-leaking message for the editor pages when the post can't be
 * opened (account not linked, setup incomplete, post not found, or a read error).
 * A plain Server Component — it never receives a tenant, token, project id, or raw
 * error; only the human copy the page chose. Always offers a way back to the list.
 */
export function EditorMessage({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Link
        href="/posts"
        className="inline-flex w-fit items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to posts
      </Link>

      <div className="flex flex-col items-center justify-center gap-5 rounded-card border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <span
          className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden
        >
          {icon}
        </span>
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-h3 text-foreground">{title}</h2>
          <p className="text-small text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}
