import * as React from "react"

export type HeaderCheckState = boolean | "indeterminate"

export type RowSelection = {
  selected: ReadonlySet<string>
  /** Rows the action will touch: every matching row when `allMatching`, else the chosen ids. */
  count: number
  /** True after "Select all N matching": the selection covers rows that are not loaded. */
  allMatching: boolean
  isSelected: (id: string) => boolean
  /** Shift-click selects the range from the last toggled row (current page order). */
  toggle: (id: string, options?: { shift?: boolean }) => void
  /** Header checkbox: none -> all; some -> all (not none); all -> none. */
  toggleAll: () => void
  selectAllMatching: () => void
  clear: () => void
  headerState: HeaderCheckState
}

/**
 * Bulk Actions: selection is a set of ids in application state (not in the DOM), so it
 * survives paging and re-sorting. `ids` are the rows on screen, in display order; they drive
 * the header state and shift-click ranges. `total` is the true number of matching rows
 * ("Select all 247 matching incidents"): pass it live so it follows the filters.
 */
export function useRowSelection(
  ids: readonly string[],
  options: { total?: number } = {}
): RowSelection {
  const { total } = options
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [allMatching, setAllMatching] = React.useState(false)
  const anchor = React.useRef<string | null>(null)

  const onPage = ids.filter((id) => allMatching || selected.has(id)).length
  const headerState: HeaderCheckState =
    ids.length > 0 && onPage === ids.length
      ? true
      : onPage > 0
        ? "indeterminate"
        : false
  const count = allMatching ? (total ?? selected.size) : selected.size

  const isSelected = (id: string) => allMatching || selected.has(id)

  const toggle = (id: string, toggleOptions?: { shift?: boolean }) => {
    // Leaving "all matching" turns it into an explicit selection of the rows on screen.
    const base = new Set(allMatching ? ids : selected)
    const turnOn = !(allMatching || selected.has(id))
    const anchorId = anchor.current
    const from = anchorId ? ids.indexOf(anchorId) : -1
    const to = ids.indexOf(id)
    if (toggleOptions?.shift && from !== -1 && to !== -1) {
      const [low, high] = from < to ? [from, to] : [to, from]
      for (let i = low; i <= high; i++) {
        const rowId = ids[i]
        if (rowId === undefined) continue
        if (turnOn) base.add(rowId)
        else base.delete(rowId)
      }
    } else if (turnOn) {
      base.add(id)
    } else {
      base.delete(id)
    }
    anchor.current = id
    setAllMatching(false)
    setSelected(base)
  }

  const toggleAll = () => {
    const next = new Set(allMatching ? [] : selected)
    if (headerState === true) {
      for (const id of ids) next.delete(id)
      setAllMatching(false)
    } else {
      for (const id of ids) next.add(id)
    }
    setSelected(next)
  }

  const selectAllMatching = () => {
    setSelected(new Set([...selected, ...ids]))
    setAllMatching(true)
  }

  const clear = () => {
    anchor.current = null
    setAllMatching(false)
    setSelected(new Set())
  }

  return {
    selected,
    count,
    allMatching,
    isSelected,
    toggle,
    toggleAll,
    selectAllMatching,
    clear,
    headerState,
  }
}
