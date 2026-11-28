"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Accordion Disclosure.
 *  - `type="single"` = one panel open at a time (sequential steps); `type="multiple"` = many
 *    may stay open (FAQ lists). Pick by content.
 *  - The header is a real <button> with aria-expanded and aria-controls (Radix), Enter /
 *    Space toggle it, and it has a visible focus ring.
 *  - Panel height animates from a MEASURED pixel height (Radix `--radix-accordion-content-
 *    height`), never `height: auto`. The chevron and the panel share ONE duration and ease
 *    (200ms, the "move" curve), so they travel as a unit.
 *  - Browser scroll anchoring keeps the tapped header in place when a lower item expands
 *    (`overflow-anchor: auto`, the default; do not disable it on a parent).
 *  - 44px header targets on touch. Reduced motion removes the animation globally.
 */

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger focus-ring-inset flex min-h-9 flex-1 items-center justify-between gap-3 py-2 text-start text-sm font-medium ready:hover:text-foreground pointer-coarse:min-h-11",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="shrink-0 text-muted-foreground transition-transform duration-(--duration-card) ease-(--ease-move) group-data-[state=open]/accordion-trigger:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[state=closed]:animate-[accordion-close_var(--duration-card)_var(--ease-move)] data-[state=open]:animate-[accordion-open_var(--duration-card)_var(--ease-move)]"
      {...props}
    >
      <div className={cn("pb-3 text-muted-foreground", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
