"use client"

import * as React from "react"
import { CheckIcon, CircleAlertIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import type { FieldStatus } from "@workspace/ui/hooks/use-field-validation"

/*
 * Form Field States: label above, helper text below (nothing disappears on input), and every
 * state says itself in three ways at once.
 *  - idle / focus: focus ring >= 3:1 (Input draws it).
 *  - invalid: red edge + an icon in the field + a written message that says what to do.
 *  - valid: a green check INSIDE the field (never a toast, which steals focus and vanishes).
 *  - validating: spinner in the field, input stays editable (a background check).
 *  - loading: input is blocked (read-only) with a spinner, normal fill and `cursor-progress`,
 *    so it reads as busy, not disabled. Use it while a submit is in flight.
 *  - disabled: grey fill + not-allowed cursor (never opacity 0.5, which reads as loading).
 *  - read-only: grey fill, still focusable and selectable.
 * Wire `status` / `error` from `useFieldValidation` or react-hook-form (`statusFromFieldState`).
 * The error and description are linked with aria-describedby; the error is announced
 * (role="alert") when it appears.
 */
type ValidatedInputProps = React.ComponentProps<typeof Input> & {
  label: React.ReactNode
  description?: React.ReactNode
  error?: string
  status?: FieldStatus
  /** Submit in flight: blocks input and shows a spinner. */
  loading?: boolean
  optional?: boolean
  fieldClassName?: string
}

function ValidatedInput({
  id,
  label,
  description,
  error,
  status,
  loading = false,
  optional = false,
  fieldClassName,
  className,
  disabled,
  readOnly,
  "aria-describedby": describedBy,
  ...props
}: ValidatedInputProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const state: FieldStatus = loading
    ? "validating"
    : (status ?? (error ? "invalid" : "idle"))
  const invalid = state === "invalid" || Boolean(error)

  return (
    <Field
      data-invalid={invalid ? "true" : undefined}
      data-state={state}
      className={fieldClassName}
    >
      <FieldLabel htmlFor={inputId}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </FieldLabel>
      <div className="relative">
        <Input
          id={inputId}
          aria-invalid={invalid || undefined}
          aria-busy={state === "validating" || undefined}
          aria-describedby={
            [descriptionId, errorId, describedBy].filter(Boolean).join(" ") ||
            undefined
          }
          disabled={disabled}
          readOnly={readOnly || loading}
          className={cn(
            "pe-9",
            loading && "cursor-progress read-only:bg-field",
            className
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center"
        >
          {state === "validating" ? (
            <Spinner className="text-muted-foreground" />
          ) : state === "valid" ? (
            <CheckIcon className="text-success" />
          ) : invalid ? (
            <CircleAlertIcon className="optical-round text-destructive" />
          ) : null}
        </span>
      </div>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  )
}

export { ValidatedInput }
export type { ValidatedInputProps }
