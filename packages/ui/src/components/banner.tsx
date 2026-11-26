import * as React from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

/*
 * Banner = in-flow, persistent message (the middle tier between a field error and a
 * full-page error). Icon + words + an exit; colour is a tint, never the only signal.
 */
const bannerVariants = cva(
  "flex w-full items-start gap-2.5 rounded-card border px-3 py-2.5 text-sm text-foreground",
  {
    variants: {
      variant: {
        info: "border-border-strong bg-secondary",
        success: "border-success/35 bg-success/10",
        warning: "border-warning/40 bg-warning/10",
        error: "border-destructive/40 bg-destructive/10",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONS = {
  info: { Icon: InfoIcon, className: "text-muted-foreground" },
  success: { Icon: CircleCheckIcon, className: "text-success" },
  warning: { Icon: TriangleAlertIcon, className: "text-warning" },
  error: { Icon: OctagonXIcon, className: "text-destructive" },
} as const

type BannerProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof bannerVariants> & {
    title?: React.ReactNode
    /** e.g. a "Retry" button. Every error banner should have an exit. */
    action?: React.ReactNode
    onDismiss?: () => void
  }

function Banner({
  variant = "info",
  title,
  action,
  onDismiss,
  className,
  children,
  ...props
}: BannerProps) {
  const kind = variant ?? "info"
  const { Icon, className: iconClass } = ICONS[kind]
  return (
    <div
      data-slot="banner"
      data-variant={kind}
      role={kind === "error" || kind === "warning" ? "alert" : "status"}
      className={cn(bannerVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className="text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-me-1 shrink-0"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}

export { Banner, bannerVariants }
