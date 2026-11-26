"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon } from "lucide-react"
import type { IncidentStatus, Severity } from "@workspace/shared"

import {
  Avatar,
  AvatarFallback,
  getInitials,
} from "@workspace/ui/components/avatar"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  SEVERITY_LABEL,
  SeverityIcon,
  STATUS_LABEL,
  StatusIcon,
} from "@workspace/ui/components/status"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { presenceClasses } from "@workspace/ui/lib/presence"
import { cn } from "@workspace/ui/lib/utils"

type Row = {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  owner: string
}

// Simulated data: the preview says so on screen.
const INITIAL_ROWS: readonly Row[] = [
  { id: "INC-248", title: "Checkout API latency above 2s", severity: "CRITICAL", status: "INVESTIGATING", owner: "Priya Nair" },
  { id: "INC-247", title: "Webhook deliveries delayed", severity: "HIGH", status: "MITIGATING", owner: "Tomás Reyes" },
  { id: "INC-244", title: "Search index rebuild stalled", severity: "MEDIUM", status: "OPEN", owner: "Amara Okafor" },
  { id: "INC-241", title: "EU region login errors", severity: "HIGH", status: "RESOLVED", owner: "Jonas Weber" },
  { id: "INC-236", title: "Dashboard export timeouts", severity: "LOW", status: "OPEN", owner: "Mei Lin" },
]

const NEXT_STATUS: Record<IncidentStatus, IncidentStatus> = {
  OPEN: "INVESTIGATING",
  INVESTIGATING: "MITIGATING",
  MITIGATING: "RESOLVED",
  RESOLVED: "OPEN",
}

// A change shows instantly (optimistic); the spinner only appears if the "server" is slow.
type Phase = "idle" | "quiet" | "syncing" | "confirmed"
const SPINNER_AFTER_MS = 300
const CONFIRM_AFTER_MS = 800
const IDLE_AFTER_MS = 2200

const TEAMMATE = "Priya Nair"
const PEOPLE = ["Priya Nair", "Tomás Reyes", "Amara Okafor"] as const

function LiveCursor({ name }: { name: string }) {
  const { bg, fill } = presenceClasses(name)
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute start-[46%] top-[62%] z-10 flex animate-pop items-start gap-0.5"
    >
      <svg viewBox="0 0 12 16" className="h-4 w-3 drop-shadow-sm">
        <path
          d="M1 1v12.2l3.3-3.1 2.2 4.6 2-1-2.2-4.5 4.6-.2z"
          className={cn("stroke-card", fill)}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "mt-3 rounded-sm px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap text-presence-fg",
          bg
        )}
      >
        {name.split(" ")[0]}
      </span>
    </span>
  )
}

export function HeroBoard() {
  const [rows, setRows] = useState<readonly Row[]>(INITIAL_ROWS)
  const [phase, setPhase] = useState<Record<string, Phase>>({})
  const [cursorRow, setCursorRow] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const timers = useRef(new Set<number>())
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  function later(callback: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      callback()
    }, ms)
    timers.current.add(id)
  }

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((id) => window.clearTimeout(id))
      pending.clear()
    }
  }, [])

  // One short intro (about 4 seconds, then it stops) so the preview shows a teammate is here.
  useEffect(() => {
    if (reducedMotion) return
    const ids = [1, 2, 3].map((row, index) =>
      window.setTimeout(() => setCursorRow(row), 1400 * (index + 1))
    )
    return () => ids.forEach((id) => window.clearTimeout(id))
  }, [reducedMotion])

  function setPhaseFor(id: string, next: Phase) {
    setPhase((current) => ({ ...current, [id]: next }))
  }

  function advance(row: Row) {
    if ((phase[row.id] ?? "idle") !== "idle") return // busy: ignore, keep focus
    const next = NEXT_STATUS[row.status]
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, status: next } : item))
    )
    setPhaseFor(row.id, "quiet")
    setAnnouncement(`${row.id} is now ${STATUS_LABEL[next].toLowerCase()}.`)
    later(() => setPhaseFor(row.id, "syncing"), SPINNER_AFTER_MS)
    later(() => {
      setPhaseFor(row.id, "confirmed")
      setCursorRow(rows.findIndex((item) => item.id === row.id))
    }, CONFIRM_AFTER_MS)
    later(() => setPhaseFor(row.id, "idle"), IDLE_AFTER_MS)
  }

  const open = rows.filter((row) => row.status !== "RESOLVED").length

  return (
    <figure className="@container m-0">
      <div className="overflow-hidden rounded-dialog border border-border-strong bg-card shadow-dialog">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">Incidents</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {open} open
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2 animate-pulse-ring rounded-full bg-success text-success [animation-iteration-count:3]"
              />
              Live
            </span>
            <div className="flex -space-x-1 rtl:space-x-reverse">
              {PEOPLE.map((person) => (
                <Avatar key={person} size="sm" className="ring-2 ring-card">
                  <AvatarFallback seed={person}>{getInitials(person)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>

        <ul role="list" className="border-t border-border">
          {rows.map((row, index) => {
            const state = phase[row.id] ?? "idle"
            const next = NEXT_STATUS[row.status]
            return (
              <li
                key={row.id}
                data-selected={index === 0 ? "" : undefined}
                className={cn(
                  "group/row relative flex min-h-9 items-center gap-2.5 px-3 text-sm pointer-coarse:min-h-11",
                  index > 0 && "border-t border-border",
                  index === 0 && "bg-selection shadow-[inset_2px_0_0_var(--primary)]"
                )}
              >
                <SeverityIcon severity={row.severity} title={SEVERITY_LABEL[row.severity]} />
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {row.id}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.title}</span>
                <button
                  type="button"
                  onClick={() => advance(row)}
                  aria-busy={state === "quiet" || state === "syncing" ? true : undefined}
                  aria-label={`${row.id} status: ${STATUS_LABEL[row.status]}. Change to ${STATUS_LABEL[next]}.`}
                  className="focus-ring hit-area inline-flex h-6 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium ready:hover:bg-muted"
                >
                  <StatusIcon status={row.status} />
                  <span className="hidden @sm:inline">{STATUS_LABEL[row.status]}</span>
                  <span className="grid size-4 place-content-center" aria-hidden="true">
                    {state === "syncing" ? (
                      <Spinner />
                    ) : state === "confirmed" ? (
                      <CheckIcon className="size-4 text-success" />
                    ) : null}
                  </span>
                </button>
                <Avatar size="sm" className="hidden @lg:inline-flex">
                  <AvatarFallback seed={row.owner}>{getInitials(row.owner)}</AvatarFallback>
                </Avatar>
                {cursorRow === index ? <LiveCursor name={TEAMMATE} /> : null}
              </li>
            )
          })}
        </ul>

        <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Interactive preview with simulated data. Select a status to change it.
        </figcaption>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </figure>
  )
}
