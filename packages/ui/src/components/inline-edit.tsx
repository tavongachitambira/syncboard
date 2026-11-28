"use client"

import * as React from "react"
import { CheckIcon, CircleAlertIcon, PencilIcon, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

/*
 * Inline Editing.
 *  - Affordance: hovering (or focusing) editable text tints it and shows a pencil. On touch
 *    the pencil is always visible and the whole line is the 44px tap target, so editing
 *    never depends on hover.
 *  - Zero layout shift: the read view and the editor have the same font, size, padding and a
 *    1px border; only the border goes from transparent to the accent. The editor is a
 *    textarea laid over an invisible copy of the text in one grid cell, so it grows exactly
 *    like the text would (wrapping included).
 *  - Enter commits, Shift+Enter inserts a newline (multiline), Esc cancels. Focus returns to
 *    the text afterwards. IME composition is never interrupted.
 *  - ONE blur rule for the whole product (INLINE_EDIT_BLUR): leaving the field saves. Change
 *    the constant, not individual screens.
 *  - Optimistic: the new value shows at once with a quiet spinner. If the save rejects (a
 *    409 optimistic-lock conflict, a network error), the text rolls back, the editor reopens
 *    with the person's draft kept, and the reason is written under it. The draft is never
 *    lost.
 *  - mode "click": click to edit (typos are cheap: titles, labels, cells).
 *    mode "explicit": an Edit button opens the editor with Save / Cancel (typos are costly:
 *    anything that notifies people or feeds billing). A stray click edits nothing.
 */
export const INLINE_EDIT_BLUR: "save" | "discard" = "save"

const BOX = "rounded-control border px-2 py-1 pe-9 text-start break-words whitespace-pre-wrap"

function InlineEdit({
  value,
  onSave,
  label,
  mode = "click",
  multiline = false,
  allowEmpty = false,
  placeholder = "Add a value",
  maxLength,
  validate,
  textClassName,
  className,
}: {
  value: string
  /** Persist the new value. Reject with an Error whose message says why. */
  onSave: (next: string) => Promise<unknown> | void
  /** What is being edited ("Incident title"): used for the accessible names and messages. */
  label: string
  mode?: "click" | "explicit"
  multiline?: boolean
  allowEmpty?: boolean
  placeholder?: string
  maxLength?: number
  validate?: (next: string) => string | undefined
  /** Typography for both the text and the editor, so they match exactly. */
  textClassName?: string
  className?: string
}) {
  const id = React.useId()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [optimistic, setOptimistic] = React.useState<{ base: string; text: string } | null>(null)

  const root = React.useRef<HTMLDivElement>(null)
  const field = React.useRef<HTMLTextAreaElement>(null)
  const trigger = React.useRef<HTMLElement | null>(null)
  const refocus = React.useRef(false)
  const busy = React.useRef(false)

  // The optimistic text only applies while the prop still holds the value it was based on;
  // once the parent updates the prop (to anything), the prop wins.
  const shown = optimistic && optimistic.base === value ? optimistic.text : value

  React.useEffect(() => {
    if (!editing) return
    const element = field.current
    if (!element) return
    element.focus()
    element.setSelectionRange(element.value.length, element.value.length)
  }, [editing])

  React.useEffect(() => {
    if (editing || !refocus.current) return
    refocus.current = false
    trigger.current?.focus()
  }, [editing])

  function begin() {
    setDraft(shown)
    setError(null)
    setEditing(true)
  }

  function cancel(returnFocus: boolean) {
    refocus.current = returnFocus
    setEditing(false)
    setError(null)
  }

  async function commit(returnFocus: boolean) {
    if (busy.current) return
    const next = draft.trim()
    const problem =
      !allowEmpty && next === "" ? `${label} can't be empty` : validate?.(next)
    if (problem) {
      setError(problem)
      return
    }
    if (next === shown) {
      cancel(returnFocus)
      return
    }
    busy.current = true
    refocus.current = returnFocus
    setOptimistic({ base: value, text: next })
    setEditing(false)
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
    } catch (caught) {
      setOptimistic(null)
      setDraft(next)
      setEditing(true)
      refocus.current = false
      const reason =
        caught instanceof Error && caught.message
          ? caught.message
          : "Check your connection and try again."
      setError(`Couldn't save. ${reason} Your edit is still here.`)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const errorId = error ? `${id}-error` : undefined
  const text = shown === "" ? placeholder : shown

  return (
    <div
      ref={root}
      data-slot="inline-edit"
      data-editing={editing ? "true" : undefined}
      aria-busy={saving || undefined}
      className={cn("group/inline relative min-w-0", className)}
    >
      {editing ? (
        <>
          <div className="grid w-full">
            <span
              aria-hidden="true"
              className={cn(BOX, "invisible col-start-1 row-start-1 border-transparent", textClassName)}
            >
              {draft}
              {"​"}
            </span>
            <textarea
              ref={field}
              rows={1}
              value={draft}
              maxLength={maxLength}
              enterKeyHint="done"
              aria-label={label}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
              onChange={(event) =>
                setDraft(
                  multiline ? event.target.value : event.target.value.replace(/\r?\n/g, " ")
                )
              }
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return
                if (event.key === "Enter" && !(multiline && event.shiftKey)) {
                  event.preventDefault()
                  void commit(true)
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  event.stopPropagation()
                  cancel(true)
                }
              }}
              onBlur={(event) => {
                if (root.current?.contains(event.relatedTarget as Node | null)) return
                if (INLINE_EDIT_BLUR === "save") void commit(false)
                else cancel(false)
              }}
              className={cn(
                BOX,
                "col-start-1 row-start-1 h-full w-full resize-none overflow-hidden border-primary bg-field focus-ring",
                error && "border-destructive",
                textClassName
              )}
            />
          </div>
          {mode === "explicit" ? (
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void commit(true)}
              >
                <CheckIcon data-icon="inline-start" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => cancel(true)}
              >
                <XIcon data-icon="inline-start" />
                Cancel
              </Button>
            </div>
          ) : null}
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground"
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-px size-3.5 shrink-0 text-destructive"
              />
              <span>{error}</span>
            </p>
          ) : null}
        </>
      ) : mode === "click" ? (
        <button
          ref={(element) => {
            trigger.current = element
          }}
          type="button"
          onClick={begin}
          aria-label={`${label}: ${shown === "" ? "empty" : shown}. Edit`}
          className={cn(
            BOX,
            "block w-full cursor-text border-transparent focus-ring ready:hover:bg-muted pointer-coarse:min-h-11",
            shown === "" && "text-muted-foreground italic",
            textClassName
          )}
        >
          {text}
          {saving ? (
            <Spinner
              delayed
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          ) : (
            <PencilIcon
              aria-hidden="true"
              className="absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity duration-(--duration-fast) group-focus-within/inline:opacity-100 can-hover:group-hover/inline:opacity-100 pointer-coarse:opacity-100"
            />
          )}
        </button>
      ) : (
        <div
          className={cn(BOX, "border-transparent", shown === "" && "text-muted-foreground italic", textClassName)}
        >
          {text}
          {saving ? (
            <Spinner
              delayed
              className="absolute end-10 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          ) : null}
          <Button
            ref={(element) => {
              trigger.current = element
            }}
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${label}`}
            onClick={begin}
            className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <PencilIcon />
          </Button>
        </div>
      )}
    </div>
  )
}

export { InlineEdit }
