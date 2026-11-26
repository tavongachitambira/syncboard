import * as React from "react"

/**
 * Subscribes to a CSS media query. The server render and the first client render report
 * `false`, so hydration matches; React re-renders with the real value straight after.
 * Prefer CSS (`pointer-coarse:`, `md:`, container queries) whenever the change is only visual.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query]
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
