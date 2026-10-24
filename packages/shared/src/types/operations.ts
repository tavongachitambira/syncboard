import type { OpState } from "./incident.ts"

// ─── Operation ────────────────────────────────────────────────────────────────
// Mirrors the DB row. payload is a base64-encoded Yjs update for JSON transport.

export type Operation = {
  id: string
  incidentId: string
  authorId: string
  messageId: string
  payload: string
  state: OpState
  createdAt: string
}

// ─── SyncState ────────────────────────────────────────────────────────────────
// Sent to a client on room join so it can rebuild the document: apply the
// snapshot, then the operations in order.

export type SyncState = {
  snapshot: string | null
  operations: Operation[]
  snapshotVersion: number
}