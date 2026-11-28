"use client"

import * as React from "react"
import { StarIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Star Rating.
 *  - Hover preview is kept apart from the committed value: stars fill ahead of the pointer,
 *    and leaving the control returns to the saved rating (no stuck preview).
 *  - Fractions: an average of 4.4 shows four full stars and a fifth filled 44% (never
 *    rounded up). With `precision={0.5}` the input lands on halves, driven by where in the
 *    star the pointer is.
 *  - Committing staggers the fill ~30ms per star, left to right.
 *  - Keyboard: it is a slider (Left / Down, Right / Up step by `precision`, Home, End), with
 *    aria-valuetext "4 out of 5 stars". Read-only mode is an image with that same text.
 *  - Filled stars are the accent, the preview is the lighter accent, empty stars are outlined:
 *    the numeric value is always in the accessible name, so it is never colour alone.
 */
function Star({
  fill,
  size,
  burst,
  index,
}: {
  fill: number
  size: "sm" | "md"
  burst: number
  index: number
}) {
  const icon = size === "md" ? "size-6" : "size-4"
  return (
    <span aria-hidden="true" className={cn("relative inline-flex shrink-0", icon)}>
      <StarIcon className={cn(icon, "text-border-strong")} />
      <span
        key={`${index}-${burst}`}
        className={cn(
          "absolute inset-0 transition-[clip-path] duration-(--duration-fast) ease-(--ease-enter)",
          "[clip-path:inset(0_calc(100%_-_var(--fill))_0_0)] rtl:[clip-path:inset(0_0_0_calc(100%_-_var(--fill)))]",
          burst > 0 && "animate-pop"
        )}
        style={
          {
            "--fill": `${Math.max(0, Math.min(1, fill)) * 100}%`,
            animationDelay: burst > 0 ? `${index * 30}ms` : undefined,
          } as React.CSSProperties
        }
      >
        <StarIcon className={cn(icon, "fill-current text-primary")} />
      </span>
    </span>
  )
}

function StarRating({
  value,
  onValueChange,
  max = 5,
  precision = 1,
  readOnly = false,
  size = "md",
  label = "Rating",
  className,
}: {
  value: number
  onValueChange?: (value: number) => void
  max?: number
  precision?: 1 | 0.5
  readOnly?: boolean
  size?: "sm" | "md"
  label?: string
  className?: string
}) {
  const [preview, setPreview] = React.useState<number | null>(null)
  const [burst, setBurst] = React.useState(0)
  const track = React.useRef<HTMLDivElement>(null)
  const shown = preview ?? value
  const text = `${value} out of ${max} stars`

  const stars = (
    <>
      {Array.from({ length: max }, (_, index) => (
        <Star key={index} index={index} size={size} burst={burst} fill={shown - index} />
      ))}
    </>
  )

  if (readOnly || !onValueChange) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${text}`}
        data-slot="star-rating"
        className={cn("inline-flex items-center gap-0.5", className)}
      >
        {stars}
      </div>
    )
  }

  function fromPointer(clientX: number) {
    const element = track.current
    if (!element) return value
    const rect = element.getBoundingClientRect()
    const rtl = getComputedStyle(element).direction === "rtl"
    const ratio = (rtl ? rect.right - clientX : clientX - rect.left) / rect.width
    const raw = Math.ceil((ratio * max) / precision) * precision
    return Math.min(max, Math.max(precision, raw))
  }

  function commit(next: number) {
    onValueChange?.(next)
    setBurst((count) => count + 1)
  }

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={precision}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={text}
      data-slot="star-rating"
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") setPreview(fromPointer(event.clientX))
      }}
      onPointerLeave={() => setPreview(null)}
      onClick={(event) => commit(fromPointer(event.clientX))}
      onKeyDown={(event) => {
        const step = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -precision : event.key === "ArrowRight" || event.key === "ArrowUp" ? precision : 0
        if (step !== 0) {
          event.preventDefault()
          commit(Math.min(max, Math.max(precision, value + step)))
        } else if (event.key === "Home") {
          event.preventDefault()
          commit(precision)
        } else if (event.key === "End") {
          event.preventDefault()
          commit(max)
        }
      }}
      className={cn(
        "focus-ring inline-flex cursor-pointer items-center gap-0.5 rounded-sm py-1 touch-manipulation pointer-coarse:py-2.5",
        className
      )}
    >
      {stars}
    </div>
  )
}

export { StarRating }
