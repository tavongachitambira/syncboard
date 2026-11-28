"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { GripVerticalIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { toast, undoToast } from "@workspace/ui/components/sonner"
import {
  isNoop,
  reverseMove,
  type DragLocation,
  type DragMove,
} from "@workspace/ui/lib/reorder"

/*
 * Drag and Drop for lists and status boards (vertical lists, any number of columns).
 *
 *   <DragRoot onMove={...} describe={(id) => title} containerLabel={(id) => columnName}>
 *     <DropZone id="triage">
 *       <DragItem id="INC-12" container="triage" index={0}> ...card with <DragHandle /> </DragItem>
 *     </DropZone>
 *   </DragRoot>
 *
 *  - Pickup: the lifted card scales up, gets the deeper shadow and tilts ~1.5deg, all
 *    together; the slot it left stays behind as a dashed outline.
 *  - Before release you see where it will land: an insertion line between items, and a filled
 *    highlight for the whole column under the pointer. While anything is dragged, every
 *    valid column shows a dashed outline. Dropping snaps to the nearest slot (no pixel
 *    hunting); a column can refuse items with `accepts`.
 *  - After a drop the card flashes briefly where it landed and a ~5s undo toast reverses the
 *    move (`undo={false}` to turn it off). A wrong drop is never permanent.
 *  - A drop is a state change: `onMove` gets { id, from, to } with indexes AFTER the move
 *    (see lib/reorder). Apply it optimistically and persist; if it throws or rejects the
 *    toast is dismissed and `onError` runs (default: a toast), so roll your state back.
 *  - Keyboard (no dragging required, WCAG 2.5.7): focus the grip, Space / Enter picks up,
 *    Up / Down moves within the column, Left / Right moves between columns, Space / Enter
 *    drops, Esc cancels. Every step is announced in a live region. Also offer "Move to..."
 *    in the row's ActionMenu for the same reason.
 *  - Touch: the grip is always visible (44px) and has touch-action: none, so dragging it
 *    never fights page scrolling; the rest of the card still scrolls normally. On hover
 *    devices the grip appears on hover and on focus.
 *  - Keep ids out of draggable content: the lifted copy renders the same children twice.
 */

type Line = { container: string; top: number }

type DragState = {
  id: string
  from: DragLocation
  /** Where it lands if released now, as the index it will have AFTER the move. */
  over: DragLocation | null
  line: Line | null
  mode: "pointer" | "keyboard"
  size: { width: number; height: number; left: number; top: number }
}

type Snapshot = {
  drag: DragState | null
  dropped: string | null
  focusId: string | null
  announcement: string
}

type ItemInfo = {
  id: string
  container: string
  index: number
  getEl: () => HTMLElement | null
}

type ZoneInfo = {
  id: string
  getEl: () => HTMLElement | null
  accepts: (id: string, from: DragLocation) => boolean
}

type Handlers = {
  onMove: (move: DragMove) => void | Promise<unknown>
  describe: (id: string) => string
  containerLabel: (container: string) => string
  undoMessage?: (move: DragMove) => React.ReactNode
  undo: boolean
  onError?: (error: unknown, move: DragMove) => void
}

type Session = {
  id: string
  from: DragLocation
  pointerId: number
  startX: number
  startY: number
  grabX: number
  grabY: number
  x: number
  y: number
  started: boolean
  size: DragState["size"]
}

function computeLine(
  zoneEl: HTMLElement,
  zoneId: string,
  items: ItemInfo[],
  gap: number
): Line {
  const zone = zoneEl.getBoundingClientRect()
  const before = items[gap - 1]?.getEl()?.getBoundingClientRect()
  const after = items[gap]?.getEl()?.getBoundingClientRect()
  let y: number
  if (before && after) y = (before.bottom + after.top) / 2
  else if (before) y = before.bottom + 2
  else if (after) y = after.top - 2
  else y = zone.top + 8
  return { container: zoneId, top: y - zone.top + zoneEl.scrollTop }
}

function sameTarget(drag: DragState, over: DragLocation | null, line: Line | null) {
  const a = drag.over
  const sameOver =
    (a === null && over === null) ||
    (a !== null && over !== null && a.container === over.container && a.index === over.index)
  const b = drag.line
  const sameLine =
    (b === null && line === null) ||
    (b !== null && line !== null && b.container === line.container && Math.abs(b.top - line.top) < 0.5)
  return sameOver && sameLine
}

/**
 * The drag state machine. It lives outside React (a tiny external store) so a pointer move
 * does not re-render the board: the lifted card is moved by writing its style directly, and
 * React only re-renders when the drop target actually changes.
 */
class DragController {
  private handlers: Handlers = {
    onMove: () => undefined,
    describe: (id) => id,
    containerLabel: (container) => container,
    undo: true,
  }
  private items = new Map<string, ItemInfo>()
  private zones = new Map<string, ZoneInfo>()
  private listeners = new Set<() => void>()
  private snapshot: Snapshot = { drag: null, dropped: null, focusId: null, announcement: "" }
  private session: Session | null = null
  private ghost: HTMLElement | null = null
  private droppedTimer = 0

  configure = (handlers: Handlers) => {
    this.handlers = handlers
  }

  describe = (id: string) => this.handlers.describe(id)

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  private emit(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  private say(announcement: string) {
    this.emit({ announcement })
  }

  clearFocus = () => {
    if (this.snapshot.focusId !== null) this.emit({ focusId: null })
  }

  registerItem = (info: ItemInfo) => {
    this.items.set(info.id, info)
    return () => {
      if (this.items.get(info.id) === info) this.items.delete(info.id)
    }
  }

  registerZone = (info: ZoneInfo) => {
    this.zones.set(info.id, info)
    return () => {
      if (this.zones.get(info.id) === info) this.zones.delete(info.id)
    }
  }

  setGhost = (element: HTMLElement | null) => {
    this.ghost = element
    const s = this.session
    if (element && s?.started) {
      element.style.translate = `${s.x - s.grabX}px ${s.y - s.grabY}px`
    }
  }

  private itemsIn(container: string) {
    return [...this.items.values()]
      .filter((item) => item.container === container)
      .sort((a, b) => a.index - b.index)
  }

  private label(container: string) {
    return this.handlers.containerLabel(container)
  }

  /* ---------------- pointer ---------------- */

  pointerDown = (event: React.PointerEvent<HTMLElement>, item: ItemInfo) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    if (this.snapshot.drag) return
    const rect = item.getEl()?.getBoundingClientRect()
    if (!rect) return
    this.session = {
      id: item.id,
      from: { container: item.container, index: item.index },
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      started: false,
      size: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  pointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const s = this.session
    if (!s || s.pointerId !== event.pointerId) return
    s.x = event.clientX
    s.y = event.clientY
    if (!s.started) {
      if (Math.hypot(s.x - s.startX, s.y - s.startY) < 4) return
      s.started = true
      this.emit({
        drag: { id: s.id, from: s.from, over: null, line: null, mode: "pointer", size: s.size },
        announcement: `Picked up ${this.handlers.describe(s.id)}.`,
      })
    }
    if (this.ghost) this.ghost.style.translate = `${s.x - s.grabX}px ${s.y - s.grabY}px`
    const { over, line } = this.locate(s.x, s.y, s)
    const drag = this.snapshot.drag
    if (drag && !sameTarget(drag, over, line)) this.emit({ drag: { ...drag, over, line } })
  }

  pointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const s = this.session
    if (!s || s.pointerId !== event.pointerId) return
    this.session = null
    if (!s.started) return
    this.drop()
  }

  pointerCancel = () => {
    if (this.session?.started) this.cancel()
    this.session = null
  }

  private locate(x: number, y: number, s: Session): { over: DragLocation | null; line: Line | null } {
    let best: ZoneInfo | null = null
    let bestEl: HTMLElement | null = null
    let bestArea = Infinity
    for (const zone of this.zones.values()) {
      const el = zone.getEl()
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
      if (!zone.accepts(s.id, s.from)) continue
      const area = r.width * r.height
      if (area < bestArea) {
        best = zone
        bestEl = el
        bestArea = area
      }
    }
    if (!best || !bestEl) return { over: null, line: null }

    const items = this.itemsIn(best.id)
    let gap = 0
    for (const item of items) {
      const r = item.getEl()?.getBoundingClientRect()
      if (r && y > r.top + r.height / 2) gap += 1
      else break
    }
    const same = best.id === s.from.container
    const index = same && gap > s.from.index ? gap - 1 : gap
    const over = { container: best.id, index }
    const noop = same && index === s.from.index
    return { over, line: noop ? null : computeLine(bestEl, best.id, items, gap) }
  }

  /* ---------------- keyboard ---------------- */

  keyDown = (event: React.KeyboardEvent<HTMLElement>, item: ItemInfo) => {
    const drag = this.snapshot.drag
    const active = drag?.mode === "keyboard" && drag.id === item.id

    if (!active) {
      if ((event.key === " " || event.key === "Enter") && !drag) {
        event.preventDefault()
        const from = { container: item.container, index: item.index }
        this.emit({
          drag: {
            id: item.id,
            from,
            over: from,
            line: null,
            mode: "keyboard",
            size: { width: 0, height: 0, left: 0, top: 0 },
          },
          announcement: `Picked up ${this.handlers.describe(item.id)}. ${this.label(from.container)}, position ${from.index + 1} of ${this.itemsIn(from.container).length}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
        })
      }
      return
    }

    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault()
        this.moveWithinZone(drag, event.key === "ArrowUp" ? -1 : 1)
        break
      case "ArrowLeft":
      case "ArrowRight":
        event.preventDefault()
        this.moveAcrossZones(drag, event.key === "ArrowLeft" ? -1 : 1)
        break
      case " ":
      case "Enter":
        event.preventDefault()
        this.drop(true)
        break
      case "Escape":
        event.preventDefault()
        event.stopPropagation()
        this.cancel()
        break
      case "Tab":
        this.cancel()
        break
      default:
        break
    }
  }

  blur = (id: string) => {
    const drag = this.snapshot.drag
    if (drag?.mode === "keyboard" && drag.id === id) this.cancel()
  }

  private moveWithinZone(drag: DragState, delta: number) {
    const over = drag.over ?? drag.from
    const count = this.itemsIn(over.container).length
    const max = over.container === drag.from.container ? count - 1 : count
    const index = Math.min(max, Math.max(0, over.index + delta))
    if (index !== over.index) this.setKeyboardTarget(drag, { container: over.container, index })
  }

  private moveAcrossZones(drag: DragState, delta: number) {
    const over = drag.over ?? drag.from
    const ordered = [...this.zones.values()]
      .filter((zone) => zone.accepts(drag.id, drag.from))
      .map((zone) => ({ zone, left: zone.getEl()?.getBoundingClientRect().left ?? 0 }))
      .sort((a, b) => a.left - b.left)
    const at = ordered.findIndex((entry) => entry.zone.id === over.container)
    const next = ordered[at + delta]
    if (at === -1 || !next) return
    const count = this.itemsIn(next.zone.id).length
    const max = next.zone.id === drag.from.container ? count - 1 : count
    this.setKeyboardTarget(drag, {
      container: next.zone.id,
      index: Math.min(max, over.index),
    })
  }

  private setKeyboardTarget(drag: DragState, over: DragLocation) {
    const same = over.container === drag.from.container
    const noop = same && over.index === drag.from.index
    let line: Line | null = null
    const zone = this.zones.get(over.container)
    const zoneEl = zone?.getEl()
    if (!noop && zone && zoneEl) {
      const gap = same && over.index >= drag.from.index ? over.index + 1 : over.index
      line = computeLine(zoneEl, zone.id, this.itemsIn(over.container), gap)
    }
    const total = this.itemsIn(over.container).length + (same ? 0 : 1)
    this.emit({
      drag: { ...drag, over, line },
      announcement: `${this.label(over.container)}, position ${over.index + 1} of ${total}.`,
    })
  }

  /* ---------------- finishing ---------------- */

  private drop(fromKeyboard = false) {
    const drag = this.snapshot.drag
    if (!drag) return
    const name = this.handlers.describe(drag.id)
    const move: DragMove | null = drag.over
      ? { id: drag.id, from: drag.from, to: drag.over }
      : null
    this.emit({ drag: null, focusId: fromKeyboard ? drag.id : null })
    if (!move || isNoop(move)) {
      this.say(`Dropped ${name}. Position unchanged.`)
      return
    }
    const total =
      this.itemsIn(move.to.container).length +
      (move.to.container === move.from.container ? 0 : 1)
    this.say(
      `Dropped ${name} in ${this.label(move.to.container)}, position ${move.to.index + 1} of ${total}.`
    )
    window.clearTimeout(this.droppedTimer)
    this.emit({ dropped: drag.id })
    this.droppedTimer = window.setTimeout(() => this.emit({ dropped: null }), 700)
    this.perform(move, false)
  }

  private perform(move: DragMove, isUndo: boolean) {
    const h = this.handlers
    const fail = (error: unknown, toastId?: string | number) => {
      if (toastId !== undefined) toast.dismiss(toastId)
      if (h.onError) h.onError(error, move)
      else toast.error("Couldn't move that. It's back where it was.")
    }

    let result: void | Promise<unknown>
    try {
      result = h.onMove(move)
    } catch (error) {
      fail(error)
      return
    }

    let toastId: string | number | undefined
    if (!isUndo && h.undo) {
      const name = h.describe(move.id)
      toastId = undoToast({
        message:
          h.undoMessage?.(move) ??
          (move.from.container === move.to.container
            ? `Moved ${name}`
            : `Moved ${name} to ${this.label(move.to.container)}`),
        onUndo: () => this.perform(reverseMove(move), true),
      })
    }
    if (result instanceof Promise) result.catch((error: unknown) => fail(error, toastId))
  }

  cancel = () => {
    const drag = this.snapshot.drag
    this.session = null
    if (!drag) return
    this.emit({
      drag: null,
      focusId: drag.mode === "keyboard" ? drag.id : null,
      announcement: `Move cancelled. ${this.handlers.describe(drag.id)} is back in ${this.label(drag.from.container)}, position ${drag.from.index + 1}.`,
    })
  }
}

/* ------------------------------------------------------------------ */

const ControllerContext = React.createContext<DragController | null>(null)
const StateContext = React.createContext<Snapshot & { instructionsId: string }>({
  drag: null,
  dropped: null,
  focusId: null,
  announcement: "",
  instructionsId: "",
})
const ItemContext = React.createContext<ItemInfo | null>(null)

function useController() {
  const controller = React.useContext(ControllerContext)
  if (!controller) throw new Error("Drag components must be rendered inside <DragRoot>")
  return controller
}

function useDragItem() {
  const item = React.useContext(ItemContext)
  if (!item) throw new Error("<DragHandle> must be rendered inside <DragItem>")
  return item
}

/** Which item (if any) is being dragged, for things like a board-level hint. */
function useDragState() {
  const { drag } = React.useContext(StateContext)
  return { draggingId: drag?.id ?? null, mode: drag?.mode ?? null }
}

function DragRoot({
  onMove,
  describe,
  containerLabel = (container) => container,
  undoMessage,
  undo = true,
  onError,
  children,
}: {
  onMove: Handlers["onMove"]
  /** A short name for an item, used in announcements and the undo toast ("INC-12 Disk full"). */
  describe: Handlers["describe"]
  containerLabel?: Handlers["containerLabel"]
  undoMessage?: Handlers["undoMessage"]
  undo?: boolean
  onError?: Handlers["onError"]
  children: React.ReactNode
}) {
  const [controller] = React.useState(() => new DragController())
  const snapshot = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  )
  const instructionsId = React.useId()

  React.useEffect(() => {
    controller.configure({ onMove, describe, containerLabel, undoMessage, undo, onError })
  })

  const pointerActive = snapshot.drag?.mode === "pointer"
  React.useEffect(() => {
    if (!pointerActive) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") controller.cancel()
    }
    const { userSelect, cursor } = document.body.style
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.userSelect = userSelect
      document.body.style.cursor = cursor
    }
  }, [pointerActive, controller])

  const state = React.useMemo(() => ({ ...snapshot, instructionsId }), [snapshot, instructionsId])

  return (
    <ControllerContext.Provider value={controller}>
      <StateContext.Provider value={state}>
        {children}
        <p id={instructionsId} hidden>
          Press Space to pick up. Use the arrow keys to move, Space to drop, and Escape to cancel.
        </p>
        <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
          {snapshot.announcement}
        </div>
      </StateContext.Provider>
    </ControllerContext.Provider>
  )
}

function DropZone({
  id,
  accepts,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "id"> & {
  id: string
  /** Refuse some items (a "Resolved" column that only takes mitigated incidents). */
  accepts?: (itemId: string, from: DragLocation) => boolean
}) {
  const controller = useController()
  const { drag } = React.useContext(StateContext)
  const ref = React.useRef<HTMLDivElement>(null)
  const acceptsRef = React.useRef(accepts)

  React.useEffect(() => {
    acceptsRef.current = accepts
  })

  React.useEffect(
    () =>
      controller.registerZone({
        id,
        getEl: () => ref.current,
        accepts: (itemId, from) => acceptsRef.current?.(itemId, from) ?? true,
      }),
    [controller, id]
  )

  const valid = drag !== null && (accepts?.(drag.id, drag.from) ?? true)
  const over = drag?.over?.container === id
  const line = drag?.line?.container === id ? drag.line : null

  return (
    <div
      ref={ref}
      data-slot="drop-zone"
      data-valid={valid ? "true" : undefined}
      data-over={over ? "true" : undefined}
      className={cn(
        "relative rounded-card transition-colors duration-(--duration-fast)",
        "data-[valid=true]:outline-1 data-[valid=true]:-outline-offset-1 data-[valid=true]:outline-dashed data-[valid=true]:outline-border-strong",
        "data-[over=true]:bg-selection data-[over=true]:outline-solid data-[over=true]:outline-primary",
        className
      )}
      {...props}
    >
      {children}
      {line ? (
        <span
          aria-hidden="true"
          data-slot="drop-line"
          className="pointer-events-none absolute inset-x-1 z-(--z-sticky) h-0.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ top: line.top }}
        />
      ) : null}
    </div>
  )
}

function DragGhost({
  size,
  children,
}: {
  size: DragState["size"]
  children: React.ReactNode
}) {
  const controller = useController()
  const [lifted, setLifted] = React.useState(false)
  const attach = React.useCallback(
    (element: HTMLDivElement | null) => controller.setGhost(element),
    [controller]
  )

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setLifted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      ref={attach}
      aria-hidden="true"
      inert
      data-slot="drag-ghost"
      className={cn(
        "pointer-events-none fixed z-(--z-popover) rounded-card shadow-lift",
        "transition-[scale,rotate] duration-(--duration-fast) ease-(--ease-spring)",
        lifted ? "scale-[1.03] rotate-[1.5deg]" : "scale-100 rotate-0"
      )}
      style={{
        left: 0,
        top: 0,
        width: size.width,
        height: size.height,
        translate: `${size.left}px ${size.top}px`,
      }}
    >
      {children}
    </div>
  )
}

function DragItem({
  id,
  container,
  index,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "id"> & {
  id: string
  container: string
  /** Position in the container's data order. */
  index: number
}) {
  const controller = useController()
  const { drag, dropped } = React.useContext(StateContext)
  const ref = React.useRef<HTMLDivElement>(null)
  const info = React.useMemo<ItemInfo>(
    () => ({ id, container, index, getEl: () => ref.current }),
    [id, container, index]
  )

  React.useEffect(() => controller.registerItem(info), [controller, info])

  const mine = drag?.id === id
  const pointer = mine && drag.mode === "pointer"
  const keyboard = mine && drag.mode === "keyboard"

  return (
    <ItemContext.Provider value={info}>
      <div
        ref={ref}
        data-slot="drag-item"
        data-dragging={mine ? "true" : undefined}
        className={cn(
          "group/drag relative rounded-card transition-[scale,rotate,box-shadow] duration-(--duration-fast)",
          pointer && "outline-1 -outline-offset-1 outline-dashed outline-border-strong *:invisible",
          keyboard && "z-(--z-sticky) -rotate-1 scale-[1.03] shadow-lift",
          dropped === id && "animate-attention",
          className
        )}
        {...props}
      >
        {children}
      </div>
      {pointer ? createPortal(<DragGhost size={drag.size}>{children}</DragGhost>, document.body) : null}
    </ItemContext.Provider>
  )
}

function DragHandle({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "type"> & { label?: string }) {
  const controller = useController()
  const item = useDragItem()
  const { focusId, instructionsId } = React.useContext(StateContext)
  const ref = React.useRef<HTMLButtonElement>(null)

  // After a keyboard drop the card may have been re-created in another column: put focus back.
  React.useEffect(() => {
    if (focusId !== item.id) return
    ref.current?.focus()
    controller.clearFocus()
  }, [focusId, item.id, controller])

  return (
    <button
      ref={ref}
      type="button"
      data-slot="drag-handle"
      aria-label={label ?? `Move ${controller.describe(item.id)}`}
      aria-roledescription="drag handle"
      aria-describedby={instructionsId || undefined}
      onPointerDown={(event) => controller.pointerDown(event, item)}
      onPointerMove={(event) => controller.pointerMove(event)}
      onPointerUp={(event) => controller.pointerUp(event)}
      onPointerCancel={() => controller.pointerCancel()}
      onKeyDown={(event) => controller.keyDown(event, item)}
      onBlur={() => controller.blur(item.id)}
      className={cn(
        "hit-area focus-ring inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-subtle select-none active:cursor-grabbing",
        "ready:hover:bg-muted ready:hover:text-foreground",
        "can-hover:opacity-0 can-hover:group-hover/drag:opacity-100 can-hover:group-focus-within/drag:opacity-100 focus-visible:opacity-100",
        className
      )}
      {...props}
    >
      <GripVerticalIcon />
    </button>
  )
}

export { DragRoot, DropZone, DragItem, DragHandle, useDragState }
