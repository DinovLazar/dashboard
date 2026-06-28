// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"

// The top bar wires sign-out to a Server Action, whose module reaches the
// auth/session layer. Mock it: the component only needs a function reference for
// the <form action>, never the real implementation, under test.
vi.mock("@/app/(portal)/actions", () => ({
  signOut: vi.fn(async () => {}),
}))

import { PortalTopbar } from "./portal-topbar"

// See posts-list.test.tsx for why axe is scoped to the WCAG 2.1 A/AA tags.
const WCAG_AA = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
}

describe("PortalTopbar — accessibility", () => {
  it("has zero axe violations", async () => {
    const { container } = render(<PortalTopbar clientLabel="you@company.com" />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("gives the icon-only sign-out control a discernible name", () => {
    // On mobile the visible 'Sign out' text is hidden (hidden sm:inline), so the
    // accessible name must come from aria-label — this is the genuinely icon-only
    // control in the shell, and it stays reachable by name regardless of width.
    render(<PortalTopbar clientLabel="you@company.com" />)
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy()
  })

  it("keeps the account display non-interactive (not a tab stop)", () => {
    // The initials/label chip is presentational; only sign-out is actionable.
    render(<PortalTopbar clientLabel="Demo Client" />)
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
})
