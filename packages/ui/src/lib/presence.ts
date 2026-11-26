/**
 * Presence identity: a stable, hash-derived colour per person (8 slots).
 * Each slot is AA with `text-presence-fg` and >=3:1 against both canvases.
 *
 * Class names are spelled out in full so Tailwind's scanner can see them.
 * Never build `bg-presence-${i}` dynamically.
 */
export const PRESENCE_COUNT = 8

/** FNV-1a: same id -> same colour on every client, with no coordination. */
export function presenceIndex(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % PRESENCE_COUNT
}

export const presenceBg = [
  "bg-presence-0",
  "bg-presence-1",
  "bg-presence-2",
  "bg-presence-3",
  "bg-presence-4",
  "bg-presence-5",
  "bg-presence-6",
  "bg-presence-7",
] as const

export const presenceText = [
  "text-presence-0",
  "text-presence-1",
  "text-presence-2",
  "text-presence-3",
  "text-presence-4",
  "text-presence-5",
  "text-presence-6",
  "text-presence-7",
] as const

export const presenceBorder = [
  "border-presence-0",
  "border-presence-1",
  "border-presence-2",
  "border-presence-3",
  "border-presence-4",
  "border-presence-5",
  "border-presence-6",
  "border-presence-7",
] as const

export const presenceOutline = [
  "outline-presence-0",
  "outline-presence-1",
  "outline-presence-2",
  "outline-presence-3",
  "outline-presence-4",
  "outline-presence-5",
  "outline-presence-6",
  "outline-presence-7",
] as const

export const presenceRing = [
  "ring-presence-0",
  "ring-presence-1",
  "ring-presence-2",
  "ring-presence-3",
  "ring-presence-4",
  "ring-presence-5",
  "ring-presence-6",
  "ring-presence-7",
] as const

export const presenceFill = [
  "fill-presence-0",
  "fill-presence-1",
  "fill-presence-2",
  "fill-presence-3",
  "fill-presence-4",
  "fill-presence-5",
  "fill-presence-6",
  "fill-presence-7",
] as const

export const presenceStroke = [
  "stroke-presence-0",
  "stroke-presence-1",
  "stroke-presence-2",
  "stroke-presence-3",
  "stroke-presence-4",
  "stroke-presence-5",
  "stroke-presence-6",
  "stroke-presence-7",
] as const

export function presenceClasses(seed: string) {
  const i = presenceIndex(seed)
  return {
    index: i,
    bg: presenceBg[i],
    text: presenceText[i],
    border: presenceBorder[i],
    outline: presenceOutline[i],
    ring: presenceRing[i],
    fill: presenceFill[i],
    stroke: presenceStroke[i],
  } as const
}
