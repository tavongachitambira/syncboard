"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Radio group: pick exactly one. Arrow keys move AND select (Radix), Tab enters the group once.
 * The selected radio shows a filled dot as well as the accent fill, so it never relies on
 * colour. `RadioCard` makes the whole card the target for richer options (plans, severity
 * presets): the selected card gets the accent border and the selection tint.
 */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer hit-area focus-ring grid size-5 shrink-0 place-content-center rounded-full border border-input bg-field transition-colors",
        "ready:hover:border-foreground/60",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary-foreground" />
    </RadioGroupPrimitive.Item>
  )
}

function RadioCard({
  value,
  title,
  description,
  disabled,
  className,
  ...props
}: Omit<React.ComponentProps<"label">, "title"> & {
  value: string
  title: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <label
      htmlFor={id}
      data-slot="radio-card"
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-card border border-border-strong bg-card p-3 transition-colors",
        "ready:hover:bg-muted has-data-[state=checked]:border-primary has-data-[state=checked]:bg-selection",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-secondary has-[:disabled]:text-subtle",
        className
      )}
      {...props}
    >
      <RadioGroupItem id={id} value={value} disabled={disabled} className="mt-0.5 focus-visible:outline-none" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm leading-5 font-medium">{title}</span>
        {description ? (
          <span className="text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

export { RadioGroup, RadioGroupItem, RadioCard }
