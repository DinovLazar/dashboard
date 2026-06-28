// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"

// The form imports the `signIn` Server Action, whose module pulls in the
// server-only Supabase client. Mock it: the component only needs a function
// reference for `useActionState`, never the real implementation, under test.
vi.mock("./actions", () => ({
  signIn: vi.fn(async () => ({ error: null })),
}))

import { LoginForm } from "./login-form"

// See posts-list.test.tsx for why axe is scoped to the WCAG 2.1 A/AA tags.
const WCAG_AA = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
}

describe("LoginForm — accessibility", () => {
  it("has no WCAG violations", async () => {
    const { container } = render(<LoginForm />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("labels both fields programmatically", () => {
    render(<LoginForm />)
    // getByLabelText resolves the control via its associated <Label htmlFor>.
    expect(screen.getByLabelText("Email")).toBeTruthy()
    expect(screen.getByLabelText("Password")).toBeTruthy()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy()
  })
})
