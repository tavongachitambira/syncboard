"use client"

import * as React from "react"
import {
  CheckIcon,
  CloudOffIcon,
  PencilIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Spinner } from "@workspace/ui/components/spinner"
import { useTicker } from "@workspace/ui/hooks/use-ticker"
import type { AutosaveStatus } from "@workspace/ui/hooks/use-autosave"

/*
 * Save status pill, driven by the explicit states of useAutosave (it never shows "Saved"
 * for a write that has not landed).
 *  - typing / saving show at once (the Doherty 400ms budget); the spinner itself is delayed
 *    so a quick save does not flash one.
 *  - offline names how many changes are waiting; error and conflict each carry the next
 *    action as a text button (Retry / Reload), never colour alone.
 *  - Only the outcomes that matter (saved, offline, error, conflict) are announced to screen
 *    readers, through a separate visually-hidden status; the pill itself is silent so typing
 *    does not produce a stream of announcements.
 */
function formatAgo(from: Date, now: number) {
  const seconds = Math.max(0, Math.round((now - from.getTime()) / 1000))
  if (now === 0 || seconds < 45) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h ago` : from.toLocaleDateString()
}

function SaveStatus({
  status,
  pending = 0,
  lastSavedAt,
  otherTab = false,
  onRetry,
  onReload,
  className,
}: {
  status: AutosaveStatus
  pending?: number
  lastSavedAt?: Date | null
  /** Another tab is editing the same document. */
  otherTab?: boolean
  onRetry?: () => void
  /** Offered on a conflict: reload the server's version. */
  onReload?: () => void
  className?: string
}) {
  const now = useTicker(30_000)

  let icon: React.ReactNode = null
  let text = ""
  let action: { label: string; run: () => void } | null = null

  switch (status) {
    case "typing":
      icon = <PencilIcon aria-hidden="true" />
      text = "Editing"
      break
    case "saving":
      icon = <Spinner delayed />
      text = "Saving"
      break
    case "saved":
      icon = <CheckIcon aria-hidden="true" className="text-success" />
      text = lastSavedAt ? `Saved ${formatAgo(lastSavedAt, now)}` : "Saved"
      break
    case "offline":
      icon = <CloudOffIcon aria-hidden="true" />
      text =
        pending > 0
          ? `Offline, ${pending} ${pending === 1 ? "change" : "changes"} waiting to sync`
          : "Offline, changes will sync when you reconnect"
      break
    case "error":
      icon = <TriangleAlertIcon aria-hidden="true" className="text-destructive" />
      text = "Couldn't save"
      if (onRetry) action = { label: "Retry", run: onRetry }
      break
    case "conflict":
      icon = <TriangleAlertIcon aria-hidden="true" className="text-warning" />
      text = "Someone else changed this"
      if (onReload) action = { label: "Reload", run: onReload }
      break
    default:
      break
  }

  const announce =
    status === "saved" || status === "offline" || status === "error" || status === "conflict"
      ? text
      : ""

  return (
    <div
      data-slot="save-status"
      data-status={status}
      className={cn("flex min-h-6 flex-wrap items-center gap-2", className)}
    >
      {status === "idle" ? null : (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card ps-2 pe-2.5 text-xs text-muted-foreground [&_svg]:size-3.5">
          {icon}
          <span>{text}</span>
          {action ? (
            <button
              type="button"
              onClick={action.run}
              className="hit-area focus-ring rounded-sm font-medium text-link underline-offset-2 hover:underline"
            >
              {action.label}
            </button>
          ) : null}
        </span>
      )}
      {otherTab ? (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs text-muted-foreground">
          <TriangleAlertIcon aria-hidden="true" className="size-3.5 text-warning" />
          Also open in another tab
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {announce}
      </span>
    </div>
  )
}

export { SaveStatus }
