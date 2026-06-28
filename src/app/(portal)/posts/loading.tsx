import { LoadingState } from "@/components/portal/loading-state"

/** Route-level loading UI shown while `/posts` resolves the tenant + lists posts. */
export default function Loading() {
  return <LoadingState label="Loading your posts…" />
}
