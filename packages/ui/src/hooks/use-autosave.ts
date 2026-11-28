"use client"

import * as React from "react"

/**
 * Autosave, driven by explicit states so the indicator never lies:
 *   idle      nothing has changed since load
 *   typing    there are edits that have not been handed to the saver yet (debounce running)
 *   saving    a write is in flight
 *   saved     the LAST write has landed (never shown before the server said yes)
 *   offline   no connection: edits keep queueing locally and replay oldest-first on reconnect
 *   error     a write failed: it stays queued, `retry()` replays it
 *   conflict  the server refused because someone else changed the record (HTTP 409 or a
 *             thrown ConflictError). Nothing is retried and nothing is overwritten:
 *             last-write-wins must never silently erase someone's work. Show the person
 *             both versions, or reload, then call `reset(freshValue)`.
 *
 *  - Debounce: one write ~800ms after the last change, never one per keystroke.
 *  - Exit guard: a `beforeunload` prompt while any unsaved work exists.
 *  - Two tabs: pass `syncKey` (the document id) and `otherTab` turns true while another tab
 *    is editing the same document, so you can warn before the two overwrite each other.
 *  - Key the component by document id (or call `reset`) when the document changes.
 *  - `value` is compared with `isEqual` (Object.is by default): pass a stable value, or a
 *    deep-equality function for objects.
 */
export type AutosaveStatus =
  | "idle"
  | "typing"
  | "saving"
  | "saved"
  | "offline"
  | "error"
  | "conflict"

export class ConflictError extends Error {
  constructor(message = "Someone else changed this while you were editing.") {
    super(message)
    this.name = "ConflictError"
  }
}

function isConflict(error: unknown): boolean {
  if (error instanceof ConflictError) return true
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 409
  )
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

type Phase = "idle" | "saving" | "saved" | "error" | "conflict"

export function useAutosave<T>({
  value,
  save,
  delay = 800,
  enabled = true,
  isEqual = Object.is,
  syncKey,
}: {
  value: T
  /** Persist one snapshot. Reject on failure; throw ConflictError (or an error with status 409) on a lost race. */
  save: (value: T) => Promise<unknown>
  delay?: number
  enabled?: boolean
  isEqual?: (a: T, b: T) => boolean
  syncKey?: string
}) {
  const online = React.useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  )
  const [handedOff, setHandedOff] = React.useState(value)
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [pending, setPending] = React.useState(0)
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)
  const [error, setError] = React.useState<unknown>(null)
  const [otherTab, setOtherTab] = React.useState(false)

  const queue = React.useRef<T[]>([])
  const running = React.useRef(false)
  const channel = React.useRef<BroadcastChannel | null>(null)
  const lastPost = React.useRef(0)
  const live = React.useRef({ save, isEqual, value, handedOff })

  React.useEffect(() => {
    live.current = { save, isEqual, value, handedOff }
  })

  const flush = React.useCallback(async () => {
    if (running.current || !navigator.onLine) return
    running.current = true
    try {
      while (queue.current.length > 0 && navigator.onLine) {
        const next = queue.current[0] as T
        setPhase("saving")
        await live.current.save(next)
        queue.current.shift()
        setPending(queue.current.length)
        setLastSavedAt(new Date())
      }
      setError(null)
      setPhase(queue.current.length === 0 ? "saved" : "idle")
    } catch (caught) {
      if (isConflict(caught)) {
        setError(caught)
        setPhase("conflict")
      } else if (!navigator.onLine) {
        setPhase("idle")
      } else {
        setError(caught)
        setPhase("error")
      }
    } finally {
      running.current = false
    }
  }, [])

  const enqueue = React.useCallback(
    (next: T) => {
      queue.current.push(next)
      live.current.handedOff = next
      setHandedOff(next)
      setPending(queue.current.length)
      void flush()
    },
    [flush]
  )

  // Debounce: hand the newest value to the queue once typing pauses.
  React.useEffect(() => {
    if (!enabled || live.current.isEqual(value, handedOff)) return
    const timer = window.setTimeout(() => enqueue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, handedOff, enabled, delay, enqueue])

  // Replay on reconnect, oldest first.
  React.useEffect(() => {
    const onOnline = () => {
      void flush()
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [flush])

  // Two tabs on one document.
  React.useEffect(() => {
    if (!syncKey || typeof BroadcastChannel === "undefined") return
    const bc = new BroadcastChannel(`autosave:${syncKey}`)
    channel.current = bc
    let timer = 0
    bc.onmessage = () => {
      setOtherTab(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setOtherTab(false), 10_000)
    }
    return () => {
      window.clearTimeout(timer)
      bc.close()
      channel.current = null
    }
  }, [syncKey])

  const dirty = !isEqual(value, handedOff)

  React.useEffect(() => {
    if (!dirty) return
    const now = performance.now()
    if (now - lastPost.current < 2000) return
    lastPost.current = now
    channel.current?.postMessage("editing")
  }, [dirty, value])

  let status: AutosaveStatus
  if (phase === "conflict") status = "conflict"
  else if (!online) status = "offline"
  else if (phase === "error") status = "error"
  else if (phase === "saving") status = "saving"
  else if (dirty) status = "typing"
  else status = phase === "saved" ? "saved" : "idle"

  const unsaved =
    enabled &&
    (status === "typing" ||
      status === "saving" ||
      status === "error" ||
      status === "conflict" ||
      pending > 0)

  // Never let a tab close on unsaved work with no prompt.
  React.useEffect(() => {
    if (!unsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [unsaved])

  const retry = React.useCallback(() => {
    void flush()
  }, [flush])

  /** Write the current value now (Cmd+S, leaving the page, blur). */
  const saveNow = React.useCallback(() => {
    const { value: current, handedOff: last, isEqual: equal } = live.current
    if (!equal(current, last)) enqueue(current)
    else void flush()
  }, [enqueue, flush])

  /** Adopt fresh server data as the new baseline: clears the queue, the error and a conflict. */
  const reset = React.useCallback((baseline: T) => {
    queue.current = []
    live.current.handedOff = baseline
    setHandedOff(baseline)
    setPending(0)
    setError(null)
    setPhase("idle")
  }, [])

  return {
    status,
    /** Changes waiting to sync (non-zero while offline or after a failed write). */
    pending,
    lastSavedAt,
    error,
    otherTab,
    retry,
    saveNow,
    reset,
  }
}
