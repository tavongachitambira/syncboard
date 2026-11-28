"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { presenceClasses } from "@workspace/ui/lib/presence"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  getInitials,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Shortcut } from "@workspace/ui/components/kbd"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useTicker } from "@workspace/ui/hooks/use-ticker"
import {
  useSmoothedPosition,
  type Point,
} from "@workspace/ui/hooks/use-smoothed-position"

/*
 * Live Cursors / presence.
 *  - Colour comes from a hash of the user's id (lib/presence), so one person is the same
 *    colour on every screen and every session. Never random per session.
 *  - Presence = an avatar stack with a +N overflow. The whole stack is one button that opens
 *    the full list (names, plus an optional per-person action such as "Follow"), so the
 *    names are reachable by touch and keyboard, not by hover.
 *  - Cursors glide between ~10/s server updates (hooks/use-smoothed-position) and fade out
 *    when idle. They are decoration for sighted collaborators (aria-hidden); the stack and
 *    the "is editing" labels carry the same facts in text.
 *  - Locking: the moment someone selects a DISCRETE object (severity, assignee, status) it is
 *    outlined in their colour, labelled "<name> is editing", and made inert for everyone
 *    else, so two people cannot edit the same field. Text bodies merge through the CRDT
 *    instead and need no lock.
 *  - Follow mode: your viewport tracks another person's scroll until you scroll, touch,
 *    press a key in the view, or hit Esc.
 */

type PresenceUser = { id: string; name: string; image?: string | null }
type AvatarSize = NonNullable<React.ComponentProps<typeof Avatar>["size"]>

const CHIP: Record<AvatarSize, string> = {
  xs: "size-5",
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
}

function PresenceAvatar({
  person,
  size,
  className,
}: {
  person: PresenceUser
  size: AvatarSize
  className?: string
}) {
  return (
    <Avatar size={size} className={cn("ring-2 ring-background", className)}>
      {person.image ? <AvatarImage src={person.image} alt="" /> : null}
      <AvatarFallback seed={person.id}>{getInitials(person.name)}</AvatarFallback>
    </Avatar>
  )
}

function PresenceStack({
  people,
  selfId,
  max = 4,
  size = "sm",
  label = "Here now",
  renderAction,
  className,
}: {
  people: readonly PresenceUser[]
  selfId?: string
  max?: number
  size?: AvatarSize
  label?: string
  /** Per-person action in the popover, e.g. a "Follow" button. */
  renderAction?: (person: PresenceUser) => React.ReactNode
  className?: string
}) {
  if (people.length === 0) return null
  const shown = people.slice(0, max)
  const hidden = people.length - shown.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="presence-stack"
          aria-label={`${label}: ${people.length} ${people.length === 1 ? "person" : "people"}, ${people.map((person) => person.name).join(", ")}`}
          className={cn("hit-area focus-ring flex items-center rounded-full", className)}
        >
          {shown.map((person, index) => (
            <PresenceAvatar
              key={person.id}
              person={person}
              size={size}
              className={index > 0 ? "-ms-1.5" : undefined}
            />
          ))}
          {hidden > 0 ? (
            <span
              aria-hidden="true"
              className={cn(
                "-ms-1.5 grid place-items-center rounded-full bg-secondary text-2xs font-medium text-secondary-foreground ring-2 ring-background",
                CHIP[size]
              )}
            >
              +{hidden}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {label}, {people.length}
        </p>
        <ul role="list">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex min-h-8 items-center gap-2 rounded-item px-2 py-1 pointer-coarse:min-h-11"
            >
              <PresenceAvatar person={person} size="sm" className="ring-0" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {person.name}
                {person.id === selfId ? (
                  <span className="text-muted-foreground"> (you)</span>
                ) : null}
              </span>
              {person.id === selfId ? null : renderAction?.(person)}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */

type SyncState = "live" | "syncing" | "reconnecting" | "offline"

const SYNC: Record<SyncState, { label: string; dot: string; pulse: boolean }> = {
  live: { label: "Live", dot: "bg-success text-success", pulse: true },
  syncing: { label: "Syncing", dot: "bg-primary text-primary", pulse: true },
  reconnecting: { label: "Reconnecting", dot: "bg-warning text-warning", pulse: true },
  offline: { label: "Offline", dot: "bg-subtle text-subtle", pulse: false },
}

/** Connection state of the realtime channel: a dot that pulses while it is alive, always with a word. */
function SyncPulse({
  state,
  label,
  className,
}: {
  state: SyncState
  label?: string
  className?: string
}) {
  const meta = SYNC[state]
  return (
    <span
      role="status"
      data-slot="sync-pulse"
      data-state={state}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", meta.dot, meta.pulse && "animate-pulse-ring")}
      />
      {label ?? meta.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */

type CursorData = {
  id: string
  name: string
  x: number
  y: number
  /** ms since epoch of the last update; cursors fade after `idleAfter`. */
  updatedAt: number
}

/**
 * One remote cursor. Coordinates are PHYSICAL pixels inside the nearest positioned ancestor
 * (pointer coordinates do not mirror in RTL), so this uses left/top, not start/end.
 */
function LiveCursor({
  id,
  name,
  x,
  y,
  idle = false,
  className,
}: {
  id: string
  name: string
  x: number
  y: number
  idle?: boolean
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  useSmoothedPosition(ref, { x, y })
  const tone = presenceClasses(id)

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-slot="live-cursor"
      data-idle={idle ? "true" : undefined}
      className={cn(
        "pointer-events-none absolute top-0 left-0 will-change-transform",
        "transition-opacity duration-(--duration-enter) data-[idle=true]:opacity-0",
        className
      )}
    >
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className={cn("stroke-background drop-shadow-sm", tone.fill)}
      >
        <path d="M1.5 1.2v14.6l3.7-3.4 2.6 6.3 2.5-1-2.6-6.2h5.3z" />
      </svg>
      <span
        className={cn(
          "absolute start-3.5 top-4 rounded-tooltip px-1.5 py-0.5 text-2xs leading-none font-medium whitespace-nowrap text-presence-fg",
          tone.bg
        )}
      >
        {name}
      </span>
    </div>
  )
}

/** Overlay for a canvas or board: render it inside a `relative` container. */
function CursorLayer({
  cursors,
  idleAfter = 8000,
  className,
}: {
  cursors: readonly CursorData[]
  idleAfter?: number
  className?: string
}) {
  const now = useTicker(1000)
  return (
    <div
      aria-hidden="true"
      data-slot="cursor-layer"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {cursors.map((cursor) => (
        <LiveCursor
          key={cursor.id}
          id={cursor.id}
          name={cursor.name}
          x={cursor.x}
          y={cursor.y}
          idle={now > 0 && now - cursor.updatedAt > idleAfter}
        />
      ))}
    </div>
  )
}

/**
 * Sends the local pointer at most `hz` times a second (default 10), trailing edge included,
 * and `null` when it leaves. Touch has no hover cursor, so it sends nothing.
 */
function useCursorBroadcast(
  ref: React.RefObject<HTMLElement | null>,
  send: (point: Point | null) => void,
  { hz = 10 }: { hz?: number } = {}
) {
  const sendRef = React.useRef(send)

  React.useEffect(() => {
    sendRef.current = send
  })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const interval = 1000 / hz
    let last = 0
    let timer = 0
    let pending: Point | null = null

    const flush = () => {
      timer = 0
      if (!pending) return
      sendRef.current(pending)
      pending = null
      last = performance.now()
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      const rect = element.getBoundingClientRect()
      pending = {
        x: event.clientX - rect.left + element.scrollLeft,
        y: event.clientY - rect.top + element.scrollTop,
      }
      const wait = interval - (performance.now() - last)
      if (wait <= 0) flush()
      else if (!timer) timer = window.setTimeout(flush, wait)
    }
    const onLeave = () => {
      window.clearTimeout(timer)
      timer = 0
      pending = null
      sendRef.current(null)
    }
    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerleave", onLeave)
    return () => {
      window.clearTimeout(timer)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerleave", onLeave)
    }
  }, [ref, hz])
}

/* ------------------------------------------------------------------ */

/**
 * Wraps one discrete object. While `lockedBy` is set it is outlined in that person's colour,
 * labelled in words, and `inert` so nobody else can edit it at the same time.
 */
function LockOutline({
  lockedBy,
  children,
  className,
}: {
  lockedBy?: { id: string; name: string } | null
  children: React.ReactNode
  className?: string
}) {
  const tone = lockedBy ? presenceClasses(lockedBy.id) : null
  return (
    <div
      data-slot="lock-outline"
      data-locked={lockedBy ? "true" : undefined}
      className={cn(
        "relative rounded-card transition-[outline-color] duration-(--duration-fast)",
        lockedBy && cn("outline-2 outline-offset-2", tone?.outline),
        className
      )}
    >
      {lockedBy ? (
        <span
          role="status"
          className={cn(
            "absolute -top-2.5 start-3 z-(--z-sticky) rounded-tooltip px-1.5 py-0.5 text-2xs leading-none font-medium text-presence-fg",
            tone?.bg
          )}
        >
          {lockedBy.name} is editing
        </span>
      ) : null}
      <div inert={lockedBy ? true : undefined}>{children}</div>
    </div>
  )
}

/** "Ana is typing". Not a live region: announcing every keystroke of someone else is noise. */
function TypingIndicator({
  names,
  className,
}: {
  names: readonly string[]
  className?: string
}) {
  const [first, second] = names
  const text =
    names.length === 0
      ? ""
      : names.length === 1
        ? `${first} is typing`
        : names.length === 2
          ? `${first} and ${second} are typing`
          : `${first} and ${names.length - 1} others are typing`

  return (
    <p
      data-slot="typing-indicator"
      className={cn("flex h-5 items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      {names.length > 0 ? (
        <>
          <span aria-hidden="true" className="inline-flex items-center gap-0.5">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="size-1 animate-typing-dot rounded-full bg-muted-foreground"
                style={{ animationDelay: `${dot * 150}ms` }}
              />
            ))}
          </span>
          {text}
        </>
      ) : null}
    </p>
  )
}

/* ------------------------------------------------------------------ */

/** Top-centre bar while following someone. Esc (or the button) stops following. */
function FollowBanner({
  person,
  onStop,
  className,
}: {
  person: PresenceUser
  onStop: () => void
  className?: string
}) {
  const stop = React.useRef(onStop)

  React.useEffect(() => {
    stop.current = onStop
  })

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) stop.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const tone = presenceClasses(person.id)
  return (
    <div
      role="status"
      data-slot="follow-banner"
      className={cn(
        "fixed inset-x-0 top-3 z-(--z-bar) mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border-2 bg-popover py-1 ps-1.5 pe-1 text-sm shadow-overlay",
        tone.border,
        className
      )}
    >
      <PresenceAvatar person={person} size="xs" className="ring-0" />
      <span className="truncate">Following {person.name}</span>
      <Button size="sm" variant="ghost" onClick={onStop}>
        Stop following
        <Shortcut keys={["Esc"]} className="ms-1" />
      </Button>
    </div>
  )
}

/**
 * Follow mode: scrolls `ref` to the followed person's viewport (smooth, instant under reduced
 * motion). Any wheel, touch or key press inside the view is the person taking back control.
 */
function useFollowViewport(
  ref: React.RefObject<HTMLElement | null>,
  viewport: { left: number; top: number } | null,
  { following, onBreak }: { following: boolean; onBreak: () => void }
) {
  const breakRef = React.useRef(onBreak)
  const left = viewport?.left
  const top = viewport?.top

  React.useEffect(() => {
    breakRef.current = onBreak
  })

  React.useEffect(() => {
    const element = ref.current
    if (!following || !element) return
    const takeBack = () => breakRef.current()
    element.addEventListener("wheel", takeBack, { passive: true })
    element.addEventListener("touchstart", takeBack, { passive: true })
    element.addEventListener("keydown", takeBack)
    return () => {
      element.removeEventListener("wheel", takeBack)
      element.removeEventListener("touchstart", takeBack)
      element.removeEventListener("keydown", takeBack)
    }
  }, [ref, following])

  React.useEffect(() => {
    const element = ref.current
    if (!following || !element || left === undefined || top === undefined) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    element.scrollTo({ left, top, behavior: reduce ? "auto" : "smooth" })
  }, [ref, following, left, top])
}

export {
  PresenceStack,
  SyncPulse,
  LiveCursor,
  CursorLayer,
  LockOutline,
  TypingIndicator,
  FollowBanner,
  useCursorBroadcast,
  useFollowViewport,
}
export type { PresenceUser, SyncState, CursorData }
