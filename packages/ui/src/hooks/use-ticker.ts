import * as React from "react"

/**
 * Re-renders every `interval` ms and returns Date.now(). It is 0 until the first tick, so the
 * server render and the first client paint agree (no hydration mismatch).
 */
export function useTicker(interval: number): number {
  const [now, setNow] = React.useState(0)
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}
