// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"

// The editor imports the mutating Server Actions, whose module pulls in the
// server-only tenant resolver + Sanity client. Mock the module: the editor only
// needs function references for `useActionState`/`useTransition`, never the real
// server implementations, under test. (This mirrors how the editor reaches them
// at runtime — through the 'use server' boundary — and keeps the test offline.)
vi.mock("@/app/(portal)/posts/actions", () => ({
  createPostAction: vi.fn(async () => ({ ok: false, error: null })),
  saveDraftAction: vi.fn(async () => ({ ok: false, error: null })),
  publishPostAction: vi.fn(async () => ({ ok: false, error: null })),
  deletePostAction: vi.fn(async () => ({ ok: false, error: null })),
  uploadImageAction: vi.fn(async () => ({
    ok: false,
    assetId: null,
    url: null,
    error: null,
  })),
}))

// next/image's optimiser/loader isn't meaningful in a unit test; render a plain
// <img> so axe still sees the alt text and the host-allowlist isn't exercised.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
  }: {
    src: string
    alt: string
    fill?: boolean
    sizes?: string
    className?: string
    // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
  }) => <img src={typeof src === "string" ? src : ""} alt={alt} />,
}))

import { PostEditor, type PostEditorProps } from "./post-editor"
import { deletePostAction, uploadImageAction } from "@/app/(portal)/posts/actions"

// See posts-list.test.tsx for why axe is scoped to the WCAG 2.1 A/AA tags.
const WCAG_AA = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
}

function blank(locales: string[]): Record<string, string> {
  return Object.fromEntries(locales.map((l) => [l, ""]))
}

const createSingle: PostEditorProps = {
  mode: "create",
  locales: ["en"],
  initial: {
    title: blank(["en"]),
    excerpt: blank(["en"]),
    body: blank(["en"]),
    slug: "",
    image: { assetId: null, url: null },
  },
}

const editNoImage: PostEditorProps = {
  mode: "edit",
  locales: ["en"],
  initial: {
    id: "post-123",
    title: { en: "An existing headline" },
    excerpt: { en: "An existing summary." },
    body: { en: "First paragraph.\n\nSecond paragraph." },
    slug: "an-existing-headline",
    image: { assetId: null, url: null },
  },
  status: "draft",
  hasUnpublishedEdits: false,
  bodyEditable: true,
}

const editWithImage: PostEditorProps = {
  ...editNoImage,
  initial: {
    ...editNoImage.initial,
    image: {
      assetId: "image-abc123def456-800x600-jpg",
      url: "https://cdn.sanity.io/images/proj/dataset/abc123def456-800x600.jpg",
    },
  },
  status: "published",
  hasUnpublishedEdits: true,
}

const editMultiLocale: PostEditorProps = {
  mode: "edit",
  locales: ["en", "mk"],
  initial: {
    id: "post-456",
    title: { en: "English headline", mk: "Македонски наслов" },
    excerpt: { en: "English summary.", mk: "Македонско резиме." },
    body: { en: "English body.", mk: "Македонско тело." },
    slug: "english-headline",
    image: { assetId: null, url: null },
  },
  status: "draft",
  hasUnpublishedEdits: false,
  bodyEditable: true,
}

describe("PostEditor — accessibility (zero axe violations)", () => {
  it("create mode", async () => {
    const { container } = render(<PostEditor {...createSingle} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("edit mode, no image", async () => {
    const { container } = render(<PostEditor {...editNoImage} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("edit mode, with image", async () => {
    const { container } = render(<PostEditor {...editWithImage} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })

  it("edit mode, multi-locale", async () => {
    const { container } = render(<PostEditor {...editMultiLocale} />)
    expect(await axe(container, WCAG_AA)).toHaveNoViolations()
  })
})

describe("PostEditor — semantics", () => {
  it("has exactly one h1, named for the mode", () => {
    render(<PostEditor {...createSingle} />)
    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe("New post")
  })

  it("labels every field and the featured-image input", () => {
    // Single-locale: each label is unique (multi-locale intentionally repeats a
    // label per language, with only the active panel exposed — axe covers that).
    render(<PostEditor {...editNoImage} />)
    // Fields are reachable by their associated <Label>.
    expect(screen.getByLabelText("Headline")).toBeTruthy()
    expect(screen.getByLabelText("Summary")).toBeTruthy()
    expect(screen.getByLabelText("Body")).toBeTruthy()
    expect(screen.getByLabelText("URL slug")).toBeTruthy()
    expect(screen.getByLabelText("Featured image")).toBeTruthy()
  })

  it("tags non-UI-language fields with the correct lang attribute", () => {
    render(<PostEditor {...editMultiLocale} />)
    // The Macedonian content fields — headline, summary, AND body — carry
    // lang="mk" so a screen reader switches voice; English fields carry none.
    const mkTitle = document.querySelector<HTMLInputElement>('input[name="title.mk"]')
    const mkExcerpt = document.querySelector<HTMLTextAreaElement>('textarea[name="excerpt.mk"]')
    const mkBody = document.querySelector<HTMLTextAreaElement>('textarea[name="body.mk"]')
    const enTitle = document.querySelector<HTMLInputElement>('input[name="title.en"]')
    const enBody = document.querySelector<HTMLTextAreaElement>('textarea[name="body.en"]')
    expect(mkTitle?.getAttribute("lang")).toBe("mk")
    expect(mkExcerpt?.getAttribute("lang")).toBe("mk")
    expect(mkBody?.getAttribute("lang")).toBe("mk")
    expect(enTitle?.getAttribute("lang")).toBeNull()
    expect(enBody?.getAttribute("lang")).toBeNull()
  })

  it("gives icon-bearing action buttons discernible names", () => {
    render(<PostEditor {...editNoImage} />)
    expect(screen.getByRole("button", { name: "Save draft" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Choose image" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeTruthy()
  })
})

describe("PostEditor — locale tabs (keyboard)", () => {
  it("exposes tablist semantics with a roving tabindex", () => {
    render(<PostEditor {...editMultiLocale} />)
    const tablist = screen.getByRole("tablist", { name: "Content language" })
    expect(tablist).toBeTruthy()
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(2)
    expect(tabs[0].getAttribute("aria-selected")).toBe("true")
    expect(tabs[0].getAttribute("tabindex")).toBe("0")
    expect(tabs[1].getAttribute("tabindex")).toBe("-1")
    // Each tab controls its panel; only the active panel is in the a11y tree.
    expect(tabs[0].getAttribute("aria-controls")).toBe("locale-panel-en")
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1)
  })

  it("moves selection and focus with the arrow keys (wrapping)", async () => {
    const user = userEvent.setup()
    render(<PostEditor {...editMultiLocale} />)
    const tabs = screen.getAllByRole("tab")

    tabs[0].focus()
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[1].getAttribute("aria-selected")).toBe("true")
    expect(tabs[0].getAttribute("aria-selected")).toBe("false")

    // ArrowRight on the last tab wraps to the first.
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0].getAttribute("aria-selected")).toBe("true")

    // Home / End jump to the ends.
    await user.keyboard("{End}")
    expect(document.activeElement).toBe(tabs[1])
    await user.keyboard("{Home}")
    expect(document.activeElement).toBe(tabs[0])
  })
})

describe("PostEditor — delete confirmation (keyboard + focus)", () => {
  it("opens a modal, traps focus, closes on Escape, and restores focus to the trigger", async () => {
    const user = userEvent.setup()
    render(<PostEditor {...editNoImage} />)

    const trigger = screen.getByRole("button", { name: /^delete$/i })
    await user.click(trigger)

    const dialog = await screen.findByRole("alertdialog")
    // Title + description are associated by the primitive (accessible name/desc).
    expect(
      screen.getByRole("heading", { name: /delete this post\?/i }),
    ).toBeTruthy()
    // Focus is moved into the modal (focus trap).
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Escape closes it and returns focus to the trigger that opened it.
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    )
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe("PostEditor — pending states announce to assistive tech", () => {
  it("marks the image upload busy and announces it via a status region", async () => {
    const user = userEvent.setup()
    // Hold the upload promise open so the pending UI is observable, then settle
    // it so the transition unwinds cleanly before unmount.
    let resolveUpload: (v: {
      ok: boolean
      assetId: string | null
      url: string | null
      error: string | null
    }) => void = () => {}
    vi.mocked(uploadImageAction).mockImplementationOnce(
      () => new Promise((res) => (resolveUpload = res)),
    )

    render(<PostEditor {...editNoImage} />)
    const fileInput = screen.getByLabelText("Featured image")
    await user.upload(
      fileInput,
      new File(["x"], "photo.png", { type: "image/png" }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image" }).getAttribute("aria-busy"),
      ).toBe("true"),
    )
    const status = await screen.findByText("Uploading image…")
    expect(status.getAttribute("role")).toBe("status")

    resolveUpload({ ok: false, assetId: null, url: null, error: null })
    await waitFor(() =>
      expect(screen.queryByText("Uploading image…")).toBeNull(),
    )
  })

  it("marks delete busy and announces it via an sr-only status region", async () => {
    const user = userEvent.setup()
    let resolveDelete: (v: { ok: boolean; error: string | null }) => void = () => {}
    vi.mocked(deletePostAction).mockImplementationOnce(
      () => new Promise((res) => (resolveDelete = res)),
    )

    render(<PostEditor {...editNoImage} />)
    await user.click(screen.getByRole("button", { name: /^delete$/i }))
    await screen.findByRole("alertdialog")
    await user.click(screen.getByRole("button", { name: "Delete post" }))

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Deleting…" }).getAttribute("aria-busy"),
      ).toBe("true"),
    )
    const status = await screen.findByText("Deleting your post…")
    expect(status.getAttribute("role")).toBe("status")

    resolveDelete({ ok: false, error: null })
    await waitFor(() =>
      expect(screen.queryByText("Deleting your post…")).toBeNull(),
    )
  })
})
