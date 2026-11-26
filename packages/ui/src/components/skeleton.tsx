import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Skeletons mirror the real layout (same heights, same widths) so content replaces
 * them with zero layout shift. They shimmer; reduced motion freezes them.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-muted bg-[linear-gradient(90deg,transparent_0%,var(--accent)_50%,transparent_100%)] bg-[length:200%_100%] bg-no-repeat",
        className
      )}
      {...props}
    />
  )
}

function SkeletonText({
  lines = 3,
  className,
  ...props
}: React.ComponentProps<"div"> & { lines?: number }) {
  return (
    <div
      data-slot="skeleton-text"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  )
}

/** One 32px list row: icon, title, meta. Matches the dense row height of real rows. */
function SkeletonRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton-row"
      className={cn("flex h-8 items-center gap-3 px-3", className)}
      {...props}
    >
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonRow }
