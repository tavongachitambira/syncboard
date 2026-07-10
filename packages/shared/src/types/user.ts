// ─── Role ─────────────────────────────────────────────────────────────────────

export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  VIEWER: "VIEWER",
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

// ─── Notification ─────────────────────────────────────────────────────────────

export const NotificationType = {
  ASSIGNMENT: "ASSIGNMENT",
  INCIDENT_CREATED: "INCIDENT_CREATED",
  MENTION: "MENTION",
} as const
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType]

export const NotificationStatus = {
  UNREAD: "UNREAD",
  READ: "READ",
  ARCHIVED: "ARCHIVED",
} as const
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus]

// ─── JWT ─────────────────────────────────────────────────────────────────────
// Custom claims carried in the RS256 access token.
// Shared between apps/api (signing) and apps/socket (verification).

export type JwtPayload = {
  sub: string // userId
  jti: string // token id — used as the Redis key suffix for refresh-token lookups
  organizationId: string
  role: UserRole
  iat: number
  exp: number
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceUser = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

// ─── API Envelope ─────────────────────────────────────────────────────────────
// Shared so apps/web can type API client responses without re-declaring.

export type ApiSuccess<T> = { success: true; data: T }

export type ApiError = {
  success: false
  error: { code: string; message: string; details?: Record<string, string> }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  pages: number
}

// ─── Resource Responses ───────────────────────────────────────────────────────

export type UserResponse = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: UserRole
  organizationId: string
  createdAt: string
}

export type OrganizationResponse = {
  id: string
  name: string
  slug: string
  createdAt: string
}

export type ServiceResponse = {
  id: string
  organizationId: string
  name: string
  description: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type NotificationResponse = {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  status: NotificationStatus
  createdAt: string
  readAt: string | null
}