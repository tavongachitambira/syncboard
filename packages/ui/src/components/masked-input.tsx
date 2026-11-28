"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/input"

/*
 * Input Masking.
 *  - The mask: `9` = digit, `a` = letter, `*` = letter or digit, anything else is a literal
 *    ("(999) 999-9999", "9999 9999 9999 9999", "INC-9999"). Long numbers group into fixed
 *    chunks as they are typed; a trailing separator only appears once the next character does.
 *  - The caret stays directly after the character just typed, even when a separator is
 *    auto-inserted in the middle (no jump to the end), and Backspace over a separator removes
 *    the character before it instead of getting stuck.
 *  - Paste is reformatted, never rejected: separators and spaces are stripped, a leading
 *    literal prefix ("INC-") is accepted.
 *  - The stored value is RAW (`onValueChange(raw)`): never save the formatting characters.
 *  - No validation on keystroke: validate on blur (useFieldValidation / `isMaskComplete`).
 *  - The mask is shown as a hint (placeholder), not forced text. `inputMode` is numeric when
 *    the mask only takes digits.
 */
const SLOT = /[9a*]/

function slotMatches(slot: string, char: string) {
  if (slot === "9") return /\d/.test(char)
  if (slot === "a") return /[A-Za-z]/.test(char)
  return /[A-Za-z0-9]/.test(char)
}

/** Strips formatting and fits what is left to the mask's slots. */
function toRaw(input: string, mask: string): string {
  let clean = input.replace(/[^A-Za-z0-9]/g, "")
  const prefix = (/^[^9a*]*/.exec(mask)?.[0] ?? "").replace(/[^A-Za-z0-9]/g, "")
  if (prefix && clean.toUpperCase().startsWith(prefix.toUpperCase())) {
    clean = clean.slice(prefix.length)
  }
  let raw = ""
  let cursor = 0
  for (const slot of mask) {
    if (!SLOT.test(slot)) continue
    while (cursor < clean.length && !slotMatches(slot, clean[cursor] ?? "")) cursor++
    if (cursor >= clean.length) break
    raw += clean[cursor]
    cursor++
  }
  return raw
}

function format(raw: string, mask: string): string {
  let out = ""
  let used = 0
  for (const slot of mask) {
    if (used >= raw.length) break
    if (SLOT.test(slot)) out += raw[used++]
    else out += slot
  }
  return out
}

function isMaskComplete(raw: string, mask: string): boolean {
  return raw.length === [...mask].filter((slot) => SLOT.test(slot)).length
}

/** Index in the formatted text just after its n-th slot character. */
function caretAfter(count: number, formatted: string, mask: string): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (SLOT.test(mask[i] ?? "")) {
      seen++
      if (seen === count) return i + 1
    }
  }
  return formatted.length
}

function placeholderFor(mask: string) {
  return mask.replace(/9/g, "0").replace(/a/g, "A").replace(/\*/g, "0")
}

type MaskedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange"
> & {
  mask: string
  /** The raw value, without formatting characters. */
  value: string
  onValueChange: (raw: string) => void
}

function MaskedInput({
  mask,
  value,
  onValueChange,
  placeholder,
  className,
  ref,
  ...props
}: MaskedInputProps) {
  const inner = React.useRef<HTMLInputElement | null>(null)
  const caret = React.useRef<number | null>(null)
  const formatted = format(value, mask)
  const numeric = !/[a*]/.test(mask)

  // Put the caret back after React writes the formatted text.
  React.useLayoutEffect(() => {
    const element = inner.current
    if (element && caret.current !== null && document.activeElement === element) {
      element.setSelectionRange(caret.current, caret.current)
    }
    caret.current = null
  })

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const element = event.target
    const typed = element.value
    const position = element.selectionStart ?? typed.length
    let raw = toRaw(typed, mask)
    let before = toRaw(typed.slice(0, position), mask).length

    // Deleting only a separator changes nothing in `raw`: delete the character before it.
    const inputType = (event.nativeEvent as InputEvent).inputType ?? ""
    if (inputType.startsWith("deleteContentBackward") && raw.length === value.length && before > 0) {
      raw = raw.slice(0, before - 1) + raw.slice(before)
      before -= 1
    }

    caret.current = caretAfter(before, format(raw, mask), mask)
    onValueChange(raw)
  }

  return (
    <Input
      ref={(element) => {
        inner.current = element
        if (typeof ref === "function") ref(element)
        else if (ref) ref.current = element
      }}
      data-slot="masked-input"
      value={formatted}
      onChange={handleChange}
      inputMode={numeric ? "numeric" : "text"}
      placeholder={placeholder ?? placeholderFor(mask)}
      autoComplete="off"
      className={cn("tabular-nums", className)}
      {...props}
    />
  )
}

export { MaskedInput, isMaskComplete, toRaw as maskToRaw, format as maskFormat }
export type { MaskedInputProps }
