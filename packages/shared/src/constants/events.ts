// Event name constants for every Socket.IO event in the system.
//
// Convention: domain.action  — pure dot notation, no colon prefixes.
// Scoping is provided by the room, not the event name:
//   organization:{organizationId}  — org-wide events
//   incident:{incidentId}          — incident-specific and presence events

export const SocketEvents = {
  // ── Organization room ─────────────────────────────────────────────────────
  INCIDENT_CREATED: "incident.created",
  MEMBER_INVITED: "member.invited",
  NOTIFICATION_CREATED: "notification.created",

  // ── Incident room — lifecycle ─────────────────────────────────────────────
  INCIDENT_UPDATED: "incident.updated",
  INCIDENT_STATUS_CHANGED: "incident.status.changed",
  INCIDENT_SEVERITY_CHANGED: "incident.severity.changed",
  INCIDENT_RESOLVED: "incident.resolved",

  // ── Incident room — assignments ───────────────────────────────────────────
  INCIDENT_ASSIGNMENT_CREATED: "incident.assignment.created",
  INCIDENT_ASSIGNMENT_REMOVED: "incident.assignment.removed",

  // ── Incident room — comments ──────────────────────────────────────────────
  INCIDENT_COMMENT_CREATED: "incident.comment.created",
  INCIDENT_COMMENT_UPDATED: "incident.comment.updated",
  INCIDENT_COMMENT_DELETED: "incident.comment.deleted",

  // ── Incident room — activity ──────────────────────────────────────────────
  INCIDENT_ACTIVITY_CREATED: "incident.activity.created",

  // ── Presence (incident room) ──────────────────────────────────────────────
  PRESENCE_JOINED: "presence.joined",
  PRESENCE_LEFT: "presence.left",
  PRESENCE_UPDATED: "presence.updated",

  // ── Yjs collaboration (incident room) ────────────────────────────────────
  DOCUMENT_CONNECTED: "document.connected",
  DOCUMENT_UPDATED: "document.updated",
  DOCUMENT_SNAPSHOT_SAVED: "document.snapshot.saved",
  DOCUMENT_SYNCED: "document.synced",
} as const

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents]