import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's default scales. Teach it SyncBoard's tokens so
 * `text-2xs` is read as a font size (not a colour), `shadow-overlay` as a shadow, and
 * `rounded-card` as a radius; otherwise `cn("rounded-control", "rounded-full")` or
 * `cn("text-2xs", "text-muted-foreground")` would keep both and CSS order would decide.
 * Keep this list in step with the `@theme` blocks in styles/globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs"],
      radius: ["tooltip", "control", "card", "dialog", "panel", "item"],
      shadow: ["rest", "overlay", "dialog", "lift", "glow"],
      ease: ["enter", "exit", "move", "spring"],
      animate: [
        "shimmer",
        "pulse-ring",
        "drain",
        "pop",
        "attention",
        "delayed-in",
        "draw",
      ],
      spacing: [
        "within",
        "between",
        "phi-1",
        "phi-2",
        "phi-3",
        "phi-4",
        "phi-5",
        "gutter",
        "gutter-dense",
        "gutter-editorial",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
