import type { Metadata } from "next"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Your posts",
}

// Empty "Your posts" placeholder. The real list is read per-tenant from the
// signed-in client's own Sanity project in B.04, and the editor that the
// "New post" button opens is built in B.05 — so both buttons are inert here.
export default function PostsPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="overline text-muted-foreground">Demo Client</p>
          <h1 className="text-h2 text-foreground">Your posts</h1>
          <p className="text-body text-muted-foreground">
            Write, edit, and publish posts on your website&rsquo;s blog.
          </p>
        </div>

        <Button type="button" disabled className="h-9 self-start sm:self-auto">
          <Plus className="size-4" aria-hidden />
          New post
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center gap-5 rounded-card border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <span
          className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden
        >
          <FileText className="size-6" />
        </span>
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-h3 text-foreground">No posts yet</h2>
          <p className="text-small text-muted-foreground">
            Once the editor is connected, your blog posts will appear here.
            You&rsquo;ll be able to create a post, save it as a draft, and
            publish it to your live site.
          </p>
        </div>
        <Button type="button" variant="outline" disabled className="h-9">
          <Plus className="size-4" aria-hidden />
          New post
        </Button>
      </div>
    </div>
  )
}
