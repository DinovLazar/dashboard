"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"

/**
 * Accessible confirmation dialog (shadcn `base-nova` style, on `@base-ui/react`'s
 * Alert Dialog primitive). Used for irreversible actions (e.g. deleting a post).
 *
 * The primitive gives us the accessibility contract for free, which is exactly
 * what B.08 needs:
 *  - `role="alertdialog"` + `aria-modal`, with the title/description programmatically
 *    associated (via `AlertDialogTitle` / `AlertDialogDescription`);
 *  - focus is trapped inside the popup while open;
 *  - Escape closes it;
 *  - focus returns to the trigger on close (`finalFocus` default);
 *  - the rest of the page is inert while it's open, so no conflicting control can
 *    be operated mid-action.
 *
 * It is pointer-non-dismissable by design (Alert Dialog, not Dialog): a click on
 * the backdrop will not dismiss a destructive confirmation — only Cancel, Escape,
 * or completing the action closes it.
 */

const AlertDialog = AlertDialogPrimitive.Root

function AlertDialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger
      data-slot="alert-dialog-trigger"
      className={className}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Popup>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-card border border-border bg-popover p-5 text-popover-foreground shadow-2xl shadow-black/40 outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-h3 text-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-small text-muted-foreground", className)}
      {...props}
    />
  )
}

/** Layout row for the dialog's actions (stacks on a phone, inline from `sm`). */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

/** Dismiss button — closes the dialog and returns focus to the trigger. */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={className}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
}
