"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
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
 * Dropdown Design + Context Menu rules that the primitive does not do on its own:
 *  - opens ~150ms, flips up / mirrors sideways to stay inside the viewport (Radix collision
 *    handling, 8px padding), never clips off the bottom (max-height = available height);
 *  - arrows move, Enter selects, Esc closes ONE level, letters jump to items (type-ahead);
 *  - submenus use Radix's pointer-grace "safe triangle", so diagonal movement towards a
 *    submenu does not close it;
 *  - group actions by intent with <DropdownMenuSeparator/>; the destructive item goes last,
 *    separated, with `variant="destructive"`;
 *  - lists past ~10 items need a search field: use Combobox instead of a menu.
 * Triggers should be obviously clickable (visible caret, hover state, 44px target on touch).
 */

function DropdownMenu(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>
) {
  return <DropdownMenuPrimitive.Root {...props} />
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>
) {
  return (
    <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
  )
}

function DropdownMenuGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>
) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuPortal(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>
) {
  return <DropdownMenuPrimitive.Portal {...props} />
}

function DropdownMenuSub(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>
) {
  return <DropdownMenuPrimitive.Sub {...props} />
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>
) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          menuSurface,
          menuMotion,
          "scrollbar-subtle max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuSubContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      collisionPadding={collisionPadding}
      className={cn(
        menuSurface,
        menuMotion,
        "scrollbar-subtle max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(menuLabel, className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
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

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={cn(menuItem, "data-[state=open]:bg-accent", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto rtl:rotate-180" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(menuSeparator, className)}
      {...props}
    />
  )
}

/** Keyboard hint at the end of the row. Hidden on touch, where there is no keyboard. */
function DropdownMenuShortcut({
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
      data-slot="dropdown-menu-shortcut"
      className={cn("ms-auto ps-4 pointer-coarse:hidden", className)}
      {...props}
    >
      {keys ? <Shortcut keys={keys} /> : children}
    </span>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
}
