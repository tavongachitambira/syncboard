# 12 - Realtime Architecture

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the realtime architecture of SyncBoard.

It describes how users collaborate simultaneously, how data is synchronized, how conflicts are resolved, and how the system maintains consistency across multiple connected clients.

Unlike the REST API, which is request-response based, the realtime layer provides low-latency, bidirectional communication between clients and the server.

---

# Goals

The realtime system should provide:

- Live incident updates
- Collaborative note editing
- Presence indicators
- Instant notifications
- Reliable synchronization
- Automatic reconnection
- Conflict-free editing

---

# Design Principles

The realtime architecture follows these principles:

- Server authoritative
- Event-driven
- Eventually consistent
- Conflict-free collaboration
- Stateless websocket servers
- Horizontal scalability

---

# Technology Stack

| Component | Technology |
|------------|------------|
|Realtime Transport|Socket.IO|
|Collaborative Editing|Yjs|
|Presence|Redis|
|Pub/Sub|Redis|
|Persistent Storage|PostgreSQL|
|ORM|Prisma|

---

# High-Level Architecture

```text
                    Browser

                       │

                Socket.IO Client

                       │

──────────────────────────────────────────────

                 Socket.IO Server

                       │

          ┌────────────┴────────────┐

          │                         │

      REST API               Yjs Engine

          │                         │

          └────────────┬────────────┘

                       │

                 PostgreSQL

                       │

                    Redis

          Presence + Pub/Sub
```

---

# Connection Lifecycle

```text
User Opens Application

↓

Authenticate

↓

Open WebSocket

↓

Join Organization Room

↓

Join Incident Room

↓

Receive Current State

↓

Receive Live Events

↓

Disconnect

↓

Reconnect Automatically
```

---

# Authentication

The websocket connection requires a valid access token.

Handshake

```
Client

↓

Access Token Cookie

↓

Signature Verified (public key, RS256)

↓

Socket Established
```

Unauthenticated, expired, or invalid-signature connections are rejected.

Verified claims (`sub`, `organizationId`, `role`, `exp`) are stored on the socket. Two checks keep a connection from outliving its token, neither needing a Redis or database lookup: a timer closes the connection at `exp`, and a guard re-checks `exp` in memory before every inbound event. In both cases the server emits `auth.expired` and disconnects; the client refreshes via `/auth/refresh` and reconnects with the new cookie. Handshake rejections carry the error code in `err.data.code` (`MISSING_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN`). The handshake `Origin` header must match the web origin, because CORS does not apply to WebSocket upgrades.

---

# Room Structure

Rooms isolate communication.

Organization Room

```
organization:{organizationId}
```

Used for:

- Notifications
- New incidents
- Member activity

---

Incident Room

```
incident:{incidentId}
```

Used for:

- Shared notes
- Comments
- Presence
- Status changes
- Timeline updates

---

# Presence System

Presence is ephemeral.

It should **never** be stored permanently in PostgreSQL.

Redis maintains online state.

Example

```
incident:123

↓

John

Sarah

Emma
```

Disconnect automatically removes users.

---

# Realtime Events

## Organization Events

Emitted to the `organization:{organizationId}` room.

```
incident.created

member.invited

notification.created
```

---

## Incident Events

```
incident.updated

incident.status.changed

incident.severity.changed

incident.assignment.created

incident.assignment.removed

incident.comment.created

incident.comment.updated

incident.comment.deleted

incident.activity.created

incident.resolved
```

---

## Connection Events

```
auth.expired
```

Emitted by the server to a single socket when its access token expires. Not sent to a room.

---

## Presence Events

```
presence.joined

presence.left

presence.updated
```

---

## Collaboration Events

```
document.connected

document.updated

document.snapshot.saved

document.synced
```

---

# Collaborative Editing

SyncBoard uses **Yjs** for collaborative notes.

Instead of sending the entire document after every change, clients exchange incremental updates.

Workflow

```text
User Types

↓

Yjs Update

↓

Socket.IO

↓

Other Clients

↓

Document Updated
```

---

# Document Ownership

Each incident owns exactly one collaborative document.

```
Incident

↓

IncidentDocument

↓

Operations

↓

Snapshot
```

---

# Snapshot Strategy

Yjs operations accumulate over time.

To avoid replaying thousands of operations:

```
Operations

↓

Snapshot Created

↓

Older Operations Archived (Future)
```

Snapshots improve loading performance.

---

# Synchronization Flow

```
User Opens Incident

↓

Request Snapshot

↓

Receive Snapshot

↓

Replay Missing Operations

↓

Realtime Synchronization Begins
```

---

# Operation Persistence

Every collaborative edit produces an immutable operation.

```
User Edit

↓

Operation

↓

Persist Database

↓

Broadcast

↓

Other Clients
```

Operations should never be modified.

---

# Conflict Resolution

Traditional optimistic locking is **not** used for collaborative notes.

Instead:

```
Concurrent Edit

↓

Yjs CRDT Merge

↓

Consistent Document
```

Users never experience merge conflicts.

---

# Structured Data Updates

Fields such as:

- Status
- Severity
- Title
- Assignments

are **not** CRDT documents.

These updates follow:

```
Client

↓

REST API

↓

Database Transaction

↓

WebSocket Broadcast
```

Structured business data remains server authoritative.

---

# Presence Flow

```
Join Incident

↓

Redis

↓

Broadcast

↓

Participants Updated
```

Leaving an incident removes presence automatically.

---

# Comment Synchronization

```
Comment Created

↓

REST API

↓

Database

↓

Activity Generated

↓

Notification Created

↓

WebSocket Broadcast

↓

Clients Updated
```

---

# Notification Flow

```
Business Event

↓

Notification Created

↓

Persist Database

↓

Broadcast

↓

Notification Center Updated
```

---

# Activity Timeline Updates

Every business event creates an activity.

```
Status Changed

↓

Activity Stored

↓

Broadcast

↓

Timeline Updated
```

Clients never poll for timeline updates.

---

# Reconnection Strategy

Unexpected disconnect

↓

Reconnect

↓

Authenticate

↓

Rejoin Rooms

↓

Request Missing Events

↓

Resume Synchronization

---

# Event Ordering

Events are processed in creation order.

Each event contains:

```
eventId

timestamp

organizationId

resourceId
```

Clients ignore duplicate events.

---

# Reliability

If broadcasting fails:

1. Persist event
2. Retry broadcast
3. Client catches up on reconnect

Business data must never depend solely on websocket delivery.

---

# Horizontal Scaling

Version 1

```
Single Socket.IO Server
```

Future

```
Load Balancer

↓

Socket.IO Servers

↓

Redis Adapter

↓

Redis Pub/Sub
```

Redis synchronizes events across servers.

---

# Rate Limiting

Limit abusive clients.

Examples

```
Comments

30/min

Typing

Unlimited (local)

Presence

Automatic

Document Updates

Handled by Yjs
```

---

# Failure Recovery

Possible failures

- Lost connection
- Redis unavailable
- Browser refresh
- Server restart

Recovery

```
Reconnect

↓

Snapshot

↓

Replay Operations

↓

Resume Editing
```

---

# Security

Every websocket event must verify:

- Authentication
- Organization membership
- Incident access
- Event payload validation

Clients cannot trust themselves.

All authorization occurs on the server.

---

# Event Naming Convention

```
domain.action
```

Examples

```
incident.created

incident.updated

incident.resolved

incident.comment.created

presence.updated

notification.created
```

Event names use pure dot notation. The room provides scope; names never carry a room prefix. Colons appear only in room names (`organization:{id}`, `incident:{id}`).

---

# Data Ownership

| Data | Source of Truth |
|------|-----------------|
|Incident|PostgreSQL|
|Comments|PostgreSQL|
|Activities|PostgreSQL|
|Assignments|PostgreSQL|
|Notifications|PostgreSQL|
|Presence|Redis|
|Shared Notes|Yjs + PostgreSQL|

---

# Monitoring

Track:

- Active websocket connections
- Connected users
- Average latency
- Failed broadcasts
- Reconnection rate
- Redis health
- Document synchronization time

---

# Future Enhancements

Version 2

- Cursor positions
- Typing indicators
- Offline editing
- Background synchronization
- Multiple websocket regions
- Presence history

---

# Summary

The realtime architecture combines Socket.IO, Redis, PostgreSQL, and Yjs to provide a responsive and reliable collaborative experience.

Structured business data remains server authoritative and is persisted through the REST API, while collaborative notes leverage CRDTs to allow conflict-free simultaneous editing.

This separation ensures that SyncBoard delivers real-time collaboration without compromising data integrity, scalability, or security.