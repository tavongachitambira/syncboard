"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

/*
 * Dialog = a modal. It blocks the page, so it is for a decision that must be made now
 * (Modal Hierarchy). Ask "does this block the user?": yes -> Dialog; no -> Popover,
 * Sheet or an edge drawer. A routine, non-blocking action never gets a full-screen scrim,
 * and navigation never lives in a modal.
 *
 *  - Focus is trapped while open and returns to the trigger on close; Esc always closes
 *    (`dismissible={false}` only stops outside clicks, so a stray tap can't lose a draft).
 *  - The header and footer stay pinned; only `DialogBody` scrolls.
 *  - Scrim = dim + blur at z-(--z-scrim); the dialog sits at z-(--z-dialog), below popovers
 *    and toasts so a select inside a dialog is never clipped.
 *  - Enters with the restrained spring (240ms), leaves in 150ms.
 *  - Buttons: primary on the end, verb + object labels ("Save changes"). On phones the
 *    footer stacks with the primary action on top, in thumb reach.
 *  - Phones: prefer ResponsiveDialog (a bottom sheet below 40rem).
 */

const dialogVariants = cva(
  [
    "group/dialog fixed inset-0 z-(--z-dialog) m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden",
    "rounded-dialog border border-border-strong bg-popover text-popover-foreground shadow-dialog outline-hidden",
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-(--duration-enter) data-[state=open]:ease-(--ease-spring)",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-(--duration-exit) data-[state=closed]:ease-(--ease-exit)",
  ],
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "scrim fixed inset-0 z-(--z-scrim)",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-(--duration-enter)",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-(--duration-exit)",
        className
      )}
      {...props}
    />
  )
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogVariants> & {
    /** false = a click outside does not close it (a form with unsaved input). Esc still closes. */
    dismissible?: boolean
    showClose?: boolean
  }

function DialogContent({
  className,
  children,
  size,
  dismissible = true,
  showClose = true,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-size={size ?? "md"}
        onInteractOutside={(event) => {
          if (!dismissible) event.preventDefault()
          onInteractOutside?.(event)
        }}
        className={cn(dialogVariants({ size }), className)}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              className="absolute end-3 top-3"
            >
              <XIcon />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-3 pe-14", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** The only part that scrolls; header and footer stay pinned. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "scrollbar-subtle flex-1 overflow-y-auto overscroll-contain px-5 py-3",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  dialogVariants,
}
