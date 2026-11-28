"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/*
 * Pagination.
 *  - Numbered pages collapse to first, last, current and its neighbours with an ellipsis
 *    (`getPageRange`): never hundreds of links. Below 40rem the list becomes "Page 3 of 20".
 *  - Persist the page in the URL: pass `hrefFor` (and `as={Link}`) so every page is a real
 *    link, refresh-safe and shareable (`?page=3`). Without `hrefFor` it uses buttons.
 *  - Prefer cursor pagination on the API when rows are inserted or deleted often (offset
 *    pages shift and show duplicates or skip rows); `LoadMore` fits cursor lists.
 *  - Coming back from a detail view, restore scroll position and loaded pages: the
 *    caller's job (keep the cursor + scroll offset), never reset to the top.
 *  - 32px targets (44px on touch), current page has aria-current="page".
 */

type PageToken = number | "ellipsis-start" | "ellipsis-end"

function getPageRange(
  page: number,
  pageCount: number,
  siblings = 1
): PageToken[] {
  const slots = siblings * 2 + 5
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
  if (pageCount <= slots) return range(1, pageCount)

  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, pageCount)
  const showStart = left > 2
  const showEnd = right < pageCount - 1
  const edge = siblings * 2 + 3

  if (!showStart && showEnd) return [...range(1, edge), "ellipsis-end", pageCount]
  if (showStart && !showEnd)
    return [1, "ellipsis-start", ...range(pageCount - edge + 1, pageCount)]
  return [1, "ellipsis-start", ...range(left, right), "ellipsis-end", pageCount]
}

type LinkComponent = React.ElementType

const pageItem = [
  "focus-ring inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-control px-2 text-sm font-medium text-foreground select-none pointer-coarse:h-11 pointer-coarse:min-w-11",
  "ready:hover:bg-muted aria-current:bg-accent aria-current:font-semibold",
  "aria-disabled:bg-transparent aria-disabled:text-subtle",
  "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
].join(" ")

function PageItem({
  as: Link = "a",
  href,
  disabled,
  onClick,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "href"> & {
  as?: LinkComponent
  href?: string
  disabled?: boolean
}) {
  if (href && !disabled) {
    return (
      <Link href={href} className={cn(pageItem, className)} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      aria-disabled={disabled ? true : undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(pageItem, className)}
      {...props}
    >
      {children}
    </button>
  )
}

function Pagination({
  page,
  pageCount,
  onPageChange,
  hrefFor,
  as,
  siblings = 1,
  label = "Pagination",
  className,
}: {
  page: number
  pageCount: number
  onPageChange?: (page: number) => void
  /** Makes each page a real link so the page lives in the URL. */
  hrefFor?: (page: number) => string
  as?: LinkComponent
  siblings?: number
  label?: string
  className?: string
}) {
  const go = (target: number) => () => onPageChange?.(target)
  const props = (target: number) => ({
    as,
    href: hrefFor?.(target),
    onClick: go(target),
  })

  return (
    <nav
      aria-label={label}
      data-slot="pagination"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      <PageItem
        {...props(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="rtl:rotate-180" />
        <span className="max-sm:sr-only">Previous</span>
      </PageItem>

      <p className="text-sm text-muted-foreground tabular-nums sm:hidden">
        Page {page} of {pageCount}
      </p>
      <ul role="list" className="flex items-center gap-1 max-sm:hidden">
        {getPageRange(page, pageCount, siblings).map((token) =>
          typeof token === "number" ? (
            <li key={token}>
              <PageItem
                {...props(token)}
                aria-label={`Page ${token}`}
                aria-current={token === page ? "page" : undefined}
                className="tabular-nums"
              >
                {token}
              </PageItem>
            </li>
          ) : (
            <li key={token} aria-hidden="true" className="px-1 text-subtle">
              …
            </li>
          )
        )}
      </ul>

      <PageItem
        {...props(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <span className="max-sm:sr-only">Next</span>
        <ChevronRightIcon className="rtl:rotate-180" />
      </PageItem>
    </nav>
  )
}

/** Cursor-style lists: "Showing 50 of 247 incidents" + one button. */
function LoadMore({
  loaded,
  total,
  onLoadMore,
  loading = false,
  step = 25,
  noun = "item",
  nounPlural,
  className,
}: {
  loaded: number
  total: number
  onLoadMore: () => void
  loading?: boolean
  step?: number
  noun?: string
  nounPlural?: string
  className?: string
}) {
  const label = total === 1 ? noun : (nounPlural ?? `${noun}s`)
  return (
    <div
      data-slot="load-more"
      className={cn("flex flex-col items-center gap-2 py-4", className)}
    >
      <p role="status" className="text-sm text-muted-foreground tabular-nums">
        Showing {loaded} of {total} {label}
      </p>
      {loaded < total ? (
        <Button
          variant="outline"
          onClick={onLoadMore}
          loading={loading}
          loadingLabel="Loading…"
        >
          Load {Math.min(step, total - loaded)} more
        </Button>
      ) : null}
    </div>
  )
}

function PageSizeSelect({
  value,
  onValueChange,
  options = [25, 50, 100],
  label = "Rows per page",
}: {
  value: number
  onValueChange: (value: number) => void
  options?: readonly number[]
  label?: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true">{label}</span>
      <Select value={String(value)} onValueChange={(next) => onValueChange(Number(next))}>
        <SelectTrigger size="sm" aria-label={label} className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { Pagination, LoadMore, PageSizeSelect, getPageRange }
