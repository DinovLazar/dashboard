// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { axe } from "jest-axe"

import { PostsList } from "./posts-list"
import { LoadingState } from "./loading-state"
import type { PostSummary } from "@/lib/sanity/posts"

/**
 * Offline accessibility tests for the presentational post list (B.08).
 *
 * Scope axe to the WCAG 2.1 A/AA success criteria — the bar the DoD sets. The
 * default ruleset also runs page-level *best-practice* rules (e.g. "page must
 * have one h1", "all content in landmarks") that are meaningful for a whole
 * document but spurious for an isolated component fragment; those are out of
 * scope here. (Colour-contrast is verified separately against the real tokens —
 * jsdom doesn't apply the stylesheet, so axe reports contrast as "incomplete",
 * never as a violation.)
 */
const WCAG_AA = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
}

const posts: PostSummary[] = [
  {
    id: "post-published",
    title: "Launching our new service",
    excerpt: "A short summary shown in listings.",
    slug: "launching-our-new-service",
    status: "published",
    hasUnpublishedEdits: false,
    updatedAt: "2026-06-20T10:00:00.000Z",
  },
  {
    id: "post-draft",
    title: "Work in progress",
    excerpt: null,
    slug: null,
    status: "draft",
    hasUnpublishedEdits: true,
    updatedAt: "2026-06-27T09:30:00.000Z",
  },
]

describe("PostsList — accessibility", () => {
  it("has no WCAG violations when populated", async () => {
    const { container } = render(<PostsList posts={posts} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("has no WCAG violations when empty", async () => {
    const { container } = render(<PostsList posts={[]} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })
})

describe("LoadingState — accessibility", () => {
  it("has no WCAG violations and announces politely", async () => {
    const { container } = render(<LoadingState label="Loading your posts…" />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
    // A status live region so the wait is announced to assistive tech.
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })
})
