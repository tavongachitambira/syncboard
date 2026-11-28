"use client"

import * as React from "react"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { useScrollEdges } from "@workspace/ui/hooks/use-scroll-edges"
import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

/*
 * Filter Chips.
 *  - Three clearly different states: idle (surface + border), active (tinted fill, accent
 *    border AND a check mark), unavailable (dashed border, dimmed: "no results behind it",
 *    still focusable via aria-disabled).
 *  - OR within a group, AND across groups: use `filterItems`.
 *  - The result count updates in the same frame as the tap: derive it from the same state
 *    (`ResultCount` is a polite live region, so assistive tech hears it too).
 *  - One clear-all, paired with the live count.
 *  - Chips never wrap into a wall: one scrolling row with a fade on the end edge
 *    (`FilterGroup`), and applied filters are pinned in a sticky summary bar
 *    (`FilterSummaryBar`) so the person sees why the list shrank.
 */

function filterItems<T>(
  items: readonly T[],
  selected: Readonly<Record<string, ReadonlySet<string> | readonly string[]>>,
  getters: Readonly<Record<string, (item: T) => string>>
): T[] {
  return items.filter((item) =>
    Object.entries(selected).every(([group, values]) => {
      const chosen = Array.from(values)
      if (chosen.length === 0) return true // nothing chosen = no constraint
      const read = getters[group]
      return read ? chosen.includes(read(item)) : true
    })
  )
}

function FilterChip({
  className,
  selected = false,
  unavailable = false,
  count,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  selected?: boolean
  /** No results behind this chip right now. */
  unavailable?: boolean
  count?: number
}) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      aria-disabled={unavailable ? true : undefined}
      onClick={(event) => {
        if (unavailable) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      className={cn(
        "focus-ring hit-area inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border px-2.5 text-sm font-medium whitespace-nowrap select-none pointer-coarse:h-11",
        "border-border-strong bg-card text-foreground ready:hover:bg-muted",
        "data-[selected=true]:border-primary data-[selected=true]:bg-selection",
        "aria-disabled:border-dashed aria-disabled:border-border aria-disabled:bg-transparent aria-disabled:text-subtle",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {selected ? <CheckIcon /> : null}
      {children}
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      ) : null}
    </button>
  )
}

/** One scrolling row (never wraps) with an end-edge fade when more chips are off screen. */
function FilterGroup({
  className,
  label,
  ...props
}: React.ComponentProps<"div"> & { label: string }) {
  const { ref, end } = useScrollEdges<HTMLDivElement>()
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-slot="filter-group"
      data-overflow-end={end ? "true" : undefined}
      className={cn(
        "-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "data-[overflow-end=true]:[mask-image:linear-gradient(to_right,black_calc(100%_-_2rem),transparent)] data-[overflow-end=true]:rtl:[mask-image:linear-gradient(to_left,black_calc(100%_-_2rem),transparent)]",
        className
      )}
      {...props}
    />
  )
}

type AppliedFilter = { id: string; label: string }

function AppliedChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span
      data-slot="applied-filter"
      className="inline-flex h-8 shrink-0 items-center rounded-control border border-border-strong bg-card ps-2.5 pe-0.5 text-sm font-medium pointer-coarse:h-11"
    >
      {label}
      <button
        type="button"
        aria-label={`Remove filter ${label}`}
        onClick={onRemove}
        className="focus-ring hit-area ms-1 grid size-6 place-content-center rounded-sm text-muted-foreground ready:hover:bg-muted ready:hover:text-foreground"
      >
        <XIcon />
      </button>
    </span>
  )
}

/** "12 of 200 incidents", announced politely. Same frame as the state change that caused it. */
function ResultCount({
  count,
  total,
  noun = "result",
  nounPlural,
  className,
}: {
  count: number
  total: number
  noun?: string
  nounPlural?: string
  className?: string
}) {
  const label = (n: number) => (n === 1 ? noun : (nounPlural ?? `${noun}s`))
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="result-count"
      className={cn("text-sm whitespace-nowrap text-muted-foreground tabular-nums", className)}
    >
      {count === total
        ? `${total} ${label(total)}`
        : `${count} of ${total} ${label(total)}`}
    </p>
  )
}

function ClearAll({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="sm" className={className} {...props}>
      {props.children ?? "Clear all"}
    </Button>
  )
}

/** Sticky summary of what is applied, the live count and the single reset. */
function FilterSummaryBar({
  filters,
  onRemove,
  onClear,
  count,
  total,
  noun,
  nounPlural,
  sticky = true,
  className,
}: {
  filters: readonly AppliedFilter[]
  onRemove: (id: string) => void
  onClear: () => void
  count: number
  total: number
  noun?: string
  nounPlural?: string
  sticky?: boolean
  className?: string
}) {
  return (
    <div
      data-slot="filter-summary-bar"
      className={cn(
        "flex min-h-10 items-center gap-3 border-b border-border bg-background py-1",
        sticky && "sticky top-0 z-(--z-sticky)",
        className
      )}
    >
      <ResultCount count={count} total={total} noun={noun} nounPlural={nounPlural} />
      <FilterGroup label="Applied filters" className="min-w-0 flex-1">
        {filters.map((filter) => (
          <AppliedChip
            key={filter.id}
            label={filter.label}
            onRemove={() => onRemove(filter.id)}
          />
        ))}
      </FilterGroup>
      {filters.length > 0 ? <ClearAll onClick={onClear} /> : null}
    </div>
  )
}

/** A popover of the filters that are not applied yet. */
function AddFilter({
  options,
  onAdd,
  label = "Add filter",
}: {
  options: readonly AppliedFilter[]
  onAdd: (id: string) => void
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <PlusIcon data-icon="inline-start" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Every filter is applied.
          </p>
        ) : (
          <ul role="list" className="flex flex-col">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(option.id)
                    setOpen(false)
                  }}
                  className="focus-ring-inset flex min-h-8 w-full items-center rounded-item px-2 text-start text-sm ready:hover:bg-accent pointer-coarse:min-h-11"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

export {
  FilterChip,
  FilterGroup,
  FilterSummaryBar,
  AppliedChip,
  ResultCount,
  ClearAll,
  AddFilter,
  filterItems,
}
export type { AppliedFilter }
