"use client"

import * as React from "react"
import { EllipsisIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { menuItem, menuItemDestructive } from "@workspace/ui/lib/menu"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"

/*
 * ActionMenu = the visible "more" button on a row (Hover Trap + Context Menu + Bottom Sheets).
 *  - Always visible: never hidden behind hover, so touch always has a path. Pair it with a
 *    ContextMenu holding the same items (right-click is only a shortcut).
 *  - Fine pointer: a dropdown. Coarse pointer (touch): the same items in a bottom sheet,
 *    44px rows, in thumb reach.
 *  - Items are grouped by `group` (a separator whenever it changes). Destructive items are
 *    always moved last and separated, in soft red.
 *  - An unavailable item stays in the list, stays focusable and shows WHY under its label
 *    (aria-disabled), instead of vanishing or greying out silently.
 *  - Reversible destructive items should call `undoToast`, irreversible ones open an
 *    AlertDialog / TypeToConfirmDialog from `onSelect`.
 */

type ActionMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  /** Keys for a Kbd hint, e.g. ["mod", "Backspace"]. Hidden on touch. */
  shortcut?: string[]
  /** Items with a different `group` than the previous one get a separator. */
  group?: string
  destructive?: boolean
  /** Unavailable: stays focusable, selecting does nothing, `disabledReason` is shown. */
  disabled?: boolean
  disabledReason?: string
  onSelect: () => void
}

function orderItems(items: readonly ActionMenuItem[]) {
  return [
    ...items.filter((item) => !item.destructive),
    ...items.filter((item) => item.destructive),
  ]
}

function needsDivider(
  items: readonly ActionMenuItem[],
  index: number
): boolean {
  const item = items[index]
  const previous = items[index - 1]
  if (!item || !previous) return false
  if (item.destructive && !previous.destructive) return true
  return !item.destructive && item.group !== previous.group
}

function ItemBody({ item }: { item: ActionMenuItem }) {
  return (
    <>
      {item.icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{item.label}</span>
        {item.disabled && item.disabledReason ? (
          <span className="text-xs text-subtle">{item.disabledReason}</span>
        ) : null}
      </span>
    </>
  )
}

function ActionMenu({
  items,
  label = "More actions",
  align = "end",
  className,
  trigger,
}: {
  items: readonly ActionMenuItem[]
  /** Accessible name of the button, and the title of the sheet on touch ("Actions for INC-248"). */
  label?: string
  align?: "start" | "center" | "end"
  className?: string
  /** Replace the default "more" icon button. Must be a single focusable element. */
  trigger?: React.ReactNode
}) {
  const coarse = useMediaQuery("(pointer: coarse)")
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const ordered = orderItems(items)

  const button = trigger ?? (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={cn("text-muted-foreground", className)}
    >
      <EllipsisIcon />
    </Button>
  )

  if (coarse) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{button}</SheetTrigger>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
          </SheetHeader>
          <ul
            role="list"
            className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-3"
          >
            {ordered.map((item, index) => {
              const rowClass = cn(
                menuItem,
                "focus-ring-inset min-h-11 px-3 text-start",
                item.destructive && menuItemDestructive
              )
              return (
                <li key={item.id}>
                  {needsDivider(ordered, index) ? (
                    <div role="separator" className="mx-1 my-1 h-px bg-border" />
                  ) : null}
                  {item.disabled ? (
                    <button
                      type="button"
                      aria-disabled="true"
                      data-variant={item.destructive ? "destructive" : undefined}
                      className={rowClass}
                    >
                      <ItemBody item={item} />
                    </button>
                  ) : (
                    <SheetClose asChild>
                      <button
                        type="button"
                        data-variant={item.destructive ? "destructive" : undefined}
                        className={rowClass}
                        onClick={item.onSelect}
                      >
                        <ItemBody item={item} />
                      </button>
                    </SheetClose>
                  )}
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} aria-label={label}>
        {ordered.map((item, index) => (
          <React.Fragment key={item.id}>
            {needsDivider(ordered, index) ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              variant={item.destructive ? "destructive" : "default"}
              aria-disabled={item.disabled ? true : undefined}
              onSelect={(event) => {
                if (item.disabled) {
                  event.preventDefault()
                  return
                }
                item.onSelect()
              }}
            >
              <ItemBody item={item} />
              {item.shortcut && !item.disabled ? (
                <DropdownMenuShortcut keys={item.shortcut} />
              ) : null}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ActionMenu }
export type { ActionMenuItem }
