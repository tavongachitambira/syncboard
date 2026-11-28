/*
 * Shared anatomy for dropdown, context, select and action menus, so they read as one family.
 * Radix animates each primitive from its own transform-origin variable, so every content
 * wrapper adds that itself.
 */

/** Overlay surface: popover fill, ~12% hairline, overlay shadow, card radius, 4px inset. */
export const menuSurface =
  "z-(--z-popover) min-w-44 rounded-card border border-border-strong bg-popover p-1 text-sm text-popover-foreground shadow-overlay outline-hidden"

/** Menus open in ~150ms (Dropdown Design): never instant, never slow. No bounce. */
export const menuMotion = [
  "duration-(--duration-exit) ease-(--ease-enter)",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:ease-(--ease-exit)",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
].join(" ")

/**
 * One row: 32px (44px on touch), concentric `rounded-item` corners, highlight = `bg-accent`.
 * `aria-disabled` rows stay focusable (so the reason can be read); Radix `data-disabled`
 * rows are skipped by the keyboard.
 */
export const menuItem = [
  "relative flex min-h-8 w-full cursor-default items-center gap-2 rounded-item px-2 py-1.5 text-sm outline-hidden select-none pointer-coarse:min-h-11",
  "data-highlighted:bg-accent",
  "data-disabled:pointer-events-none data-disabled:text-subtle aria-disabled:text-subtle",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  "not-data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-muted-foreground",
  "data-[inset]:ps-8",
].join(" ")

/** Red = destruction only: soft red, always last in the list and separated. */
export const menuItemDestructive =
  "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"

export const menuLabel = "px-2 py-1.5 text-xs font-medium text-muted-foreground"

export const menuSeparator = "-mx-1 my-1 h-px bg-border"
