import * as React from "react"

/**
 * Doherty Threshold: feedback inside 400ms feels instant, so work that finishes sooner shows
 * NO spinner (a flash of one reads as slowness). Beyond `delay` it appears, and once shown it
 * stays for at least `minVisible` ms so it cannot flicker off and on.
 *
 * Always give some other immediate feedback (pressed state, optimistic change, skeleton) in
 * the first 100ms; this hook only decides when to add a progress indicator on top.
 */
export function useDeferredBusy(
  busy: boolean,
  { delay = 400, minVisible = 400 }: { delay?: number; minVisible?: number } = {}
): boolean {
  const [visible, setVisible] = React.useState(false)
  const shownAt = React.useRef(0)

  React.useEffect(() => {
    if (busy && !visible) {
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now()
        setVisible(true)
      }, delay)
      return () => window.clearTimeout(timer)
    }
    if (!busy && visible) {
      const left = Math.max(0, minVisible - (Date.now() - shownAt.current))
      const timer = window.setTimeout(() => setVisible(false), left)
      return () => window.clearTimeout(timer)
    }
  }, [busy, visible, delay, minVisible])

  return visible
}
