import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/*
 * A card is a surface one step above the canvas, held together by padding (common region),
 * a ~8% hairline and a role radius (--radius-card; images and header/footer follow it).
 *
 *  default      flat. Lists, settings, dense dashboards. No shadow.
 *  elevated     stronger edge (~12%) + a resting two-layer shadow. For the ONE card that
 *               should read as "on top" in a view (Von Restorff), never a whole grid.
 *  interactive  lifts ~8px with a growing shadow (200ms ease-out) on hover. The whole card
 *               never scales; media inside zooms ~5% (CardMedia) and revealed actions stagger
 *               ~60ms (`reveal-on-hover` + `--i`). Touch and reduced motion get no lift.
 *               Use `asChild` to make the card itself the link: <Card asChild interactive><a/></Card>.
 *
 * `isolate` makes each card its own stacking context so z-index inside never escapes it.
 */
const cardVariants = cva(
  [
    "group/card relative isolate flex flex-col gap-(--card-spacing) overflow-hidden rounded-(--card-radius) border bg-card py-(--card-spacing) text-sm text-card-foreground",
    "[--card-radius:var(--radius-card)] [--card-spacing:--spacing(6)] data-[size=sm]:[--card-spacing:--spacing(4)]",
    "has-[>img:first-child]:pt-0 has-[>[data-slot=card-media]:first-child]:pt-0",
    "*:[img:first-child]:rounded-t-(--card-radius) *:[img:last-child]:rounded-b-(--card-radius)",
  ],
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border-strong shadow-rest",
      },
      interactive: {
        true: [
          "focus-ring cursor-pointer transition-[translate,box-shadow,border-color] duration-(--duration-card) ease-(--ease-enter)",
          "motion-safe:can-hover:hover:-translate-y-(--card-lift) can-hover:hover:border-border-strong can-hover:hover:shadow-lift",
        ],
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
)

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    size?: "default" | "sm"
    asChild?: boolean
  }

function Card({
  className,
  variant = "default",
  interactive = false,
  size = "default",
  asChild = false,
  ...props
}: CardProps) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-interactive={interactive ? "true" : undefined}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-(--card-radius) px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/** Weight 600 over a dimmer description: hierarchy is carried by weight and contrast, not size. */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

/**
 * Full-bleed image / preview at the top of a card. On an interactive card the image zooms
 * ~5% inside this overflow-hidden frame (the card itself never scales).
 */
function CardMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "relative overflow-hidden [&_img]:size-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-(--duration-card) [&_img]:ease-(--ease-enter)",
        "motion-safe:group-data-[interactive=true]/card:group-hover/card:[&_img]:scale-105",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-(--card-radius) px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardMedia,
  cardVariants,
}
export type { CardProps }
