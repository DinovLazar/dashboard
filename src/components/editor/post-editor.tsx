"use client"

import { useActionState, useRef, useState, useTransition } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  ImagePlus,
  Loader2,
  Lock,
  Send,
  Trash2,
  X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import {
  createPostAction,
  deletePostAction,
  publishPostAction,
  saveDraftAction,
  uploadImageAction,
  type EditorActionState,
  type ImageUploadState,
} from "@/app/(portal)/posts/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * The config-driven post editor (B.05). A Client Component that receives ONLY
 * serializable, non-secret props — never the tenant or token. The per-locale
 * field values, the client's locales, and the post's status are derived on the
 * server (from the resolved config) and passed in; the mutating Server Actions
 * are imported directly and re-authorize on every submit.
 *
 * Inputs are named `title.<locale>` / `excerpt.<locale>` / `body.<locale>` (the
 * slug is `slug`) so the actions can read them per locale. All locale field
 * groups stay mounted (inactive ones merely hidden) so a multi-locale submit
 * carries every language. When the body is too rich to edit as plain text it is
 * shown read-only and a `bodyEditable=false` flag tells the action to preserve it.
 */

type LocaleValues = Record<string, string>

export interface PostEditorProps {
  mode: "create" | "edit"
  /** The client's content locales (single-locale → no tabs). */
  locales: string[]
  initial: {
    /** Present in edit mode — the logical post id. */
    id?: string
    title: LocaleValues
    excerpt: LocaleValues
    body: LocaleValues
    slug: string
    /**
     * The currently-attached featured image (B.06). `assetId`/`url` are non-secret
     * (the asset reference + a public `cdn.sanity.io` URL); both null when none.
     */
    image?: { assetId: string | null; url: string | null }
  }
  /** Edit mode only. */
  status?: "draft" | "published"
  hasUnpublishedEdits?: boolean
  /** Edit mode: false hides the body behind a read-only "edit in Sanity" note. */
  bodyEditable?: boolean
}

const INITIAL_STATE: EditorActionState = { ok: false, error: null }
const INITIAL_IMAGE_STATE: ImageUploadState = {
  ok: false,
  assetId: null,
  url: null,
  error: null,
}

const textareaClass =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60 md:text-sm dark:bg-input/30"

/** Friendly language name for a locale tab, falling back to the upper-case code. */
const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  mk: "Macedonian",
  es: "Spanish",
}
function localeName(loc: string): string {
  return LOCALE_NAMES[loc] ?? loc.toUpperCase()
}

export function PostEditor({
  mode,
  locales,
  initial,
  status,
  hasUnpublishedEdits,
  bodyEditable = true,
}: PostEditorProps) {
  const localeList = locales.length > 0 ? locales : ["en"]
  const multi = localeList.length > 1
  const [activeLocale, setActiveLocale] = useState(localeList[0])

  // Each action has its own state + pending flag; they share the same form fields.
  const [createState, createDispatch, createPending] = useActionState(
    createPostAction,
    INITIAL_STATE,
  )
  const [saveState, saveDispatch, savePending] = useActionState(
    saveDraftAction,
    INITIAL_STATE,
  )
  const [publishState, publishDispatch, publishPending] = useActionState(
    publishPostAction,
    INITIAL_STATE,
  )

  // Featured image (B.06): uploaded separately from Save/Publish via its own
  // transition, so its bytes never ride along with a normal save. The chosen asset
  // id flows into the main form through the hidden `image`/`imageOriginal` inputs.
  const [image, setImage] = useState<{
    assetId: string | null
    url: string | null
  }>(initial.image ?? { assetId: null, url: null })
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadPending, startUpload] = useTransition()
  const imageOriginal = initial.image?.assetId ?? ""

  const busy =
    createPending || savePending || publishPending || uploadPending
  const primaryAction = mode === "create" ? createDispatch : saveDispatch
  const error = createState.error ?? saveState.error ?? publishState.error
  const savedOk = (saveState.ok || createState.ok) && !busy
  const publishedOk = publishState.ok && !busy

  /**
   * Upload the picked file via its own Server Action (never with Save/Publish).
   * On success the preview + hidden field follow `image`; on failure the current
   * image is left in place and a friendly inline error is shown.
   */
  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so re-picking the same file still fires `change`.
    e.target.value = ""
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    startUpload(async () => {
      const result = await uploadImageAction(INITIAL_IMAGE_STATE, fd)
      if (result.ok && result.assetId) {
        setImage({ assetId: result.assetId, url: result.url })
        setImageError(null)
      } else {
        setImageError(result.error)
      }
    })
  }

  /** Clear the current image (Save/Publish will then drop it from the post). */
  function handleRemoveImage() {
    setImage({ assetId: null, url: null })
    setImageError(null)
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/posts"
            className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-small text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to posts
          </Link>
          <h1 className="text-h2 text-foreground">
            {mode === "create" ? "New post" : "Edit post"}
          </h1>
        </div>
        {mode === "edit" && status ? (
          <StatusPill status={status} hasUnpublishedEdits={!!hasUnpublishedEdits} />
        ) : null}
      </div>

      <form action={primaryAction} className="flex flex-col gap-6">
        {mode === "edit" && initial.id ? (
          <input type="hidden" name="id" value={initial.id} readOnly />
        ) : null}
        <input
          type="hidden"
          name="bodyEditable"
          value={bodyEditable ? "true" : "false"}
          readOnly
        />
        {/* Featured image intent carried into Save/Publish (B.06): `image` is the
            currently-chosen asset id; `imageOriginal` is what the form loaded with.
            The action compares them to preserve / write / clear the image. */}
        <input
          type="hidden"
          name="image"
          value={image.assetId ?? ""}
          readOnly
        />
        <input
          type="hidden"
          name="imageOriginal"
          value={imageOriginal}
          readOnly
        />

        {multi ? (
          <LocaleTabs
            locales={localeList}
            active={activeLocale}
            onSelect={setActiveLocale}
          />
        ) : null}

        {localeList.map((loc) => {
          const langAttr = loc === "en" ? undefined : loc
          return (
            <div
              key={loc}
              // When multi-locale these groups are tab panels: each is associated
              // with its tab and the inactive ones are `hidden` (removed from the
              // a11y tree) — yet all stay mounted so a submit carries every locale.
              role={multi ? "tabpanel" : undefined}
              id={multi ? `locale-panel-${loc}` : undefined}
              aria-labelledby={multi ? `locale-tab-${loc}` : undefined}
              hidden={multi && loc !== activeLocale}
              className="flex flex-col gap-6"
            >
              <Field
                id={`title-${loc}`}
                label="Headline"
                hint={multi ? localeName(loc) : undefined}
              >
                <Input
                  id={`title-${loc}`}
                  name={`title.${loc}`}
                  defaultValue={initial.title[loc] ?? ""}
                  placeholder="Your post title"
                  autoComplete="off"
                  lang={langAttr}
                />
              </Field>

              <Field
                id={`excerpt-${loc}`}
                label="Summary"
                hint={multi ? localeName(loc) : undefined}
              >
                <textarea
                  id={`excerpt-${loc}`}
                  name={`excerpt.${loc}`}
                  defaultValue={initial.excerpt[loc] ?? ""}
                  placeholder="A short summary shown in listings and previews."
                  rows={2}
                  className={textareaClass}
                  lang={langAttr}
                />
              </Field>

              <Field
                id={`body-${loc}`}
                label="Body"
                hint={multi ? localeName(loc) : undefined}
              >
                {bodyEditable ? (
                  <textarea
                    id={`body-${loc}`}
                    name={`body.${loc}`}
                    defaultValue={initial.body[loc] ?? ""}
                    placeholder="Write your post. Separate paragraphs with a blank line."
                    rows={14}
                    className={textareaClass}
                    lang={langAttr}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <textarea
                      id={`body-${loc}`}
                      defaultValue={initial.body[loc] ?? ""}
                      rows={10}
                      disabled
                      className={textareaClass}
                      lang={langAttr}
                      aria-describedby={`body-rich-${loc}`}
                    />
                    <p
                      id={`body-rich-${loc}`}
                      className="flex items-center gap-1.5 text-small text-accent-gold"
                    >
                      <Lock className="size-3.5 shrink-0" aria-hidden />
                      This post has rich formatting — edit its body in Sanity so
                      nothing is lost.
                    </p>
                  </div>
                )}
              </Field>
            </div>
          )
        })}

        <Field id="slug" label="URL slug" optional>
          <Input
            id="slug"
            name="slug"
            defaultValue={initial.slug}
            placeholder="my-post-title"
            autoComplete="off"
          />
        </Field>

        {/* Featured image (B.06) — pick → upload → preview → remove/replace. */}
        <FeaturedImageField
          image={image}
          uploadPending={uploadPending}
          error={imageError}
          disabled={busy}
          onPick={handlePickImage}
          onRemove={handleRemoveImage}
        />

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 text-small text-destructive"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {!error && (savedOk || publishedOk) ? (
          <p
            aria-live="polite"
            className="flex items-center gap-2 text-small text-accent-success"
          >
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {publishedOk
              ? "Published — your live site will update shortly."
              : mode === "create"
                ? "Draft created."
                : "Draft saved."}
          </p>
        ) : null}

        {/* Politely announces the in-progress action to assistive tech (the
            visible spinner + button-label change cover sighted users; the
            success / error messages above announce the result). */}
        <p className="sr-only" role="status" aria-live="polite">
          {savePending || createPending
            ? "Saving your draft…"
            : publishPending
              ? "Publishing your post…"
              : ""}
        </p>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={busy}
              aria-busy={savePending || createPending}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 sm:h-9",
              )}
            >
              {savePending || createPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save draft"
              )}
            </button>

            {mode === "edit" ? (
              <button
                type="submit"
                formAction={publishDispatch}
                disabled={busy}
                aria-busy={publishPending}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "h-11 sm:h-9",
                )}
              >
                {publishPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Publishing…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden />
                    Publish
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {mode === "edit" && initial.id ? (
        <DeletePost id={initial.id} disabled={busy} />
      ) : null}
    </div>
  )
}

/** A labelled field wrapper (label + optional language/optional hint + control). */
function Field({
  id,
  label,
  hint,
  optional,
  children,
}: {
  id: string
  label: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <span className="text-micro text-muted-foreground">{hint}</span>
        ) : optional ? (
          <span className="text-micro text-muted-foreground">Optional</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/**
 * Accessible locale tabs (B.08). A proper WAI-ARIA tablist: roving tabindex (only
 * the selected tab is in the tab order), arrow-key navigation (Left/Right wrap,
 * Home/End jump to ends), and each tab associated with its panel via
 * `aria-controls` (the panels live in the form and carry the matching ids). The
 * panels stay mounted regardless of which tab is active, so submitting still
 * carries every locale's fields — selection only toggles visibility.
 */
function LocaleTabs({
  locales,
  active,
  onSelect,
}: {
  locales: string[]
  active: string
  onSelect: (loc: string) => void
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = locales.length - 1
    let next: number
    switch (e.key) {
      case "ArrowRight":
        next = index === last ? 0 : index + 1
        break
      case "ArrowLeft":
        next = index === 0 ? last : index - 1
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
      default:
        return
    }
    e.preventDefault()
    const loc = locales[next]
    onSelect(loc)
    tabRefs.current[loc]?.focus()
  }

  return (
    <div role="tablist" aria-label="Content language" className="flex flex-wrap gap-1.5">
      {locales.map((loc, index) => {
        const selected = loc === active
        return (
          <button
            key={loc}
            ref={(el) => {
              tabRefs.current[loc] = el
            }}
            type="button"
            role="tab"
            id={`locale-tab-${loc}`}
            aria-selected={selected}
            aria-controls={`locale-panel-${loc}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(loc)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              buttonVariants({
                variant: selected ? "secondary" : "ghost",
                size: "sm",
              }),
              "h-9",
            )}
          >
            {localeName(loc)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The featured-image control (B.06). Shows the current image (or an empty state),
 * a Choose/Replace trigger that opens the file picker, and a Remove button. The
 * actual upload runs through `uploadImageAction` (driven by the parent); the file
 * input is unnamed so its bytes are NEVER submitted with Save/Publish — only the
 * resulting asset id rides along, via the parent's hidden inputs.
 */
function FeaturedImageField({
  image,
  uploadPending,
  error,
  disabled,
  onPick,
  onRemove,
}: {
  image: { assetId: string | null; url: string | null }
  uploadPending: boolean
  error: string | null
  disabled: boolean
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(image.assetId)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="image-file">Featured image</Label>
        <span className="text-micro text-muted-foreground">Optional</span>
      </div>

      {hasImage && image.url ? (
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-card border border-border bg-secondary">
          <Image
            src={image.url}
            alt="Featured image preview"
            fill
            sizes="(max-width: 640px) 100vw, 24rem"
            className="object-cover"
          />
        </div>
      ) : hasImage ? (
        // An image is attached but its URL didn't resolve — still a valid state.
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface/40 px-4 py-5 text-muted-foreground">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"
            aria-hidden
          >
            <ImageIcon className="size-5" />
          </span>
          <span className="text-small text-foreground">Image attached</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface/40 px-4 py-5 text-muted-foreground">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"
            aria-hidden
          >
            <ImageIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-small text-foreground">No image yet</span>
            <span className="text-micro">
              Add a featured image — JPG, PNG, WebP, or GIF, up to 4&nbsp;MB.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-busy={uploadPending}
        >
          {uploadPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          {hasImage ? "Replace image" : "Choose image"}
        </Button>
        {hasImage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
          >
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>

      {/* Unnamed on purpose: the file is uploaded via its own action, never sent
          with the editor form, so a Save never re-uploads the image bytes. */}
      <input
        ref={fileInputRef}
        id="image-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={onPick}
        disabled={disabled}
      />

      {uploadPending ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-small text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Uploading image…
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 text-small text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** The draft/published status pill on the edit screen. */
function StatusPill({
  status,
  hasUnpublishedEdits,
}: {
  status: "draft" | "published"
  hasUnpublishedEdits: boolean
}) {
  const published = status === "published"
  return (
    <span className="inline-flex h-fit shrink-0 items-center gap-1.5 rounded-pill border border-border bg-secondary px-3 py-1 text-micro font-medium text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          published ? "bg-accent-success" : "bg-accent-gold",
        )}
        aria-hidden
      />
      {published ? "Published" : "Draft"}
      {hasUnpublishedEdits ? (
        <span className="text-muted-foreground">· Unpublished edits</span>
      ) : null}
    </span>
  )
}

/**
 * Delete with a confirmation dialog. The confirm step is a real modal
 * (`AlertDialog`) so it traps focus while open, closes on Escape, and returns
 * focus to the "Delete" trigger on close — and, because it's modal, the rest of
 * the editor is inert while the confirmation is up, so no conflicting control can
 * be operated mid-delete. The actual delete is the same Server Action as before;
 * on success it redirects to the list, on failure it shows a non-leaking error
 * inside the dialog.
 */
function DeletePost({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, dispatch, pending] = useActionState(
    deletePostAction,
    INITIAL_STATE,
  )
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-small font-medium text-foreground">Delete post</h2>
        <p className="text-micro text-muted-foreground">
          Permanently removes this post (draft and published) from your site.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "destructive", size: "lg" }),
            "h-11 self-start sm:h-9 sm:self-auto",
          )}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the post — both its draft and published
            versions — from your site. This can&rsquo;t be undone.
          </AlertDialogDescription>

          <form action={dispatch}>
            <input type="hidden" name="id" value={id} readOnly />
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={pending}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 sm:h-9",
                )}
              >
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className={cn(
                  buttonVariants({ variant: "destructive", size: "lg" }),
                  "h-11 sm:h-9",
                )}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" aria-hidden />
                    Delete post
                  </>
                )}
              </button>
            </AlertDialogFooter>
          </form>

          {/* Announces the in-progress delete to assistive tech (the visible
              spinner + button-label change cover sighted users; the error below
              announces a failure; success redirects to the list). Mirrors the
              main form's sr-only status region for Save/Publish. */}
          <p className="sr-only" role="status" aria-live="polite">
            {pending ? "Deleting your post…" : ""}
          </p>

          {state.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="flex items-center gap-2 text-small text-destructive"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
