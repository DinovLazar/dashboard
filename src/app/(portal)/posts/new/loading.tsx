import { LoadingState } from "@/components/portal/loading-state"

/** Route-level loading UI shown while the create-post editor resolves config. */
export default function Loading() {
  return <LoadingState label="Loading the editor…" />
}
