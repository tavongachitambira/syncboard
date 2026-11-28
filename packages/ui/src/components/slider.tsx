"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/input"

/*
 * Range Sliders.
 *  - A filled track from the start to the thumb (two thumbs: a filled band between them) plus
 *    a live readout, so the value is legible without guessing.
 *  - The WHOLE ROW is the drag target (32px, 44px on touch), not the 4px track.
 *  - A value tooltip floats above the thumb while dragging or focused.
 *  - `step` snaps; `ticks` shows the steps when clean values matter.
 *  - Fully keyboard operable: arrows step by `step`, Home / End jump, PageUp / PageDown and
 *    Shift+arrows take bigger steps (Radix). Thumbs carry aria-labels.
 *  - Nobody lands on an exact value by dragging: `SliderField withInput` pairs the slider
 *    with a number field for exact entry (the value may flicker between neighbours otherwise).
 *  - RTL: pass `dir="rtl"` so the track mirrors with the page.
 */
function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  ticks = false,
  format = String,
  thumbLabels,
  onValueChange,
  onValueCommit,
  ...props
}: Omit<React.ComponentProps<typeof SliderPrimitive.Root>, "value" | "defaultValue"> & {
  value?: number[]
  defaultValue?: number[]
  /** true = a tick at every step; a number = a tick every n steps. */
  ticks?: boolean | number
  format?: (value: number) => string
  thumbLabels?: string[]
}) {
  const [active, setActive] = React.useState<number | null>(null)
  const [internal, setInternal] = React.useState<number[]>(defaultValue ?? [min])
  const values = value ?? internal
  const every = ticks === true ? 1 : ticks === false ? 0 : ticks
  const tickCount = every > 0 ? Math.floor((max - min) / (step * every)) : -1

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={values}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => {
        setInternal(next)
        onValueChange?.(next)
      }}
      onValueCommit={(next) => {
        setActive(null)
        onValueCommit?.(next)
      }}
      className={cn(
        "relative flex h-8 w-full touch-none items-center select-none pointer-coarse:h-11 data-[disabled]:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-input">
        <SliderPrimitive.Range className="absolute h-full bg-primary data-[disabled]:bg-subtle" />
      </SliderPrimitive.Track>
      {tickCount > 0 ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 mt-2">
          {Array.from({ length: tickCount + 1 }, (_, index) => (
            <span
              key={index}
              className="absolute h-1.5 w-px bg-border-strong"
              style={{ insetInlineStart: `${(index / tickCount) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels?.[index] ?? (values.length > 1 ? (index === 0 ? "Minimum" : "Maximum") : undefined)}
          onPointerDown={() => setActive(index)}
          onFocus={() => setActive(index)}
          onBlur={() => setActive(null)}
          className="focus-ring block size-4 rounded-full border-2 border-primary bg-background shadow-rest transition-colors ready:hover:bg-selection data-[disabled]:border-subtle"
        >
          <span
            aria-hidden="true"
            data-open={active === index ? "true" : "false"}
            className="pointer-events-none absolute start-1/2 -top-8 -translate-x-1/2 rounded-tooltip bg-foreground px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-background tabular-nums opacity-0 transition-opacity duration-(--duration-fast) data-[open=true]:opacity-100 rtl:translate-x-1/2"
          >
            {format(thumbValue)}
          </span>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

/** Label + live readout + slider (+ optional exact-entry field for a single value). */
function SliderField({
  label,
  description,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  format = String,
  withInput = false,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Slider>, "value" | "onValueChange" | "format"> & {
  label: React.ReactNode
  description?: React.ReactNode
  value: number[]
  onValueChange: (value: number[]) => void
  format?: (value: number) => string
  withInput?: boolean
}) {
  const id = React.useId()
  const single = value.length === 1
  const readout = value.map(format).join(" – ")
  const [draft, setDraft] = React.useState<string | null>(null)

  function commitDraft() {
    if (draft === null) return
    const parsed = Number(draft)
    if (Number.isFinite(parsed)) {
      const snapped = Math.round((parsed - min) / step) * step + min
      onValueChange([Math.min(max, Math.max(min, snapped))])
    }
    setDraft(null)
  }

  return (
    <div data-slot="slider-field" className={cn("flex w-full flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label id={`${id}-label`} className="text-sm font-medium">
          {label}
        </label>
        <output aria-live="off" className="text-sm text-muted-foreground tabular-nums">
          {readout}
        </output>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          aria-labelledby={`${id}-label`}
          value={value}
          onValueChange={onValueChange}
          min={min}
          max={max}
          step={step}
          format={format}
          {...props}
        />
        {withInput && single ? (
          <Input
            type="number"
            inputMode="decimal"
            aria-label={`${typeof label === "string" ? label : "Value"} (exact)`}
            min={min}
            max={max}
            step={step}
            value={draft ?? String(value[0] ?? min)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitDraft()
            }}
            className="w-20 shrink-0 text-end tabular-nums"
          />
        ) : null}
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export { Slider, SliderField }
