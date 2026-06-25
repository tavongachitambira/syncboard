# ADR-04: Yjs for Collaborative Document Editing

**Project:** SyncBoard

**Version:** 1.0

**Status:** Accepted

**Date:** 2025-01

---

# Context

Each incident in SyncBoard has a shared notes document that multiple engineers can edit simultaneously during an active incident. The editing experience must be:

- Conflict-free — two users editing at the same time must not overwrite each other's changes
- Low-latency — changes must appear on other clients within 100–150ms
- Resilient — users who lose connectivity briefly must be able to rejoin and receive the correct document state

Traditional approaches to multi-user editing fall into two categories:

**Operational Transform (OT)** — used by Google Docs. Operations are transformed against each other when they arrive out of order. This requires a central server to serialize and transform every operation, making it complex to implement correctly.

**CRDTs (Conflict-free Replicated Data Types)** — data structures that can be merged without conflict regardless of the order operations arrive. No central arbitration is required for merging.

---

# Decision

SyncBoard uses **Yjs** for collaborative shared notes.

Yjs is a CRDT implementation for JavaScript. It models a document as a collection of data types (`Y.Text`, `Y.Map`, `Y.Array`) that merge automatically.

Workflow:

```
User types
↓
Yjs produces a binary update (Uint8Array)
↓
Update is broadcast via Socket.IO to all clients in the incident room
↓
Other clients apply the update to their local Yjs document
↓
Document is consistent across all clients
```

Persistence:

- Every Yjs update is stored as an immutable `Operation` row in PostgreSQL
- Periodically, a snapshot of the full document state is computed and stored as `BYTEA` in the `IncidentDocument` table
- When a new client joins, it loads the latest snapshot and replays only the operations that occurred after the snapshot

Snapshot strategy: a snapshot is generated after every 100 operations or 5 minutes of inactivity, whichever comes first.

---

# Alternatives Considered

## Optimistic Locking (last-write-wins)

Treat the notes field as a regular database column with version-based optimistic locking.

Rejected because:

- Concurrent edits cause conflicts that the server must resolve
- Last-write-wins silently discards one user's changes
- Users lose work without warning, which is unacceptable during an active incident

## Automerge

An alternative CRDT library with a different internal representation.

Not selected because:

- Yjs has broader adoption in the JavaScript ecosystem
- Yjs has mature integrations with editor libraries (Tiptap, Quill, ProseMirror, CodeMirror)
- Yjs binary encoding is more compact than Automerge's format

## ShareDB (Operational Transform)

A production-ready OT server used in many collaborative editors.

Rejected because:

- Requires a central server to serialize and transform operations — a single point of failure
- More complex to implement than CRDTs for the same result
- CRDT-based approaches have largely superseded OT for new collaborative applications

---

# Consequences

**Positive**

- Two users can edit simultaneously without conflict — Yjs merges their changes automatically
- The server does not need to arbitrate merges — it stores and broadcasts updates
- Clients that reconnect after a brief disconnect replay missed operations and converge to the correct state
- Yjs integrates with Tiptap and other rich-text editors if a richer editing experience is needed in future

**Negative**

- Yjs binary updates are opaque — they cannot be read or queried like plain text in the database
- The operation log grows indefinitely without compaction — snapshots reduce the replay burden but the operation table must be managed over time
- Yjs's internal CRDT data structures use more memory than a plain string for large documents
- Debugging CRDT merge behavior is more complex than debugging plain database writes

---

# Notes

Structured incident fields (status, severity, title, assignments) are **not** managed by Yjs.

These fields are server-authoritative and updated through the REST API with optimistic locking.

Yjs is used only for the unstructured shared notes document where simultaneous editing by multiple users is the expected pattern.

The `IncidentDocument.snapshot` column stores the Yjs document state as `BYTEA`.

The `Operation.payload` column stores individual Yjs updates as `BYTEA`.

The `Operation.messageId` column is unique, which ensures that replaying the operation log never applies the same update twice.
