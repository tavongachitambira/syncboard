"use client"

import * as React from "react"

/**
 * Optimistic UI: apply the change at once, send the request in the background, reconcile.
 * States mirror the server's OpState: PENDING (sent, not acknowledged), CONFIRMED, FAILED.
 *
 *  - On failure the value rolls back to the last value the server accepted, never to an
 *    intermediate optimistic one, so the screen stops lying the moment the request fails.
 *  - Several quick changes: only the newest request decides the visible outcome. An older
 *    request that fails while a newer one is in flight is ignored (the newer one will tell).
 *  - `retry()` replays the change that failed; `discard()` forgets it.
 *  - `sync(serverValue)` adopts a realtime update (applied on screen unless a request is in
 *    flight, so a push does not yank away something the person just did).
 *
 * Use it for reversible, low-stakes changes: toggles, likes, status moves, assignee,
 * reordering, renames. NEVER for payments, transfers, bookings, deletes without undo, or
 * anything shown as a confirmation: wait for the server and show a real progress state.
 * Say what happened on rollback (`onRollback` -> toast / inline message).
 */
export type OpPhase = "PENDING" | "CONFIRMED" | "FAILED"

export function useOptimisticValue<T>(
  initial: T,
  commit: (next: T, confirmed: T) => Promise<unknown>,
  { onRollback }: { onRollback?: (error: unknown, restored: T) => void } = {}
) {
  const [value, setValue] = React.useState(initial)
  const [state, setState] = React.useState<OpPhase | "IDLE">("IDLE")
  const [error, setError] = React.useState<unknown>(null)

  const confirmed = React.useRef(initial)
  const newest = React.useRef(0)
  const inFlight = React.useRef(0)
  const failed = React.useRef<{ value: T } | null>(null)
  const live = React.useRef({ commit, onRollback })

  React.useEffect(() => {
    live.current = { commit, onRollback }
  })

  const set = React.useCallback(async (next: T): Promise<boolean> => {
    const id = ++newest.current
    const base = confirmed.current
    inFlight.current += 1
    failed.current = null
    setValue(next)
    setState("PENDING")
    setError(null)
    try {
      await live.current.commit(next, base)
      confirmed.current = next
      if (id === newest.current) setState("CONFIRMED")
      return true
    } catch (caught) {
      if (id !== newest.current) return false
      failed.current = { value: next }
      setValue(confirmed.current)
      setState("FAILED")
      setError(caught)
      live.current.onRollback?.(caught, confirmed.current)
      return false
    } finally {
      inFlight.current -= 1
    }
  }, [])

  const retry = React.useCallback(() => {
    const last = failed.current
    return last ? set(last.value) : Promise.resolve(false)
  }, [set])

  const discard = React.useCallback(() => {
    failed.current = null
    setState("IDLE")
    setError(null)
  }, [])

  const sync = React.useCallback((next: T) => {
    confirmed.current = next
    if (inFlight.current === 0) setValue(next)
  }, [])

  return { value, state, error, pending: state === "PENDING", set, retry, discard, sync }
}
