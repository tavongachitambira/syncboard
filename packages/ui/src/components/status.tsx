import * as React from "react"
import type { IncidentStatus, Severity } from "@workspace/shared"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Severity = signal bars (4/3/2/1) + a text label; urgency colour is orange/amber,
 * never red (red is reserved for destruction). Colour is the third cue, not the first.
 * Status = a quiet grey progress glyph (Linear-style): shape carries the state.
 */

const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  MITIGATING: "Mitigating",
  RESOLVED: "Resolved",
}

const SEVERITY_BARS: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: "text-sev-critical",
  HIGH: "text-sev-high",
  MEDIUM: "text-sev-medium",
  LOW: "text-sev-low",
}

type IconProps = Omit<React.ComponentProps<"svg">, "children"> & {
  /** Provide to expose the glyph to assistive tech; otherwise it is decorative. */
  title?: string
}

function SeverityIcon({
  severity,
  title,
  className,
  ...props
}: IconProps & { severity: Severity }) {
  const filled = SEVERITY_BARS[severity]
  return (
    <svg
      data-slot="severity-icon"
      data-severity={severity}
      viewBox="0 0 16 16"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-4 shrink-0", SEVERITY_COLOR[severity], className)}
      {...props}
    >
      {[0, 1, 2, 3].map((i) => {
        const height = 4 + i * 3
        return (
          <rect
            key={i}
            x={1.25 + i * 3.6}
            y={14.5 - height}
            width={2.5}
            height={height}
            rx={0.75}
            fill="currentColor"
            opacity={i < filled ? 1 : 0.28}
          />
        )
      })}
    </svg>
  )
}

const STATUS_FRACTION: Record<IncidentStatus, number> = {
  OPEN: 0,
  INVESTIGATING: 0.25,
  MITIGATING: 0.75,
  RESOLVED: 1,
}

function StatusIcon({
  status,
  title,
  className,
  ...props
}: IconProps & { status: IncidentStatus }) {
  const fraction = STATUS_FRACTION[status]
  // Pie slice via a fat stroke on an r=3 circle: circumference 2πr ≈ 18.85.
  const circumference = 2 * Math.PI * 3
  return (
    <svg
      data-slot="status-icon"
      data-status={status}
      viewBox="0 0 16 16"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={status === "OPEN" ? "2.4 2.4" : undefined}
        fill={status === "RESOLVED" ? "currentColor" : "none"}
      />
      {status === "RESOLVED" ? (
        <path
          d="M5.4 8.2 7.2 10l3.4-3.8"
          stroke="var(--card)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : fraction > 0 ? (
        <circle
          cx="8"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${fraction * circumference} ${circumference}`}
          transform="rotate(-90 8 8)"
        />
      ) : null}
    </svg>
  )
}

type LabelledProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Icon only: the label stays in the DOM for screen readers. */
  iconOnly?: boolean
}

function SeverityBadge({
  severity,
  iconOnly = false,
  className,
  ...props
}: LabelledProps & { severity: Severity }) {
  return (
    <span
      data-slot="severity-badge"
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-foreground",
        className
      )}
      {...props}
    >
      <SeverityIcon severity={severity} />
      <span className={iconOnly ? "sr-only" : undefined}>
        {SEVERITY_LABEL[severity]}
      </span>
    </span>
  )
}

function StatusBadge({
  status,
  iconOnly = false,
  className,
  ...props
}: LabelledProps & { status: IncidentStatus }) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-foreground",
        className
      )}
      {...props}
    >
      <StatusIcon status={status} />
      <span className={iconOnly ? "sr-only" : undefined}>
        {STATUS_LABEL[status]}
      </span>
    </span>
  )
}

export {
  SeverityIcon,
  SeverityBadge,
  StatusIcon,
  StatusBadge,
  SEVERITY_LABEL,
  STATUS_LABEL,
}
