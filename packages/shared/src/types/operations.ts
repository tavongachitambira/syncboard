import type { OpState } from "./incident.js"

// ─── Operation ────────────────────────────────────────────────────────────────
// Mirrors the DB row. payload is base64-encoded Yjs Uint8Array for JSON transport.

export type Operation = {
  id: string
  incidentId: string
  authorId: string
  messageId: string
  payload: string // base64 Yjs update
  state: OpState
  createdAt: string
}

// ─── SyncState ────────────────────────────────────────────────────────────────
// Sent to a client on room join so it can reconstruct the current document.
// Client applies: Y.applyUpdate(doc, snapshot) then operations in order.

export type SyncState = {
  snapshot: string | null // base64 Yjs snapshot, null if no snapshot yet
  operations: Operation[] // PENDING ops since the snapshot
  snapshotVersion: number
}

// ─── Payloads that cross the Socket boundary ──────────────────────────────────

export type DocumentUpdatePayload = {
  incidentId: string
  update: string // base64 Yjs Uint8Array
  messageId: string
}