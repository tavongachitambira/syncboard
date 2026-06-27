// ─── Status & Severity ────────────────────────────────────────────────────────

export const IncidentStatus = {
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  MITIGATING: "MITIGATING",
  RESOLVED: "RESOLVED",
} as const
export type IncidentStatus =
  (typeof IncidentStatus)[keyof typeof IncidentStatus]

export const Severity = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const
export type Severity = (typeof Severity)[keyof typeof Severity]

// ─── OpState ─────────────────────────────────────────────────────────────────
// Tracks whether a Yjs operation has been rolled into a snapshot.
// PENDING ops are replayed on reconnect; ARCHIVED ops are pre-snapshot.

export const OpState = {
  PENDING: "PENDING",
  ARCHIVED: "ARCHIVED",
} as const
export type OpState = (typeof OpState)[keyof typeof OpState]

// ─── Activity ─────────────────────────────────────────────────────────────────

export const ActivityType = {
  INCIDENT_CREATED: "INCIDENT_CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SEVERITY_CHANGED: "SEVERITY_CHANGED",
  ASSIGNED: "ASSIGNED",
  UNASSIGNED: "UNASSIGNED",
  COMMENT_ADDED: "COMMENT_ADDED",
  RESOLVED: "RESOLVED",
} as const
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

// ─── Response Types ───────────────────────────────────────────────────────────

export type AssigneeResponse = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export type IncidentResponse = {
  id: string
  organizationId: string
  serviceId: string
  title: string
  severity: Severity
  status: IncidentStatus
  version: number
  assignees: AssigneeResponse[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export type CommentResponse = {
  id: string
  incidentId: string
  author: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  content: string
  createdAt: string
}

export type ActivityResponse = {
  id: string
  incidentId: string
  actor: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  type: ActivityType
  payload: Record<string, unknown>
  createdAt: string
}