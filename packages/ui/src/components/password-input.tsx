"use client"

import * as React from "react"
import {
  CheckIcon,
  CircleIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

/*
 * Password Field UX.
 *  - Rules are visible BEFORE submit: a live checklist (icon + text, never colour alone) and
 *    a strength meter that update on every keystroke (`showStrength`).
 *  - Strength is entropy, not a checkbox count: length counts for more than a forced symbol,
 *    repeats add little, common words cap the score. It is an estimate for coaching; enforce
 *    real policy (and breach checks) on the server.
 *  - A visibility toggle (aria-pressed, 44px on touch) catches typos that masked dots hide.
 *  - Paste is never blocked, so password managers can fill long credentials. No onPaste
 *    handler, no maxLength tricks.
 *  - `onGenerate` offers a one-tap strong password (crypto-random); it is revealed and the
 *    person is told to save it in a password manager.
 *  - Caps Lock warning (icon + text) while typing in a masked field.
 *  - `autocompleteMode`: "current" for sign-in, "new" for sign-up / change.
 * Works controlled (`value`) or uncontrolled (react-hook-form `register`).
 */

type PasswordRule = {
  id: string
  label: string
  test: (value: string) => boolean
}

const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "12345",
  "111111",
  "000000",
]

const LEVELS = ["Too weak", "Weak", "Okay", "Strong", "Very strong"] as const

function scorePassword(value: string): {
  score: 0 | 1 | 2 | 3 | 4
  bits: number
  label: (typeof LEVELS)[number]
} {
  if (!value) return { score: 0, bits: 0, label: LEVELS[0] }
  let pool = 0
  if (/[a-z]/.test(value)) pool += 26
  if (/[A-Z]/.test(value)) pool += 26
  if (/\d/.test(value)) pool += 10
  if (/[^A-Za-z0-9]/.test(value)) pool += 32
  const unique = new Set(value).size
  // Repeated characters add almost nothing: count distinct ones in full, the rest at a quarter.
  const effective = unique + (value.length - unique) * 0.25
  let bits = effective * Math.log2(Math.max(pool, 2))
  const lower = value.toLowerCase()
  if (COMMON.some((word) => lower.includes(word))) bits = Math.min(bits, 27)
  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  return { score, bits, label: LEVELS[score] }
}

const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_"

/** Uniform crypto-random password (rejection sampling, no modulo bias). */
function generatePassword(length = 20): string {
  const limit = 256 - (256 % ALPHABET.length)
  let out = ""
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const byte of bytes) {
      if (byte < limit && out.length < length) out += ALPHABET[byte % ALPHABET.length]
    }
  }
  return out
}

function defaultRules(minLength: number): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      test: (value) => value.length >= minLength,
    },
    {
      id: "common",
      label: "Not a common password",
      test: (value) =>
        value.length > 0 && !COMMON.some((word) => value.toLowerCase().includes(word)),
    },
  ]
}

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  autocompleteMode?: "current" | "new"
  /** Show the live checklist and strength meter (use for new passwords). */
  showStrength?: boolean
  minLength?: number
  rules?: readonly PasswordRule[]
  /** Offer a generated password; update your form value in this callback. */
  onGenerate?: (password: string) => void
  wrapperClassName?: string
}

function PasswordInput({
  autocompleteMode = "current",
  showStrength = false,
  minLength = 8,
  rules,
  onGenerate,
  wrapperClassName,
  className,
  value,
  onChange,
  onBlur,
  onKeyUp,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)
  const [caps, setCaps] = React.useState(false)
  const [generated, setGenerated] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const text = value !== undefined ? String(value) : typed
  const checklist = rules ?? defaultRules(minLength)
  const result = scorePassword(text)

  return (
    <div
      data-slot="password-input"
      className={cn("flex w-full flex-col gap-2", wrapperClassName)}
    >
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoComplete={
            autocompleteMode === "new" ? "new-password" : "current-password"
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          className={cn("pe-10", className)}
          onChange={(event) => {
            setTyped(event.target.value)
            onChange?.(event)
          }}
          onKeyUp={(event) => {
            setCaps(event.getModifierState("CapsLock"))
            onKeyUp?.(event)
          }}
          onBlur={(event) => {
            setCaps(false)
            onBlur?.(event)
          }}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>

      {caps && !visible ? (
        <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlertIcon aria-hidden="true" />
          Caps Lock is on
        </p>
      ) : null}

      {showStrength ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div
              role="meter"
              aria-label="Password strength"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={result.score}
              aria-valuetext={text ? result.label : "Empty"}
              className="grid flex-1 grid-cols-4 gap-1"
            >
              {[0, 1, 2, 3].map((segment) => (
                <span
                  key={segment}
                  className={cn(
                    "h-1 rounded-full bg-secondary transition-colors duration-(--duration-base)",
                    result.score > segment &&
                      (result.score >= 3 ? "bg-success" : "bg-warning")
                  )}
                />
              ))}
            </div>
            <p
              aria-live="polite"
              className="w-24 text-end text-xs text-muted-foreground"
            >
              {text ? result.label : ""}
            </p>
          </div>
          <ul role="list" className="flex flex-col gap-1">
            {checklist.map((rule) => {
              const met = rule.test(text)
              return (
                <li key={rule.id} className="flex items-center gap-1.5 text-xs">
                  {met ? (
                    <CheckIcon aria-hidden="true" className="text-success" />
                  ) : (
                    <CircleIcon aria-hidden="true" className="text-subtle" />
                  )}
                  <span className={met ? "text-foreground" : "text-muted-foreground"}>
                    {rule.label}
                  </span>
                  <span className="sr-only">{met ? "(met)" : "(not met yet)"}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {onGenerate ? (
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setVisible(true)
              setGenerated(true)
              onGenerate(generatePassword())
            }}
          >
            <SparklesIcon data-icon="inline-start" />
            Generate a strong password
          </Button>
          {generated ? (
            <p role="status" className="text-xs text-muted-foreground">
              Save it in your password manager before you continue.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { PasswordInput, scorePassword, generatePassword }
export type { PasswordRule, PasswordInputProps }
