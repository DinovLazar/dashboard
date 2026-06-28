import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MessageCard } from "@/components/portal/message-card"

/**
 * A friendly, non-leaking message for the editor pages when the post can't be
 * opened (account not linked, setup incomplete, post not found, or a read error).
 * A plain Server Component — it never receives a tenant, token, project id, or raw
 * error; only the human copy the page chose. Always offers a way back to the list.
 *
 * The card renders its title as the page's single `<h1>` (`headingLevel={1}`),
 * because when this screen shows it *is* the whole page.
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
        className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-small text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to posts
      </Link>

      <MessageCard icon={icon} title={title} body={body} headingLevel={1} />
    </div>
  )
}
