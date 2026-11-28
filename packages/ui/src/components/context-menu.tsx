"use client"

import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "radix-ui"
import { CheckIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  menuItem,
  menuItemDestructive,
  menuLabel,
  menuMotion,
  menuSeparator,
  menuSurface,
} from "@workspace/ui/lib/menu"
import { Shortcut } from "@workspace/ui/components/kbd"

/*
 * Context Menu (row actions on incidents, services and members).
 *  - Anchored at the pointer; Radix measures the space and flips / mirrors so the menu stays
 *    inside the viewport (8px padding).
 *  - Group by intent with separators; destructive last, separated, soft red.
 *  - Submenus keep a safe triangle (pointer-grace) so diagonal moves don't close them;
 *    Esc closes one level only; letter keys jump to items.
 *  - NEVER the only path: right-click is a shortcut. Pair every ContextMenu with a visible
 *    ActionMenu holding the same items (action-menu.tsx), which becomes a bottom sheet on
 *    touch. Long-press opens this menu on touch devices that support it.
 */

function ContextMenu(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Root>
) {
  return <ContextMenuPrimitive.Root {...props} />
}

function ContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>
) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
}

function ContextMenuGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Group>
) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
}

function ContextMenuSub(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>
) {
  return <ContextMenuPrimitive.Sub {...props} />
}

function ContextMenuRadioGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>
) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        collisionPadding={collisionPadding}
        className={cn(
          menuSurface,
          menuMotion,
          "scrollbar-subtle max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuSubContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      collisionPadding={collisionPadding}
      className={cn(
        menuSurface,
        menuMotion,
        "scrollbar-subtle max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      className={cn(menuLabel, className)}
      {...props}
    />
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant}
      data-inset={inset ? "" : undefined}
      className={cn(
        menuItem,
        variant === "destructive" && menuItemDestructive,
        className
      )}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={cn(menuItem, "data-[state=open]:bg-accent", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto rtl:rotate-180" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(menuSeparator, className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  keys,
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  keys?: string[]
  children?: React.ReactNode
}) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ms-auto ps-4 pointer-coarse:hidden", className)}
      {...props}
    >
      {keys ? <Shortcut keys={keys} /> : children}
    </span>
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
}
