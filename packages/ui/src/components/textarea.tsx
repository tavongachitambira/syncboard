import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-control border border-input bg-field px-2.5 py-2 text-base text-foreground transition-[border-color,outline-color] pointer-fine:text-sm",
        "placeholder:text-subtle",
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

export { Textarea }
