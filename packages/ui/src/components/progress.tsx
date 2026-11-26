"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/** Determinate when `value` is a number, indeterminate (shimmer) when it is null/undefined. */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const determinate = typeof value === "number"
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full origin-left rounded-full bg-primary transition-transform duration-(--duration-base) ease-(--ease-move) rtl:origin-right",
          !determinate &&
            "animate-shimmer bg-[linear-gradient(90deg,var(--primary)_0%,var(--link)_50%,var(--primary)_100%)] bg-[length:200%_100%]"
        )}
        style={
          determinate
            ? { transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})` }
            : undefined
        }
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
