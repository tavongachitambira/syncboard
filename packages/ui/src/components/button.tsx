import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { Spinner } from "@workspace/ui/components/spinner"

/*
 * Buttons stay enabled when an action is not possible yet (Disabled Buttons):
 *  - validate on click and say what is wrong, don't hide the reason behind a grey box;
 *  - busy  -> `loading` (aria-busy, clicks ignored, focus kept, never `disabled`);
 *  - unavailable (permissions etc.) -> `aria-disabled="true"` + a tooltip that says why.
 * Both still read at >=4.5:1 (no opacity-50). Hover only enhances: every hover style
 * sits behind `ready:` and Tailwind's hover is already gated on (hover: hover).
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none",
    "press-spring focus-ring ready:active:not-aria-[haspopup]:scale-[0.97]",
    "aria-busy:cursor-progress",
    "disabled:border-transparent disabled:bg-secondary disabled:text-subtle aria-disabled:border-transparent aria-disabled:bg-secondary aria-disabled:text-subtle",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground ready:hover:bg-primary-hover ready:active:bg-primary-active",
        secondary:
          "bg-secondary text-secondary-foreground ready:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_7%)] aria-expanded:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_7%)]",
        outline:
          "border-border-strong bg-transparent text-foreground ready:hover:bg-muted aria-expanded:bg-muted aria-pressed:bg-accent disabled:bg-transparent aria-disabled:bg-transparent",
        ghost:
          "bg-transparent text-foreground ready:hover:bg-muted aria-expanded:bg-muted aria-pressed:bg-accent disabled:bg-transparent aria-disabled:bg-transparent",
        /* Soft red: destructive actions that can be undone, or that open a confirm. */
        destructive:
          "bg-destructive/10 text-destructive ready:hover:bg-destructive/16 ready:active:bg-destructive/22 focus-visible:outline-destructive",
        /* Solid red: the final, confirmed step of an irreversible action. */
        "destructive-solid":
          "bg-destructive-solid text-destructive-solid-foreground ready:hover:bg-destructive-solid-hover focus-visible:outline-destructive",
        link: "text-link underline-offset-4 ready:hover:underline disabled:bg-transparent aria-disabled:bg-transparent",
      },
      size: {
        default:
          "h-9 px-3 pointer-coarse:h-11 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        xs: "hit-area h-6 gap-1 rounded-sm px-2 text-xs has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5",
        sm: "h-8 px-2.5 pointer-coarse:h-11 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "h-10 px-4 pointer-coarse:h-11 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        icon: "size-9 pointer-coarse:size-11",
        "icon-xs":
          "hit-area size-6 rounded-sm",
        "icon-sm": "size-8 pointer-coarse:size-11",
        "icon-lg": "size-10 pointer-coarse:size-11",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        class: "h-auto min-h-0 px-0 py-0 pointer-coarse:h-auto",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Busy: stays enabled and focusable, ignores clicks, sets aria-busy. */
    loading?: boolean
    /** Replaces the label while loading ("Signing in…"). The button width follows it. */
    loadingLabel?: React.ReactNode
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingLabel,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  // While busy, swallow clicks (double-submit) without taking the button out of the tab order.
  // Only attached when `loading`, so a Server Component can still render <Button> with no handler.
  const handleClick = loading
    ? (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
      }
    : onClick

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading ? true : undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={handleClick}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner data-icon="inline-start" /> : null}
          {loading && loadingLabel ? loadingLabel : children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
