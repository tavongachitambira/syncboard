"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

type ErrorStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** What happened, in plain words. "We couldn't load this incident", not "Error 500". */
  title: React.ReactNode
  /** What the person can do about it. */
  description?: React.ReactNode
  /** Always give an exit: Try again, Go to dashboard, Contact support. */
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  /** A short id support can look up (e.g. Next's error digest). Shown in mono, copyable. */
  reference?: string
  icon?: React.ReactNode
}

function ErrorState({
  title,
  description,
  action,
  secondaryAction,
  reference,
  icon,
  className,
  ...props
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <div className="grid size-10 place-content-center rounded-full bg-destructive/10 text-destructive [&_svg]:size-6">
        {icon ?? <TriangleAlertIcon aria-hidden="true" />}
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-balance text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
      {reference ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Reference</span>
          <code className="rounded-sm bg-secondary px-1.5 py-0.5 text-foreground">
            {reference}
          </code>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? "Copied" : "Copy reference"}
            onClick={() => {
              void navigator.clipboard?.writeText(reference).then(() => setCopied(true))
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export { ErrorState }
