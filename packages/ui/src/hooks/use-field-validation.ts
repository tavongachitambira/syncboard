import * as React from "react"

export type FieldStatus = "idle" | "validating" | "valid" | "invalid"

type Validate<T> = (value: T) => string | undefined

/**
 * Form Validation Timing: reward early, punish late.
 *  1. Untouched: nothing is validated while the person first types (no red on keystroke 1).
 *  2. On blur: validate once. Valid -> a check; invalid -> the message.
 *  3. After a field errored, revalidate LIVE, so the message clears the moment it is fixed.
 *  4. After a valid blur, editing stays quiet until the next blur (no new red mid-edit).
 *  5. Submit: call `validateNow()`; blur validation already ran, so errors are not a surprise.
 *
 * `validate` is pure and synchronous (returns the message, or undefined when valid).
 * `validateAsync` (server checks such as "that workspace URL is taken") runs only after the
 * sync rules pass, debounced, and reports `status: "validating"` meanwhile.
 *
 * With react-hook-form use `useForm({ mode: "onTouched", reValidateMode: "onChange" })` for
 * the same timing and map its field state with `statusFromFieldState`.
 */
export function useFieldValidation<T = string>({
  value,
  validate,
  validateAsync,
  debounce = 400,
}: {
  value: T
  validate: Validate<T>
  validateAsync?: (value: T) => Promise<string | undefined>
  /** Delay before the async check starts, in ms. */
  debounce?: number
}) {
  const [blurred, setBlurred] = React.useState<{ hadError: boolean } | null>(null)
  const [asyncResult, setAsyncResult] = React.useState<{
    value: T
    error?: string
  } | null>(null)
  const asyncRef = React.useRef(validateAsync)

  React.useEffect(() => {
    asyncRef.current = validateAsync
  })

  const current = validate(value)
  let status: FieldStatus = "idle"
  let error: string | undefined

  if (blurred) {
    if (blurred.hadError) {
      error = current
      status = current ? "invalid" : "valid"
    } else if (!current) {
      status = "valid"
    }
    // else: edited into an invalid value since the last blur: stay quiet until the next blur.
  }

  const wantsAsync =
    validateAsync !== undefined && blurred !== null && status === "valid"
  const asyncDone = asyncResult !== null && Object.is(asyncResult.value, value)

  if (wantsAsync) {
    if (!asyncDone) status = "validating"
    else if (asyncResult.error) {
      status = "invalid"
      error = asyncResult.error
    }
  }

  React.useEffect(() => {
    if (!wantsAsync || asyncDone) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      const run = asyncRef.current
      if (!run) return
      void run(value).then((message) => {
        if (!cancelled) setAsyncResult({ value, error: message })
      })
    }, debounce)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [wantsAsync, asyncDone, value, debounce])

  return {
    error,
    status,
    /** True once the person has left the field at least once. */
    touched: blurred !== null,
    onBlur: () => setBlurred({ hadError: validate(value) !== undefined }),
    /** For submit: marks the field touched and returns whether the sync rules pass. */
    validateNow: () => {
      const message = validate(value)
      setBlurred({ hadError: message !== undefined })
      return message === undefined
    },
    reset: () => {
      setBlurred(null)
      setAsyncResult(null)
    },
  }
}

/** Maps react-hook-form's `fieldState` (mode "onTouched") onto the same statuses. */
export function statusFromFieldState(state: {
  invalid: boolean
  isTouched: boolean
  isValidating?: boolean
}): FieldStatus {
  if (state.isValidating) return "validating"
  if (state.invalid) return "invalid"
  return state.isTouched ? "valid" : "idle"
}
