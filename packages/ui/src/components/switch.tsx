"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { FieldError } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"

/*
 * Toggle Anatomy.
 *  - Geometry: the rail is exactly 2x the knob diameter (32 x 20 around a 16px knob, 2px inset),
 *    so the knob stays centred in both states.
 *  - Motion: rail colour, knob position and knob shadow morph together over 240ms (~250ms,
 *    ease-out). Never a hard snap.
 *  - Optimistic: the caller flips `checked` at once and passes `pending` while the request is
 *    in flight: a spinner appears inside the knob and further clicks are ignored. On failure
 *    the caller rolls `checked` back and sets `invalid`, which shakes the toggle once.
 *  - Keyboard: Space toggles (Radix), visible focus ring, role="switch" + aria-checked.
 *  - Not colour alone: the knob moves, and SwitchField prints On / Off beside it.
 *  - 44px touch target via `hit-area`. Disabled = grey rail, never opacity.
 */
function Switch({
  className,
  pending = false,
  invalid = false,
  onClick,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  pending?: boolean
  invalid?: boolean
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-invalid={invalid ? "true" : undefined}
      aria-busy={pending || undefined}
      aria-invalid={invalid || undefined}
      onClick={(event) => {
        if (pending) event.preventDefault() // one request at a time
        onClick?.(event)
      }}
      className={cn(
        "group/switch peer hit-area focus-ring inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-transparent p-0.5",
        "transition-[background-color,border-color] duration-(--duration-enter) ease-(--ease-enter)",
        "data-[state=unchecked]:bg-input data-[state=checked]:bg-primary",
        "data-[disabled]:cursor-not-allowed data-[disabled]:border-border data-[disabled]:bg-secondary",
        "data-[invalid=true]:animate-shake aria-invalid:outline-destructive",
        pending && "cursor-progress",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none grid size-4 place-content-center rounded-full bg-background",
          "transition-[translate,box-shadow] duration-(--duration-enter) ease-(--ease-enter)",
          "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:shadow-none",
          "data-[state=checked]:translate-x-3 data-[state=checked]:bg-primary-foreground data-[state=checked]:shadow-rest rtl:data-[state=checked]:-translate-x-3",
          "group-data-[disabled]/switch:bg-subtle"
        )}
      >
        {pending ? <Spinner className="size-3 text-primary" /> : null}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

/** A settings row: label + description on the start side, the switch and On / Off on the end. */
function SwitchField({
  label,
  description,
  error,
  showState = true,
  id,
  checked,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Switch>, "invalid"> & {
  label: React.ReactNode
  description?: React.ReactNode
  /** A failed save: rolls back visually (set `checked` back) and shows why. */
  error?: string
  showState?: boolean
}) {
  const autoId = React.useId()
  const switchId = id ?? autoId
  const descriptionId = description ? `${switchId}-description` : undefined
  const errorId = error ? `${switchId}-error` : undefined
  return (
    <div
      data-slot="switch-field"
      className={cn("flex items-start justify-between gap-4", className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={switchId} className="text-sm leading-5 font-medium">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        <FieldError id={errorId}>{error}</FieldError>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showState ? (
          <span
            aria-hidden="true"
            className="w-6 text-end text-xs text-muted-foreground"
          >
            {checked ? "On" : "Off"}
          </span>
        ) : null}
        <Switch
          id={switchId}
          checked={checked}
          invalid={Boolean(error)}
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />
      </div>
    </div>
  )
}

export { Switch, SwitchField }
