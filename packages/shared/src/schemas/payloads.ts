import { z } from "zod"

// Zod schemas for every inbound Socket.IO payload.
// Used by apps/socket event handlers to validate client-sent data before
// any business logic runs. apps/web imports these for the matching emits
// so both sides stay in sync on the contract without duplication.

// ─── Room join ────────────────────────────────────────────────────────────────

export const joinIncidentRoomSchema = z.object({
  incidentId: z.uuid(),
})
export type JoinIncidentRoomPayload = z.infer<typeof joinIncidentRoomSchema>

// ─── Yjs collaboration ────────────────────────────────────────────────────────

// schemas/payloads.ts
export const documentUpdateSchema = z.object({
  incidentId: z.uuid(),
  update: z.string().min(1),
  messageId: z.uuid(),
})
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>  // ← was DocumentUpdatePayload

export const documentSyncRequestSchema = z.object({
  incidentId: z.uuid(),
  // Client sends its latest known snapshotVersion so the server
  // can return only the delta since that point.
  fromVersion: z.number().int().nonnegative(),
})
export type DocumentSyncRequestPayload = z.infer<
  typeof documentSyncRequestSchema
>

// ─── Presence ─────────────────────────────────────────────────────────────────

export const presenceHeartbeatSchema = z.object({
  incidentId: z.uuid(),
})
export type PresenceHeartbeatPayload = z.infer<typeof presenceHeartbeatSchema>