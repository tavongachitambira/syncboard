"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  menuItem,
  menuLabel,
  menuMotion,
  menuSeparator,
  menuSurface,
} from "@workspace/ui/lib/menu"

/*
 * Select = pick one of a short, known list (severity, status, role).
 *  - The trigger is obviously clickable: visible caret, real hover state, 36px (44px on
 *    touch) and full width in forms; text is 16px on touch so iOS does not zoom.
 *  - The list opens ~150ms, flips up when there is no room below and never clips.
 *  - Arrows move, Enter/Space select, Esc closes, letters jump (Radix type-ahead).
 *  - The chosen item carries a check as well as the highlight (never colour alone).
 *  - Past ~10 options, use Combobox (it adds the search field).
 */

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "focus-ring flex w-full items-center justify-between gap-2 rounded-control border border-input bg-field px-3 text-sm whitespace-nowrap text-foreground select-none pointer-coarse:text-base",
        "h-9 data-[size=sm]:h-8 pointer-coarse:h-11 pointer-coarse:data-[size=sm]:h-11",
        "ready:hover:bg-muted data-[state=open]:bg-muted data-[placeholder]:text-subtle",
        "aria-invalid:border-destructive",
        "data-[disabled]:cursor-not-allowed data-[disabled]:border-transparent data-[disabled]:bg-secondary data-[disabled]:text-subtle",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn("flex h-6 cursor-default items-center justify-center", className)}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn("flex h-6 cursor-default items-center justify-center", className)}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          menuSurface,
          menuMotion,
          "relative max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) overflow-hidden",
          position === "popper" && "min-w-(--radix-select-trigger-width)",
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "scrollbar-subtle",
            position === "popper" && "w-full scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(menuLabel, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(menuItem, "pe-8 data-[highlighted]:bg-accent", className)}
      {...props}
    >
      <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(menuSeparator, className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
