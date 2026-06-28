import type { Metadata } from "next"
import { AlertTriangle, Unplug } from "lucide-react"

import { EditorMessage } from "@/components/editor/editor-message"
import { PostEditor } from "@/components/editor/post-editor"
import { localeList } from "@/lib/config/localize"
import {
  resolveTenant,
  TenantResolutionError,
} from "@/lib/registry/resolve-tenant"

export const metadata: Metadata = {
  title: "New post",
}

/** Empty per-locale form state for a brand-new post. */
function emptyInitial(locales: string[]) {
  const blank: Record<string, string> = {}
  for (const loc of locales) blank[loc] = ""
  return {
    title: { ...blank },
    excerpt: { ...blank },
    body: { ...blank },
    slug: "",
    image: { assetId: null, url: null },
  }
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
 * Create a new post. Resolves the tenant only for its config (the locales the
 * editor renders); the token never leaves the server. The actual write happens in
 * `createPostAction`, which re-resolves and re-authorizes on submit.
 */
export default async function NewPostPage() {
  let locales: string[]
  try {
    const tenant = await resolveTenant()
    locales = localeList(tenant.config)
  } catch (error) {
    return failureNotice(error)
  }

  return (
    <PostEditor mode="create" locales={locales} initial={emptyInitial(locales)} />
  )
}
