import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /**
   * first-use   – nothing created yet: onboard, show what a real item looks like.
   * no-results  – a filter or search removed everything: offer "Clear filters".
   * all-clear   – nothing needs attention: say so, warmly.
   */
  variant?: "first-use" | "no-results" | "all-clear"
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** The primary next step. Never leave the person with only "Try refreshing". */
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  /** A ghost preview of a real item (see EmptyStateGhost). */
  preview?: React.ReactNode
}

function EmptyState({
  variant = "first-use",
  icon,
  title,
  description,
  action,
  secondaryAction,
  preview,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {preview}
      {icon ? (
        <div
          data-slot="empty-state-icon"
          className="grid size-10 place-content-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-6"
        >
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3
          data-slot="empty-state-title"
          className="text-lg font-semibold text-foreground"
        >
          {title}
        </h3>
        {description ? (
          <p
            data-slot="empty-state-description"
            className="text-sm text-balance text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div
          data-slot="empty-state-actions"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}

/** A faded, inert sample of what a real item will look like once it exists. */
function EmptyStateGhost({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-ghost"
      aria-hidden="true"
      inert
      className={cn(
        "pointer-events-none w-full max-w-sm rounded-card border border-dashed border-border-strong bg-card/60 p-3 text-start opacity-70 select-none [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { EmptyState, EmptyStateGhost }
