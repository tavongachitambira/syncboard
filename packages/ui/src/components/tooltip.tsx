"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/*
 * A tooltip names or explains a control in ONE short sentence. It never holds the only copy
 * of something a person needs (touch users may not see it), and it never holds an action.
 *  - 300ms hover delay; once one has closed, the next opens instantly for a moment (skip delay)
 *  - opens on keyboard focus too; closes on pointer leave, blur, Esc, or a tap elsewhere
 *  - flips / slides to stay inside the viewport (8px padding), max ~300px wide
 *  - hoverable: it does not vanish under a pointer that is moving onto it to read it
 * Inverted surface (dark on light, light on dark) so a transient hint never looks like a
 * persistent panel. Mount ONE <TooltipProvider> at the app root.
 */

function TooltipProvider({
  delayDuration = 300,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>
) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  collisionPadding = 8,
  showArrow = true,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  showArrow?: boolean
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-(--z-popover) w-fit max-w-[300px] origin-(--radix-tooltip-content-transform-origin) rounded-tooltip bg-foreground px-2 py-1.5 text-xs leading-snug text-balance text-background shadow-overlay",
          "[&_kbd]:bg-background/20 [&_kbd]:text-background",
          "duration-(--duration-fast) ease-(--ease-enter)",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-(--duration-exit) data-[state=closed]:ease-(--ease-exit)",
          "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
          className
        )}
        {...props}
      >
        {children}
        {showArrow ? (
          <TooltipPrimitive.Arrow
            width={10}
            height={5}
            className="fill-foreground"
          />
        ) : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

/** `<Tip label="Copy link"><Button size="icon" aria-label="Copy link">…</Button></Tip>` */
function Tip({
  label,
  side,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipContent>, "children"> & {
  label: React.ReactNode
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} {...props}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Explains WHY an action is unavailable. Give the child `aria-disabled="true"` (never the
 * `disabled` attribute: a disabled button cannot take focus, so keyboard users would never
 * reach the reason) and keep it clickable-but-inert so the tooltip also opens on tap.
 *   <DisabledReason reason="Only admins can resolve incidents">
 *     <Button aria-disabled="true">Resolve</Button>
 *   </DisabledReason>
 */
function DisabledReason({
  reason,
  children,
}: {
  reason: React.ReactNode
  children: React.ReactElement
}) {
  return <Tip label={reason}>{children}</Tip>
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Tip,
  DisabledReason,
}
