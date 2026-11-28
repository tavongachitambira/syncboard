import * as React from "react"

/**
 * Tracks whether a horizontally scrolling element has more content before / after the visible
 * part, for edge fades and desktop chevrons (Tabs System, Filter Chips). RTL-safe: the
 * `start` / `end` flags are logical, `scrollLeft` is negative in RTL so its magnitude is used.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [edges, setEdges] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const max = element.scrollWidth - element.clientWidth
      const offset = Math.abs(element.scrollLeft)
      const next = { start: offset > 1, end: offset < max - 1 }
      setEdges((prev) =>
        prev.start === next.start && prev.end === next.end ? prev : next
      )
    }
    element.addEventListener("scroll", update, { passive: true })
    // A ResizeObserver reports once when it starts observing, so there is no first-paint call.
    const resize = new ResizeObserver(update)
    resize.observe(element)
    for (const child of Array.from(element.children)) resize.observe(child)
    const mutation = new MutationObserver(update)
    mutation.observe(element, { childList: true, subtree: true })
    return () => {
      element.removeEventListener("scroll", update)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [])

  return { ref, ...edges }
}
