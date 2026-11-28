"use client"

import * as React from "react"

export type Point = { x: number; y: number }

/**
 * Live Cursors: updates arrive ~10 times a second, the screen refreshes 60+ times. Rendering
 * the raw ticks makes a cursor teleport every 100ms; this glides the element toward the newest
 * target on every animation frame instead (time-based exponential smoothing, so it looks the
 * same at 60 and 120Hz).
 *
 * It writes `transform` straight to the element, so there is no React render per frame.
 *  - tau: smoothing time constant in ms. ~70 reaches 80% of a jump in ~110ms, about one tick.
 *  - A jump longer than `snapDistance` px (a reconnect, a tab switch) snaps instead of flying.
 *  - prefers-reduced-motion: snaps to every update.
 */
export function useSmoothedPosition(
  ref: React.RefObject<HTMLElement | null>,
  target: Point,
  { tau = 70, snapDistance = 480 }: { tau?: number; snapDistance?: number } = {}
) {
  const current = React.useRef<Point | null>(null)
  const { x, y } = target

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const goal = { x, y }
    const place = (point: Point) => {
      element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
    }
    const start = current.current
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (
      !start ||
      reduce ||
      Math.hypot(goal.x - start.x, goal.y - start.y) > snapDistance
    ) {
      current.current = goal
      place(goal)
      return
    }

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const from = current.current ?? goal
      const k = 1 - Math.exp(-(now - last) / tau)
      last = now
      const next = {
        x: from.x + (goal.x - from.x) * k,
        y: from.y + (goal.y - from.y) * k,
      }
      if (Math.hypot(goal.x - next.x, goal.y - next.y) < 0.25) {
        current.current = goal
        place(goal)
        return
      }
      current.current = next
      place(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ref, x, y, tau, snapDistance])
}
