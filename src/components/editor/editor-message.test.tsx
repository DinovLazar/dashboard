// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { AlertTriangle, FileQuestion, Unplug } from "lucide-react"

import { MessageCard } from "@/components/portal/message-card"
import { EditorMessage } from "./editor-message"

// See posts-list.test.tsx for why axe is scoped to the WCAG 2.1 A/AA tags.
const WCAG_AA = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
}

describe("EditorMessage — accessibility", () => {
  it("has no WCAG violations (not-linked state)", async () => {
    const { container } = render(
      <EditorMessage
        icon={<Unplug className="size-6" />}
        title="No website connected yet"
        body="Your account isn't connected to a website yet. Contact Vertex and we'll link it to your blog."
      />,
    )
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("has no WCAG violations (not-found state)", async () => {
    const { container } = render(
      <EditorMessage
        icon={<FileQuestion className="size-6" />}
        title="Post not found"
        body="This post doesn't exist, or it isn't part of your site. It may have been deleted."
      />,
    )
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("renders its title as the page's single h1 and offers a way back", () => {
    render(
      <EditorMessage
        icon={<AlertTriangle className="size-6" />}
        title="We couldn't load this post"
        body="Something went wrong reaching your blog just now."
      />,
    )
    // Editor message screens ARE the whole page → their title must be the h1.
    expect(
      screen.getByRole("heading", { level: 1, name: "We couldn't load this post" }),
    ).toBeTruthy()
    expect(screen.getByRole("link", { name: /back to posts/i })).toBeTruthy()
  })
})

describe("MessageCard — accessibility", () => {
  it("has no WCAG violations as a level-2 card (under a page heading)", async () => {
    const { container } = render(
      <MessageCard
        icon={<AlertTriangle className="size-6" />}
        title="Your site isn't ready yet"
        body="Your account is set up, but your blog connection needs attention."
        headingLevel={2}
      />,
    )
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("honours the requested heading level", () => {
    render(
      <MessageCard
        icon={<AlertTriangle className="size-6" />}
        title="No posts yet"
        body="Once the editor is connected, your blog posts will appear here."
        headingLevel={2}
      />,
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "No posts yet" }),
    ).toBeTruthy()
  })
})
