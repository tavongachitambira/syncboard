import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Field states (rest / hover / focus / invalid / disabled / read-only) are all legible:
 * the edge clears 3:1, placeholder and disabled text clear 4.5:1 (no opacity-50).
 * Text is 16px on coarse pointers (no iOS zoom-on-focus) and 13px with a mouse.
 * `user-invalid:` flags a bad value natively, only after the person has interacted.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-control border border-input bg-field px-2.5 py-1 text-base text-foreground transition-[border-color,outline-color] pointer-fine:text-sm pointer-coarse:h-11",
        "placeholder:text-subtle file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "ready:hover:border-foreground/50",
        "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
        "read-only:bg-secondary disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary disabled:text-subtle",
        "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive user-invalid:border-destructive user-invalid:focus-visible:outline-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
