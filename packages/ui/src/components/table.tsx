"use client"

import * as React from "react"
import {
  AlignJustifyIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { ErrorState } from "@workspace/ui/components/error-state"
import { Skeleton } from "@workspace/ui/components/skeleton"
import type { HeaderCheckState } from "@workspace/ui/hooks/use-row-selection"

/*
 * Data Table + Bulk Actions.
 *  - Sticky header; the first column can be frozen (`frozen` on its head and cells). Stuck
 *    edges strengthen their hairline when content scrolls under them (deviation: the card
 *    says "shadow", but nothing in a list carries a shadow in this system). A vertical
 *    scroll needs a bounded height: pass `containerClassName="max-h-[70vh]"`.
 *  - Numeric columns: `numeric` = end-aligned + tabular figures.
 *  - Sorting is a tri-state, not a toggle: ascending -> descending -> original order
 *    (`nextSortDirection`), shown as an icon AND `aria-sort`.
 *  - Density is one token (`--row-h`) driven by `density`: compact 32px (this app's default,
 *    deviation: the card starts at 36), default 36, comfortable 48, spacious 60. Zebra
 *    stripes only at comfortable / spacious; tighter rows collapse to a hairline.
 *  - The WHOLE row is the selection target (`onToggleSelect`), not just the checkbox;
 *    shift-click selects a range. Selected = full-row tint + accent bar on the start edge +
 *    the checked box, and `aria-selected`.
 *  - Loading keeps the real row height (TableLoading), empty and error states fill the body.
 *  - 44px rows on touch. Selection lives in `useRowSelection`, not in the DOM.
 */

type SortDirection = "asc" | "desc" | null
type TableDensity = "compact" | "default" | "comfortable" | "spacious"

/** Tri-state cycle: ascending -> descending -> back to the original order. */
function nextSortDirection(current: SortDirection): SortDirection {
  return current === null ? "asc" : current === "asc" ? "desc" : null
}

const INTERACTIVE =
  "a,button,input,select,textarea,label,[role=checkbox],[role=menuitem],[data-no-row-click]"

function Table({
  className,
  containerClassName,
  density = "compact",
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string
  density?: TableDensity
}) {
  const container = React.useRef<HTMLDivElement>(null)

  // Stuck edges are styled from these attributes (no React state, no re-render per scroll).
  React.useEffect(() => {
    const element = container.current
    if (!element) return
    const sync = () => {
      element.dataset.scrolledX = String(Math.abs(element.scrollLeft) > 0)
      element.dataset.scrolledY = String(element.scrollTop > 0)
    }
    sync()
    element.addEventListener("scroll", sync, { passive: true })
    return () => element.removeEventListener("scroll", sync)
  }, [])

  return (
    <div
      ref={container}
      data-slot="table-container"
      data-density={density}
      data-scrolled-x="false"
      data-scrolled-y="false"
      className={cn(
        "group/table scrollbar-subtle relative isolate w-full overflow-auto overscroll-x-contain bg-card",
        "[--row-min:0px] pointer-coarse:[--row-min:2.75rem]",
        "data-[density=compact]:[--row-h:2rem] data-[density=default]:[--row-h:2.25rem] data-[density=comfortable]:[--row-h:3rem] data-[density=spacious]:[--row-h:3.75rem]",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-separate border-spacing-0 text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

/** Always give the table a caption: it names it for screen readers. Visually hidden. */
function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption data-slot="table-caption" className={cn("sr-only", className)} {...props} />
  )
}

type TableRowProps = React.ComponentProps<"tr"> & {
  selected?: boolean
  /** Makes the whole row a selection target. `shift` = range select. */
  onToggleSelect?: (shift: boolean) => void
}

function TableRow({
  className,
  selected,
  onToggleSelect,
  onClick,
  ...props
}: TableRowProps) {
  const selectable = onToggleSelect !== undefined || selected !== undefined
  return (
    <tr
      data-slot="table-row"
      data-selected={selected ? "true" : undefined}
      aria-selected={selectable ? Boolean(selected) : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !onToggleSelect) return
        const target = event.target as HTMLElement
        if (target.closest(INTERACTIVE)) return
        if (window.getSelection()?.toString()) return // the person is selecting text
        onToggleSelect(event.shiftKey)
      }}
      className={cn(
        "h-[max(var(--row-h),var(--row-min))] bg-card transition-colors duration-(--duration-fast)",
        "not-data-[selected=true]:hover:bg-muted data-[selected=true]:bg-selection",
        // Zebra: a translucent overlay (never replaces the hover / selection fill).
        "group-data-[density=comfortable]/table:even:bg-[linear-gradient(color-mix(in_oklch,var(--foreground)_4%,transparent),color-mix(in_oklch,var(--foreground)_4%,transparent))] group-data-[density=spacious]/table:even:bg-[linear-gradient(color-mix(in_oklch,var(--foreground)_4%,transparent),color-mix(in_oklch,var(--foreground)_4%,transparent))]",
        // Accent bar on the start edge of a selected row.
        "data-[selected=true]:[&>:first-child]:before:absolute data-[selected=true]:[&>:first-child]:before:inset-y-0 data-[selected=true]:[&>:first-child]:before:start-0 data-[selected=true]:[&>:first-child]:before:w-0.5 data-[selected=true]:[&>:first-child]:before:bg-primary",
        className
      )}
      {...props}
    />
  )
}

type TableHeadProps = React.ComponentProps<"th"> & {
  sortable?: boolean
  sortDirection?: SortDirection
  onSortChange?: (next: SortDirection) => void
  numeric?: boolean
  frozen?: boolean
}

function TableHead({
  className,
  children,
  sortable,
  sortDirection = null,
  onSortChange,
  numeric,
  frozen,
  ...props
}: TableHeadProps) {
  const ariaSort = sortable
    ? sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none"
    : undefined
  const SortIcon =
    sortDirection === "asc"
      ? ArrowUpIcon
      : sortDirection === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon
  return (
    <th
      data-slot="table-head"
      data-frozen={frozen ? "" : undefined}
      aria-sort={ariaSort}
      className={cn(
        "sticky top-0 z-(--z-sticky) h-8 border-b border-border bg-card px-3 text-start align-middle text-xs font-medium whitespace-nowrap text-muted-foreground group-data-[scrolled-y=true]/table:border-border-strong",
        numeric && "text-end",
        frozen &&
          "start-0 z-(--z-bar) border-e border-border group-data-[scrolled-x=true]/table:border-e-border-strong",
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSortChange?.(nextSortDirection(sortDirection))}
          className={cn(
            "focus-ring-inset -mx-1.5 inline-flex h-6 items-center gap-1 rounded-sm px-1.5 ready:hover:bg-muted ready:hover:text-foreground pointer-coarse:h-11",
            numeric && "flex-row-reverse",
            sortDirection && "text-foreground"
          )}
        >
          {children}
          <SortIcon className={cn(!sortDirection && "text-subtle")} />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

type TableCellProps = React.ComponentProps<"td"> & {
  numeric?: boolean
  frozen?: boolean
  /** One flexible column that truncates with an ellipsis; give the cell a `title`. */
  truncate?: boolean
}

function TableCell({
  className,
  numeric,
  frozen,
  truncate,
  ...props
}: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-frozen={frozen ? "" : undefined}
      className={cn(
        "border-b border-border px-3 align-middle whitespace-nowrap",
        "group-data-[density=comfortable]/table:border-transparent group-data-[density=spacious]/table:border-transparent",
        frozen
          ? "sticky start-0 z-1 border-e bg-inherit group-data-[scrolled-x=true]/table:border-e-border-strong"
          : "relative",
        numeric && "text-end tabular-nums",
        truncate && "w-full max-w-0 truncate",
        className
      )}
      {...props}
    />
  )
}

/** Header cell holding the tri-state select-all checkbox. */
function TableSelectHead({
  state,
  onToggle,
  label = "Select all rows on this page",
  frozen,
  className,
  ...props
}: Omit<React.ComponentProps<"th">, "onToggle"> & {
  state: HeaderCheckState
  onToggle: () => void
  label?: string
  frozen?: boolean
}) {
  return (
    <TableHead frozen={frozen} className={cn("w-11 px-0 text-center", className)} {...props}>
      <Checkbox
        checked={state}
        onClick={onToggle}
        aria-label={label}
        className="mx-auto"
      />
    </TableHead>
  )
}

/** Row cell holding the checkbox. Clicking the cell padding toggles too (row target). */
function TableSelectCell({
  selected,
  onToggle,
  label,
  frozen,
  className,
  ...props
}: Omit<React.ComponentProps<"td">, "onToggle"> & {
  selected: boolean
  /** `shift` = range select. */
  onToggle: (shift: boolean) => void
  label: string
  frozen?: boolean
}) {
  return (
    <TableCell frozen={frozen} className={cn("w-11 px-0 text-center", className)} {...props}>
      <Checkbox
        checked={selected}
        onClick={(event) => onToggle(event.shiftKey)}
        aria-label={label}
        className="mx-auto"
      />
    </TableCell>
  )
}

const LOADING_WIDTHS = ["w-3/4", "w-1/2", "w-5/6", "w-2/5", "w-3/5", "w-1/3"]

/** Skeleton rows at the real row height, so loaded rows replace them with zero shift. */
function TableLoading({
  columns,
  rows = 8,
  label = "Loading",
}: {
  columns: number
  rows?: number
  label?: string
}) {
  return (
    <tbody data-slot="table-loading" aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="h-[max(var(--row-h),var(--row-min))]">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="border-b border-border px-3">
              {row === 0 && column === 0 ? (
                <span className="sr-only" role="status">
                  {label}
                </span>
              ) : null}
              <Skeleton
                className={cn(
                  "h-3",
                  LOADING_WIDTHS[(row + column) % LOADING_WIDTHS.length]
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function TableEmpty({
  colSpan,
  ...props
}: React.ComponentProps<typeof EmptyState> & { colSpan: number }) {
  return (
    <tbody data-slot="table-empty">
      <tr>
        <td colSpan={colSpan} className="p-0">
          <EmptyState {...props} />
        </td>
      </tr>
    </tbody>
  )
}

function TableError({
  colSpan,
  ...props
}: React.ComponentProps<typeof ErrorState> & { colSpan: number }) {
  return (
    <tbody data-slot="table-error">
      <tr>
        <td colSpan={colSpan} className="p-0">
          <ErrorState {...props} />
        </td>
      </tr>
    </tbody>
  )
}

const DENSITY_LABEL: Record<TableDensity, string> = {
  compact: "Compact",
  default: "Default",
  comfortable: "Comfortable",
  spacious: "Spacious",
}

/** The single row-density control. Persist the choice yourself (per person, per table). */
function TableDensityControl({
  value,
  onValueChange,
}: {
  value: TableDensity
  onValueChange: (value: TableDensity) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <AlignJustifyIcon data-icon="inline-start" />
          {DENSITY_LABEL[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Row density</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onValueChange(next as TableDensity)}
        >
          {(Object.keys(DENSITY_LABEL) as TableDensity[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {DENSITY_LABEL[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableCaption,
  TableRow,
  TableHead,
  TableCell,
  TableSelectHead,
  TableSelectCell,
  TableLoading,
  TableEmpty,
  TableError,
  TableDensityControl,
  nextSortDirection,
}
export type { SortDirection, TableDensity }
