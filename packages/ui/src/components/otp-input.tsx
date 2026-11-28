"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

/*
 * OTP Input.
 *  - The code is ONE string (`value`); the boxes are a view of it.
 *  - Paste is the main path: non-digits are stripped and the whole code is spread across the
 *    boxes in one update. SMS autofill works through `autocomplete="one-time-code"` and
 *    `inputMode="numeric"` (several digits arriving in one box are spread the same way).
 *  - Typing advances to the next box; Backspace on an empty box goes back AND clears the
 *    previous digit; arrows / Home / End move.
 *  - `onComplete` fires when the last digit lands: auto-submit.
 *  - A wrong code: set `status="error"`; the boxes shake once, clear and focus returns to the
 *    first box (reduced motion drops the shake; the message must also say it, e.g. FieldError).
 *  - A right code: `status="verified"` locks every box green with a check, then say "Verified".
 *  - Digits are always LTR (dir="ltr").
 *  - Pair with `ResendCode`: gated behind a visible countdown (default 30s) so people do not
 *    hammer the endpoint into a 429.
 */
type OtpStatus = "idle" | "error" | "verified"

function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  status = "idle",
  disabled = false,
  autoFocus = false,
  clearOnError = true,
  label = "One-time code",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  status?: OtpStatus
  disabled?: boolean
  autoFocus?: boolean
  clearOnError?: boolean
  label?: string
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([])
  const latest = React.useRef(onChange)
  const digits = Array.from({ length }, (_, index) => value[index] ?? "")

  React.useEffect(() => {
    latest.current = onChange
  })

  React.useEffect(() => {
    if (status !== "error") return
    if (clearOnError) latest.current("")
    refs.current[0]?.focus()
  }, [status, clearOnError])

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
  }

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  function handleChange(index: number, raw: string) {
    const existing = digits[index] ?? ""
    // Typing over a digit without the text selected gives "52": keep only what was just typed.
    const typed = existing && raw.length > 1 ? raw.replace(existing, "") : raw
    const incoming = typed.replace(/\D/g, "")
    if (incoming === "") {
      if (index < value.length) commit(value.slice(0, index) + value.slice(index + 1))
      return
    }
    const at = Math.min(index, value.length)
    commit(value.slice(0, at) + incoming + value.slice(at + incoming.length))
    focusAt(at + incoming.length)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && (digits[index] ?? "") === "" && index > 0) {
      event.preventDefault()
      commit(value.slice(0, index - 1) + value.slice(index))
      focusAt(index - 1)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      focusAt(index + 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      focusAt(0)
    } else if (event.key === "End") {
      event.preventDefault()
      focusAt(length - 1)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "")
    if (!text) return
    event.preventDefault()
    focusAt(commit(text).length)
  }

  const verified = status === "verified"

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={label}
        dir="ltr"
        data-slot="otp-input"
        data-status={status}
        className={cn(
          "inline-flex items-center gap-2 data-[status=error]:animate-shake",
          className
        )}
        {...props}
      >
        {digits.map((digit, index) => (
          <div key={index} className="relative">
            <input
              ref={(element) => {
                refs.current[index] = element
              }}
              data-slot="otp-box"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus={autoFocus && index === 0}
              aria-label={`${label}, digit ${index + 1} of ${length}`}
              aria-invalid={status === "error" || undefined}
              disabled={disabled}
              readOnly={verified}
              value={verified ? "" : digit}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className={cn(
                "h-11 w-10 rounded-control border border-input bg-field text-center text-lg font-semibold text-foreground tabular-nums caret-primary pointer-coarse:h-12 pointer-coarse:w-11",
                "ready:hover:border-foreground/50 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring",
                "disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary disabled:text-subtle",
                "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
                verified && "border-success bg-field"
              )}
            />
            {verified ? (
              <CheckIcon
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 m-auto size-5 animate-pop text-success"
                style={{ animationDelay: `${index * 40}ms` }}
              />
            ) : null}
          </div>
        ))}
      </div>
      {verified ? (
        <p role="status" className="flex items-center gap-1.5 text-sm text-success">
          <CheckIcon aria-hidden="true" />
          Verified
        </p>
      ) : null}
    </div>
  )
}

/** "Resend code in 24s" until the countdown ends, then a button. Restarts after each resend. */
function ResendCode({
  seconds = 30,
  onResend,
  className,
}: {
  seconds?: number
  onResend: () => void
  className?: string
}) {
  const [remaining, setRemaining] = React.useState(seconds)

  React.useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((left) => left - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  if (remaining > 0) {
    return (
      <p
        data-slot="resend-code"
        aria-live="off"
        className={cn("text-sm text-muted-foreground tabular-nums", className)}
      >
        Resend code in {remaining}s
      </p>
    )
  }
  return (
    <Button
      data-slot="resend-code"
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        onResend()
        setRemaining(seconds)
      }}
    >
      Resend code
    </Button>
  )
}

export { OtpInput, ResendCode }
export type { OtpStatus }
