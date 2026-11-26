"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border-strong bg-secondary px-1 font-mono text-2xs font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

const subscribe = () => () => {}

/** True on Apple platforms. Server and first client render say false, then it corrects. */
function useIsApple() {
  return React.useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false
  )
}

const KEY_GLYPH: Record<string, { apple: string; other: string }> = {
  mod: { apple: "⌘", other: "Ctrl" },
  shift: { apple: "⇧", other: "Shift" },
  alt: { apple: "⌥", other: "Alt" },
  enter: { apple: "↵", other: "Enter" },
  esc: { apple: "Esc", other: "Esc" },
  backspace: { apple: "⌫", other: "Backspace" },
  up: { apple: "↑", other: "↑" },
  down: { apple: "↓", other: "↓" },
  left: { apple: "←", other: "←" },
  right: { apple: "→", other: "→" },
}

/** `<Shortcut keys={["mod", "K"]} />` renders ⌘ K on a Mac and Ctrl K elsewhere. */
function Shortcut({
  keys,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { keys: string[] }) {
  const apple = useIsApple()
  return (
    <KbdGroup className={className} {...props}>
      {keys.map((key, i) => {
        const glyph = KEY_GLYPH[key.toLowerCase()]
        return (
          <Kbd key={`${key}-${i}`}>
            {glyph ? (apple ? glyph.apple : glyph.other) : key}
          </Kbd>
        )
      })}
    </KbdGroup>
  )
}

export { Kbd, KbdGroup, Shortcut, useIsApple }
