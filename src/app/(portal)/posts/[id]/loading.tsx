import { LoadingState } from "@/components/portal/loading-state"

/** Route-level loading UI shown while the edit-post page loads the post. */
export default function Loading() {
  return <LoadingState label="Loading this post…" />
}
