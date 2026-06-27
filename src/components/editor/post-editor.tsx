"use client"

import { useActionState, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Lock,
  Send,
  Trash2,
} from "lucide-react"
import Link from "next/link"

import {
  createPostAction,
  deletePostAction,
  publishPostAction,
  saveDraftAction,
  type EditorActionState,
} from "@/app/(portal)/posts/actions"
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
  }
  /** Edit mode only. */
  status?: "draft" | "published"
  hasUnpublishedEdits?: boolean
  /** Edit mode: false hides the body behind a read-only "edit in Sanity" note. */
  bodyEditable?: boolean
}

const INITIAL_STATE: EditorActionState = { ok: false, error: null }

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

  const busy = createPending || savePending || publishPending
  const primaryAction = mode === "create" ? createDispatch : saveDispatch
  const error = createState.error ?? saveState.error ?? publishState.error
  const savedOk = (saveState.ok || createState.ok) && !busy
  const publishedOk = publishState.ok && !busy

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/posts"
            className="inline-flex w-fit items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
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

        {multi ? (
          <div
            role="tablist"
            aria-label="Content language"
            className="flex flex-wrap gap-1.5"
          >
            {localeList.map((loc) => {
              const selected = loc === activeLocale
              return (
                <button
                  key={loc}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveLocale(loc)}
                  className={cn(
                    buttonVariants({
                      variant: selected ? "secondary" : "ghost",
                      size: "sm",
                    }),
                  )}
                >
                  {localeName(loc)}
                </button>
              )
            })}
          </div>
        ) : null}

        {localeList.map((loc) => (
          <div
            key={loc}
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
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    id={`body-${loc}`}
                    defaultValue={initial.body[loc] ?? ""}
                    rows={10}
                    disabled
                    className={textareaClass}
                  />
                  <p className="flex items-center gap-1.5 text-small text-accent-gold">
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    This post has rich formatting — edit its body in Sanity so
                    nothing is lost.
                  </p>
                </div>
              )}
            </Field>
          </div>
        ))}

        <Field id="slug" label="URL slug" optional>
          <Input
            id="slug"
            name="slug"
            defaultValue={initial.slug}
            placeholder="my-post-title"
            autoComplete="off"
          />
        </Field>

        {/* Featured image — present but inert until B.06. */}
        <Field id="image" label="Featured image" optional>
          <div className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface/40 px-4 py-5 text-muted-foreground">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"
              aria-hidden
            >
              <ImageIcon className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-small text-foreground">
                Image upload arrives soon
              </span>
              <span className="text-micro">
                You&rsquo;ll be able to add a featured image here in an upcoming
                update.
              </span>
            </div>
          </div>
        </Field>

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

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              {savePending || createPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {mode === "create" ? "Save draft" : "Save draft"}
            </button>

            {mode === "edit" ? (
              <button
                type="submit"
                formAction={publishDispatch}
                disabled={busy}
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                {publishPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                Publish
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
        <span className="text-muted-foreground/70">· Unpublished edits</span>
      ) : null}
    </span>
  )
}

/** Delete with a confirm step, in its own form/action. */
function DeletePost({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, dispatch, pending] = useActionState(
    deletePostAction,
    INITIAL_STATE,
  )
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-card/30 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-small font-medium text-foreground">Delete post</h2>
          <p className="text-micro text-muted-foreground">
            Permanently removes this post (draft and published) from your site.
          </p>
        </div>

        <form action={dispatch} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} readOnly />
          {confirming ? (
            <>
              <button
                type="submit"
                disabled={pending || disabled}
                className={cn(
                  buttonVariants({ variant: "destructive", size: "lg" }),
                )}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Confirm delete
              </button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={disabled}
              className={cn(
                buttonVariants({ variant: "destructive", size: "lg" }),
              )}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
          )}
        </form>
      </div>

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
    </div>
  )
}
