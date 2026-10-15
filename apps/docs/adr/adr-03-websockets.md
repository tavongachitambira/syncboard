# ADR-03: Socket.IO for Realtime Communication

**Project:** SyncBoard

**Version:** 1.1

**Status:** Accepted (auth section revised to match ADR-02 v2.0)

**Date:** 2025-01 (revised 2026-06)

---

# Context

SyncBoard requires bidirectional, low-latency communication between the server and connected clients for:

- Live incident status updates
- Presence indicators (who is viewing an incident)
- Collaborative document editing via Yjs
- Real-time notifications
- Activity timeline updates

The solution must:

- Work reliably across browsers, proxies, and mobile networks
- Support room-based event scoping (organization rooms, incident rooms)
- Scale horizontally when a single server is insufficient
- Authenticate connections with the same RS256 access token as the REST API (ADR-02)

---

# Decision

SyncBoard uses **Socket.IO** for all realtime communication.

The Socket.IO server runs as a separate process (`apps/socket`) from the REST API (`apps/api`).

Clients connect to the Socket.IO server on a dedicated path (`/socket`) proxied by the reverse proxy.

Room structure:

```
organization:{organizationId}   — org-wide events
incident:{incidentId}           — incident-specific events
```

Authentication uses the `access_token` cookie sent on the WebSocket handshake. The Socket.IO connection middleware verifies the RS256 signature and expiry with the public key (`jose`) before establishing the connection. `apps/socket` holds only the public key and shares no session code or store lookup with `apps/api`.

The verified claims (`sub`, `organizationId`, `role`, `exp`) are stored on the socket. Every event handler checks `exp` in memory before processing; no Redis or database round-trip is involved. When the token has expired the server emits an authentication error, and the client refreshes via `/auth/refresh` and reconnects.

Horizontal scaling uses `@socket.io/redis-adapter` with Redis Pub/Sub. This allows multiple Socket.IO instances to broadcast events across the cluster.

Reconnection strategy: exponential backoff with randomized jitter to prevent thundering herd reconnection storms on server restart.

---

# Alternatives Considered

## Raw WebSockets (`ws`)

The `ws` library provides a minimal WebSocket implementation without the abstractions Socket.IO adds.

Rejected because:

- Does not handle reconnection automatically
- Does not have native room/namespace support — this must be implemented manually
- Does not fall back gracefully when WebSockets are blocked by a proxy
- Socket.IO's room model and event abstraction significantly reduce the application code needed to achieve the same functionality

## Server-Sent Events (SSE)

SSE provides server-to-client streaming over HTTP without a persistent WebSocket connection.

Rejected because:

- SSE is unidirectional — clients cannot send events to the server over the SSE connection
- Collaborative editing (Yjs) and presence require bidirectional communication
- Long-polling for the client-to-server direction would add complexity

## Ably / Pusher

Managed realtime services that handle scaling and infrastructure.

Rejected because:

- External dependency and per-message cost at scale
- Less control over event routing and authorization logic
- WebSocket connection still requires an authentication layer

---

# Consequences

**Positive**

- Socket.IO handles reconnection, fallback transports, and room management automatically
- The Redis adapter makes horizontal scaling straightforward — add instances behind a load balancer, configure the adapter, and the event broadcast works transparently
- The access-token cookie is included in the WebSocket handshake, so connections are authenticated with only the public key and no additional infrastructure
- Namespaces and rooms provide clean isolation between organizations and incidents

**Negative**

- Socket.IO adds overhead compared to raw WebSockets (~80KB client bundle, framing protocol)
- The Redis adapter introduces a latency overhead for events that cross instance boundaries (typically < 2ms)
- Sticky sessions are required at the load balancer for the Socket.IO polling fallback transport (WebSocket upgrades are stateless, but polling fallback is not)

---

# Notes

The Socket.IO server authenticates every connection using the access-token cookie issued by the REST API (ADR-02).

Unauthenticated connections are rejected immediately.

Every event handler verifies that the emitting socket has access to the target room (organization membership, incident access) before processing the event.

Presence data is stored in Redis Sorted Sets with TTL, not in PostgreSQL. Presence is ephemeral by design.

Event naming convention: `domain.action` in pure dot notation (e.g. `incident.updated`, `presence.joined`). Scoping is provided by the room, never by a prefix on the event name; room names (`organization:{id}`, `incident:{id}`) are the only place colons appear.

---

# Revision History

| Version | Date    | Change |
| ------- | ------- | ------ |
| 1.0     | 2025-01 | Original decision; authentication via the Express session cookie. |
| 1.1     | 2026-06 | Authentication updated to the RS256 access-token cookie per ADR-02 v2.0; event naming clarified. |
