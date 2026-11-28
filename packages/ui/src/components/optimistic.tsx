"use client"

import * as React from "react"
import { CheckIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Spinner } from "@workspace/ui/components/spinner"
import type { OpPhase } from "@workspace/ui/hooks/use-optimistic-value"

/*
 * Optimistic UI, the visible half (the logic is hooks/use-optimistic-value).
 *  - PENDING: the change is already on screen; a quiet spinner appears only if the request
 *    outlasts the Doherty budget (the Spinner is delayed), so fast saves show nothing extra.
 *  - CONFIRMED: a check for ~1.6s, then it clears itself.
 *  - FAILED: the row rolled back; it says so in words, with Retry and Discard. Never a silent
 *    revert.
 */
type OpIndicatorState = OpPhase | "IDLE"

function ConfirmedCheck() {
  const [gone, setGone] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setGone(true), 1600)
    return () => window.clearTimeout(timer)
  }, [])

  if (gone) return null
  return <CheckIcon aria-hidden="true" className="size-4 animate-pop text-success" />
}

function OpStateIndicator({
  state,
  className,
}: {
  state: OpIndicatorState
  className?: string
}) {
  if (state === "IDLE") return null
  return (
    <span
      data-slot="op-state"
      data-state={state}
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", className)}
    >
      {state === "PENDING" ? (
        <Spinner delayed label="Saving" className="text-muted-foreground" />
      ) : state === "CONFIRMED" ? (
        <>
          <ConfirmedCheck />
          <span role="status" className="sr-only">
            Saved
          </span>
        </>
      ) : (
        <TriangleAlertIcon aria-hidden="true" className="size-4 text-destructive" />
      )}
    </span>
  )
}

function OptimisticRow({
  state,
  error,
  onRetry,
  onDiscard,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  state: OpIndicatorState
  error?: unknown
  onRetry?: () => void
  onDiscard?: () => void
  children: React.ReactNode
}) {
  const reason =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string"
        ? error
        : undefined

  return (
    <div
      data-slot="optimistic-row"
      data-state={state}
      aria-busy={state === "PENDING" || undefined}
      className={cn(
        "border-s-2 border-s-transparent transition-colors duration-(--duration-base)",
        state === "FAILED" && "border-s-destructive",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <OpStateIndicator state={state} className="me-3" />
      </div>
      {state === "FAILED" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 text-xs"
        >
          <span>
            Couldn&apos;t save this change. {reason ?? "It was rolled back."}
          </span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="hit-area focus-ring rounded-sm font-medium text-link underline-offset-2 hover:underline"
            >
              Retry
            </button>
          ) : null}
          {onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              className="hit-area focus-ring rounded-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Discard
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { OpStateIndicator, OptimisticRow }
export type { OpIndicatorState }
