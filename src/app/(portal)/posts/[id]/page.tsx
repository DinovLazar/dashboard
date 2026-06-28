import type { Metadata } from "next"
import { AlertTriangle, FileQuestion, Unplug } from "lucide-react"

import { EditorMessage } from "@/components/editor/editor-message"
import { PostEditor } from "@/components/editor/post-editor"
import { localeList } from "@/lib/config/localize"
import {
  resolveTenant,
  TenantResolutionError,
} from "@/lib/registry/resolve-tenant"
import { getPost } from "@/lib/sanity/posts"

export const metadata: Metadata = {
  title: "Edit post",
}

/** Map a resolution failure to a friendly, non-leaking editor notice. */
function failureNotice(error: unknown) {
  const notLinked =
    error instanceof TenantResolutionError &&
    (error.reason === "no-client" || error.reason === "unauthenticated")
  return notLinked ? (
    <EditorMessage
      icon={<Unplug className="size-6" />}
      title="No website connected yet"
      body="Your account isn't connected to a website yet. Contact Vertex and we'll link it to your blog so you can start writing."
    />
  ) : (
    <EditorMessage
      icon={<AlertTriangle className="size-6" />}
      title="Your site isn't ready yet"
      body="Your account is set up, but your blog connection needs attention. Please contact Vertex and we'll finish wiring it up."
    />
  )
}

/**
 * Edit one post. Resolves the tenant, loads the post via `getPost` (which keeps
 * the token server-side), and renders the editor with the post's per-locale
 * values and status. A junk/foreign id or a missing post becomes a friendly
 * not-found; a read failure becomes a friendly error. The mutating actions
 * re-resolve and re-authorize on submit.
 */
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let tenant: Awaited<ReturnType<typeof resolveTenant>>
  try {
    tenant = await resolveTenant()
  } catch (error) {
    return failureNotice(error)
  }

  let detail: Awaited<ReturnType<typeof getPost>>
  try {
    detail = await getPost(tenant, id)
  } catch {
    return (
      <EditorMessage
        icon={<AlertTriangle className="size-6" />}
        title="We couldn't load this post"
        body="Something went wrong reaching your blog just now. Please go back and try again in a moment."
      />
    )
  }

  if (!detail) {
    return (
      <EditorMessage
        icon={<FileQuestion className="size-6" />}
        title="Post not found"
        body="This post doesn't exist, or it isn't part of your site. It may have been deleted."
      />
    )
  }

  return (
    <PostEditor
      mode="edit"
      locales={localeList(tenant.config)}
      initial={{
        id: detail.id,
        title: detail.fields.title,
        excerpt: detail.fields.excerpt,
        body: detail.fields.body,
        slug: detail.fields.slug,
        image: detail.image,
      }}
      status={detail.status}
      hasUnpublishedEdits={detail.hasUnpublishedEdits}
      bodyEditable={detail.bodyEditable}
    />
  )
}
