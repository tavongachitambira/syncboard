"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  Toaster as Sonner,
  toast as sonnerToast,
  type ExternalToast,
  type ToasterProps,
} from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { Button } from "@workspace/ui/components/button"
import { Shortcut } from "@workspace/ui/components/kbd"
import { Spinner } from "@workspace/ui/components/spinner"

/*
 * Toasts are for passive confirmation. They never ask for a decision (that is a dialog) and
 * never carry the only copy of an error (that lives next to the field or in a banner).
 *
 *  - surface:  popover surface + 12% hairline + overlay shadow. No "rich colours": the icon,
 *              the words and a 3px accent on the leading edge carry the type, never colour alone.
 *  - placement: bottom-right on desktop; top-centre on phones (clear of the thumb / keyboard).
 *  - stack:    max 3 visible, the rest queue behind. Hovering pauses every timer.
 *              Swipe to dismiss on touch; a close button for pointer users.
 *  - lifetime: success / info ~4s, warning ~7s, errors persist until dismissed.
 */

/** Auto-dismiss by severity, in ms. */
const TOAST_DURATION = {
  success: 4000,
  info: 4000,
  warning: 7000,
  error: Infinity,
} as const

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const compact = useMediaQuery("(max-width: 40rem)")

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={compact ? "top-center" : "bottom-right"}
      visibleToasts={3}
      closeButton
      gap={8}
      icons={{
        success: <CircleCheckIcon className="optical-round size-4 text-success" />,
        info: <InfoIcon className="optical-round size-4 text-muted-foreground" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Spinner />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border-strong)",
          "--border-radius": "var(--radius-card)",
          zIndex: "var(--z-toast)",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: TOAST_DURATION.info,
        classNames: {
          toast: [
            "shadow-overlay! text-sm! border-s-[3px]!",
            "data-[type=success]:border-s-success! data-[type=warning]:border-s-warning! data-[type=error]:border-s-destructive!",
          ].join(" "),
          title: "font-medium!",
          description: "text-muted-foreground!",
          closeButton: "bg-popover! text-muted-foreground! border-border-strong!",
        },
      }}
      {...props}
    />
  )
}

type ToastMessage = Parameters<typeof sonnerToast>[0]

function withSeverityDuration(kind: keyof typeof TOAST_DURATION) {
  return (message: ToastMessage, data?: ExternalToast) =>
    sonnerToast[kind](message, { duration: TOAST_DURATION[kind], ...data })
}

/**
 * Sonner's `toast` with the severity lifetimes above as defaults. Pass `duration` to override
 * (an error that is safe to auto-dismiss: `toast.error("…", { duration: 7000 })`).
 */
const toast: typeof sonnerToast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) =>
    sonnerToast(message, { duration: TOAST_DURATION.info, ...data }),
  sonnerToast,
  {
    success: withSeverityDuration("success"),
    info: withSeverityDuration("info"),
    warning: withSeverityDuration("warning"),
    error: withSeverityDuration("error"),
  }
)

/* ------------------------------------------------------------------ */
/* Undo toast: act now, offer a time-limited undo with a visible countdown. */
/* ------------------------------------------------------------------ */

/** Undo window in ms: 5s for one action, ~10s for a bulk action (more to re-check). */
const UNDO_DURATION = { single: 5000, bulk: 10_000 } as const

/** Most recent undo toast first; only the top of the stack answers Cmd/Ctrl+Z. */
const undoStack: Array<string | number> = []

function UndoToast({
  id,
  message,
  duration,
  onUndo,
}: {
  id: string | number
  message: React.ReactNode
  duration: number
  onUndo: () => void | Promise<void>
}) {
  const undo = React.useCallback(() => {
    sonnerToast.dismiss(id)
    void onUndo()
  }, [id, onUndo])

  React.useEffect(() => {
    undoStack.push(id)
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.key.toLowerCase() !== "z"
      ) {
        return
      }
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return
      }
      if (undoStack[undoStack.length - 1] !== id) return
      event.preventDefault()
      undo()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      const index = undoStack.indexOf(id)
      if (index !== -1) undoStack.splice(index, 1)
    }
  }, [id, undo])

  return (
    <div
      role="status"
      data-slot="undo-toast"
      className="group/undo relative flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-3 overflow-hidden rounded-card border border-border-strong bg-popover py-2.5 ps-3.5 pe-2 text-sm text-popover-foreground shadow-overlay"
    >
      <span className="min-w-0 flex-1">{message}</span>
      <Button variant="ghost" size="sm" onClick={undo} className="text-link">
        Undo
        <Shortcut keys={["mod", "Z"]} className="ms-1" />
      </Button>
      <span
        aria-hidden="true"
        data-slot="undo-countdown"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-drain bg-primary group-hover/undo:[animation-play-state:paused] rtl:origin-right"
        style={{ "--drain-duration": `${duration}ms` } as React.CSSProperties}
      />
    </div>
  )
}

type UndoToastOptions = {
  message: React.ReactNode
  onUndo: () => void | Promise<void>
  /** A bulk action gets the longer window (~10s). */
  bulk?: boolean
  /** Explicit window in ms; wins over `bulk`. */
  duration?: number
}

function undoToast({ message, onUndo, bulk = false, duration }: UndoToastOptions) {
  const window_ = duration ?? (bulk ? UNDO_DURATION.bulk : UNDO_DURATION.single)
  return sonnerToast.custom(
    (id) => (
      <UndoToast id={id} message={message} duration={window_} onUndo={onUndo} />
    ),
    { duration: window_ }
  )
}

export { Toaster, toast, undoToast, TOAST_DURATION, UNDO_DURATION }
