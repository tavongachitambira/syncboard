"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

/*
 * Bulk Actions bar: appears when rows are selected.
 *  - States the true scope in the control: "Select all 247 matching incidents". Pass `total`
 *    live so it follows the filters; after choosing it the bar says "All 247 incidents".
 *  - Esc clears the selection (unless an overlay just used the key, or a field has focus).
 *  - `role="status"` announces the count to screen readers as it changes.
 *  - Fixed and floating: it reserves no layout space. Give the list bottom padding while a
 *    selection exists so the last rows are not covered.
 *  - Destructive bulk actions skip the confirm modal: run them at once, echo the count and
 *    call `undoToast({ message: "12 incidents archived", onUndo, bulk: true })`, which gives
 *    a 10s undo with a draining countdown. Reversible = undo, never "Are you sure?".
 */
function SelectionBar({
  count,
  total,
  allMatching = false,
  noun = "incident",
  nounPlural,
  onClear,
  onSelectAllMatching,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  count: number
  /** Every row matching the current filters, loaded or not. */
  total?: number
  allMatching?: boolean
  noun?: string
  nounPlural?: string
  onClear: () => void
  onSelectAllMatching?: () => void
  /** The action buttons. */
  children?: React.ReactNode
}) {
  React.useEffect(() => {
    if (count === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input,textarea,select,[contenteditable=true]")) return
      onClear()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [count, onClear])

  if (count === 0) return null

  const plural = nounPlural ?? `${noun}s`
  const label = (n: number) => (n === 1 ? noun : plural)
  const canExpand =
    !allMatching &&
    onSelectAllMatching !== undefined &&
    total !== undefined &&
    total > count

  return (
    <div
      data-slot="selection-bar"
      role="region"
      aria-label="Bulk actions"
      className={cn(
        "fixed inset-x-4 bottom-4 z-(--z-bar) mx-auto flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border-strong bg-popover p-2 ps-3 text-sm shadow-overlay",
        "animate-in duration-(--duration-enter) ease-(--ease-enter) fade-in-0 slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      <p role="status" className="font-medium tabular-nums">
        {allMatching && total !== undefined
          ? `All ${total} ${label(total)} selected`
          : `${count} ${label(count)} selected`}
      </p>
      {canExpand ? (
        <Button variant="ghost" size="sm" onClick={onSelectAllMatching}>
          Select all {total} matching {label(total)}
        </Button>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <XIcon />
      </Button>
    </div>
  )
}

export { SelectionBar }
