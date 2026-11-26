import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

/** Four ascending bars: the same signal-bars shape the severity glyph uses. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground">
        <rect x="6.3" y="18.5" width="3.2" height="6" rx="1.1" opacity=".55" />
        <rect x="11.7" y="14.5" width="3.2" height="10" rx="1.1" opacity=".7" />
        <rect x="17.1" y="10.5" width="3.2" height="14" rx="1.1" opacity=".85" />
        <rect x="22.5" y="6.5" width="3.2" height="18" rx="1.1" />
      </g>
    </svg>
  )
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string
  href?: string
}) {
  return (
    <Link
      href={href}
      aria-label="SyncBoard home"
      className={cn(
        "focus-ring -ms-1 inline-flex items-center gap-2 rounded-control px-1 text-base font-semibold tracking-tight",
        className
      )}
    >
      <LogoMark />
      <span>SyncBoard</span>
    </Link>
  )
}
