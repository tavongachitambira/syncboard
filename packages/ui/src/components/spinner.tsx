import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type SpinnerProps = React.ComponentProps<"svg"> & {
  /** Accessible name. Omit when the parent already says it is busy (aria-busy). */
  label?: string
  /** Fade in after --delay-spinner (300ms) so quick work never flashes a spinner. */
  delayed?: boolean
}

function Spinner({ className, label, delayed = false, ...props }: SpinnerProps) {
  const svg = (
    <svg
      data-slot="spinner"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("size-4 shrink-0 animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  )

  if (!delayed) return svg
  return <span className="inline-flex animate-delayed-in">{svg}</span>
}

export { Spinner }
