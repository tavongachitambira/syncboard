/**
 * Pure helpers for list and board reordering. `index` always means the position the item has
 * AFTER the move, so the same numbers work inside one list and across lists.
 */
export type DragLocation = { container: string; index: number }
export type DragMove = { id: string; from: DragLocation; to: DragLocation }

/** A new array with the item at `from` moved so that it ends up at index `to`. */
export function moveWithin<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice()
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1)
  if (item === undefined) return next
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}

/** Applies a move to a `{ containerId: items[] }` map (a status board). Inputs are not mutated. */
export function applyMove<T>(
  columns: Readonly<Record<string, readonly T[]>>,
  move: DragMove
): Record<string, T[]> {
  const next: Record<string, T[]> = {}
  for (const key of Object.keys(columns)) next[key] = (columns[key] ?? []).slice()
  const source = next[move.from.container]
  const target = next[move.to.container]
  if (!source || !target) return next
  const [item] = source.splice(move.from.index, 1)
  if (item === undefined) return next
  target.splice(Math.max(0, Math.min(move.to.index, target.length)), 0, item)
  return next
}

/** The move that puts everything back (what the undo toast performs). */
export function reverseMove(move: DragMove): DragMove {
  return { id: move.id, from: move.to, to: move.from }
}

export function isNoop(move: DragMove): boolean {
  return (
    move.from.container === move.to.container && move.from.index === move.to.index
  )
}
