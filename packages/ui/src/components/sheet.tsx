"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cva } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

/*
 * Sheet = a non-blocking-feeling panel that keeps the page visible behind it.
 *  - side="bottom" (the mobile default): primary actions sit within thumb reach, a drag
 *    handle, drag-to-dismiss, optional snap points. Never park a frequent menu in the
 *    top-right dead zone: open it here instead.
 *  - side="start" | "end": an edge drawer (navigation, details). It covers only its own
 *    width and the app stays live behind the dim.
 *  The page behind is dimmed and its scroll is locked while open (Radix), so only the sheet
 *  moves. A visible Close button and Esc are always there for people who cannot drag.
 *  Give every sheet a SheetTitle (screen readers) and a SheetDescription when it helps.
 *
 * Gesture numbers are not given by the pattern; chosen here: dismiss past 96px of drag or
 * a flick faster than 0.5px/ms, change snap point past 64px.
 */
const DISMISS_DISTANCE = 96
const DISMISS_VELOCITY = 0.5
const SNAP_DISTANCE = 64

const sheetVariants = cva(
  [
    "fixed z-(--z-dialog) flex flex-col bg-popover text-popover-foreground shadow-dialog outline-hidden",
    "data-[state=open]:animate-in data-[state=open]:duration-(--duration-enter) data-[state=open]:ease-(--ease-spring)",
    "data-[state=closed]:animate-out data-[state=closed]:duration-(--duration-exit) data-[state=closed]:ease-(--ease-exit)",
  ],
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 max-h-[calc(100dvh-1rem)] rounded-t-dialog border-t border-border-strong pb-[env(safe-area-inset-bottom)] transition-[height,transform] duration-(--duration-card) data-[dragging=true]:transition-none data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        start:
          "inset-y-0 start-0 w-[min(22rem,85vw)] border-e border-border-strong data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right",
        end: "inset-y-0 end-0 w-[min(26rem,92vw)] border-s border-border-strong data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left",
      },
    },
    defaultVariants: { side: "bottom" },
  }
)

function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function SheetTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "bottom" | "start" | "end"
  /** Bottom only: resting heights as fractions of the viewport, lowest first, e.g. [0.5, 0.92]. */
  snapPoints?: readonly number[]
}

function SheetContent({
  className,
  children,
  side = "bottom",
  snapPoints,
  style,
  ...props
}: SheetContentProps) {
  const [snap, setSnap] = React.useState(0)
  const [dy, setDy] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const gesture = React.useRef({ startY: 0, lastY: 0, lastT: 0, velocity: 0 })

  const snaps = snapPoints && snapPoints.length > 0 ? snapPoints : undefined
  const fraction = snaps ? snaps[Math.min(snap, snaps.length - 1)] : undefined

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
    }
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const g = gesture.current
    const elapsed = event.timeStamp - g.lastT
    if (elapsed > 0) g.velocity = (event.clientY - g.lastY) / elapsed
    g.lastY = event.clientY
    g.lastT = event.timeStamp
    setDy(event.clientY - g.startY)
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    const down = dy > 0
    if (down && (dy > DISMISS_DISTANCE || gesture.current.velocity > DISMISS_VELOCITY)) {
      if (snap > 0) setSnap(snap - 1)
      else closeRef.current?.click()
    } else if (!down && dy < -SNAP_DISTANCE && snaps && snap < snaps.length - 1) {
      setSnap(snap + 1)
    }
    setDy(0)
  }

  const bottom = side === "bottom"

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="sheet-overlay"
        className={cn(
          "scrim fixed inset-0 z-(--z-scrim)",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-(--duration-enter)",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-(--duration-exit)"
        )}
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        data-dragging={dragging ? "true" : undefined}
        className={cn(sheetVariants({ side }), className)}
        style={{
          ...style,
          height: bottom && fraction ? `${fraction * 100}dvh` : undefined,
          transform:
            bottom && dy
              ? `translateY(${dy < 0 ? Math.max(dy, -32) : dy}px)`
              : undefined,
        }}
        {...props}
      >
        {bottom ? (
          <div
            data-slot="sheet-handle"
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex h-6 shrink-0 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing pointer-coarse:h-8"
          >
            <span className="h-1 w-9 rounded-full bg-border-strong" />
          </div>
        ) : null}
        {children}
        <DialogPrimitive.Close asChild>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            className={cn("absolute end-3", bottom ? "top-3" : "top-3")}
          >
            <XIcon />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-5 pt-2 pb-3 pe-14", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        "scrollbar-subtle flex-1 overflow-y-auto overscroll-contain px-5 py-3",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
}
