import type { Metadata } from "next"
import { AlertTriangle, FileText, Plus, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PostsList } from "@/components/portal/posts-list"
import {
  resolveTenant,
  TenantResolutionError,
} from "@/lib/registry/resolve-tenant"
import { listPosts, type PostSummary } from "@/lib/sanity/posts"

export const metadata: Metadata = {
  title: "Your posts",
}

/**
 * The page's resolved render state. Computed inside try/catch (data only, never
 * JSX — see the error-boundaries lint rule), then rendered below. Each variant
 * is a friendly, non-crashing surface that leaks no project id, token, or raw
 * error to the UI.
 */
type PostsState =
  /** Account maps to no client yet. */
  | { kind: "not-linked" }
  /** Account exists but its config/secret is incomplete, or an unexpected error. */
  | { kind: "not-ready" }
  /** Tenant resolved, but the Sanity read failed. */
  | { kind: "read-error"; label: string }
  /** Tenant resolved; the client genuinely has no posts. */
  | { kind: "empty"; label: string }
  /** Tenant resolved with posts to show. */
  | { kind: "list"; label: string; posts: PostSummary[] }

/**
 * Resolve the tenant and read its posts, failing closed into a render state.
 * The decrypted token never leaves the server-side read path: only the client
 * `label` and the derived `PostSummary[]` flow back to the UI.
 */
async function loadPostsState(): Promise<PostsState> {
  let label: string
  let tenant: Awaited<ReturnType<typeof resolveTenant>>
  try {
    tenant = await resolveTenant()
    label = tenant.config.label
  } catch (error) {
    // "no-client" (and, defensively, "unauthenticated" — already handled by the
    // gate) → the account isn't linked to a site yet.
    if (
      error instanceof TenantResolutionError &&
      (error.reason === "no-client" || error.reason === "unauthenticated")
    ) {
      return { kind: "not-linked" }
    }
    // "config-missing" / "secret-missing" / anything unexpected → a generic,
    // non-leaking state. The account exists but its setup is incomplete.
    return { kind: "not-ready" }
  }

  let posts: PostSummary[]
  try {
    // The test client points at a placeholder project, so a live read is
    // expected to error until M.02 — this catch keeps the page non-crashing.
    posts = await listPosts(tenant)
  } catch {
    return { kind: "read-error", label }
  }

  return posts.length === 0
    ? { kind: "empty", label }
    : { kind: "list", label, posts }
}

export default async function PostsPage() {
  const state = await loadPostsState()

  if (state.kind === "not-linked") {
    return (
      <PostsShell label={null}>
        <StateCard
          icon={<Unplug className="size-6" />}
          title="No website connected yet"
          body="Your account isn't connected to a website yet. Contact Vertex and we'll link it to your blog so you can start writing."
        />
      </PostsShell>
    )
  }

  if (state.kind === "not-ready") {
    return (
      <PostsShell label={null}>
        <StateCard
          icon={<AlertTriangle className="size-6" />}
          title="Your site isn't ready yet"
          body="Your account is set up, but your blog connection needs attention. Please contact Vertex and we'll finish wiring it up."
        />
      </PostsShell>
    )
  }

  if (state.kind === "read-error") {
    return (
      <PostsShell label={state.label}>
        <StateCard
          icon={<AlertTriangle className="size-6" />}
          title="We couldn't load your posts"
          body="Something went wrong reaching your blog just now. Please refresh the page or try again in a moment."
        />
      </PostsShell>
    )
  }

  if (state.kind === "empty") {
    return (
      <PostsShell label={state.label}>
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
      </PostsShell>
    )
  }

  return (
    <PostsShell label={state.label}>
      <PostsList posts={state.posts} />
    </PostsShell>
  )
}

/**
 * The shared page chrome: the overline label + heading + the (inert) "New post"
 * button, wrapping whatever body state we render. `label` is null on the
 * not-linked / not-ready paths, where we have no resolved client.
 */
function PostsShell({
  label,
  children,
}: {
  label: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="overline text-muted-foreground">{label ?? "Your site"}</p>
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

      {children}
    </div>
  )
}

/** A centered dashed card for the not-linked / not-ready / read-error states. */
function StateCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
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
  )
}
