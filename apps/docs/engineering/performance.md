# Performance

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the performance strategy for SyncBoard.

It describes performance goals, the patterns used to achieve them across the API, database, realtime layer, and frontend, and the process for identifying and resolving regressions.

Performance is a feature. An incident management platform that is slow during an active incident is failing at its core purpose.

---

# Performance Goals

| Metric | Target |
|--------|--------|
| API p95 response time | < 200ms |
| WebSocket event round-trip | < 100ms |
| Incident page initial load (LCP) | < 2.5s |
| Time to interactive | < 3.5s |
| Database query p95 | < 50ms |
| Yjs document sync latency | < 150ms |
| Concurrent WebSocket connections (MVP) | 500 |
| Concurrent WebSocket connections (V2) | 5,000+ |

---

# API Performance

## Response Time

Keep route handlers thin.

Business logic lives in services, not in routes or middleware.

Avoid N+1 queries — see the Database section below.

---

## Payload Size

Return only the fields the client needs.

Avoid serializing entire database rows when a subset suffices.

Use pagination on all collection endpoints. Default page size: 20. Maximum page size: 100.

---

## Rate Limiting

Rate limiting protects the API from abuse and prevents resource exhaustion.

See the Security Design document for per-route limits.

Rate limits are enforced at the reverse proxy layer using Redis-backed counters.

---

## Compression

HTTP responses are gzip-compressed by the reverse proxy.

Do not compress at the application level.

---

# Database Performance

## Query Patterns

Every common read path has a covering index.

Critical indexes:

```
Incident(organizationId, status)
Incident(serviceId, status)
Incident(updatedAt)
Assignment(userId)
Activity(incidentId, createdAt)
Operation(incidentId, createdAt)
Comment(incidentId, createdAt)
Notification(recipientId, status)
Notification(recipientId, createdAt)
```

---

## Avoiding N+1 Queries

Use Prisma `include` to join related data in a single query.

```ts
// Bad — N+1
const incidents = await db.incident.findMany({ where: { organizationId } })
for (const incident of incidents) {
  incident.assignments = await db.assignment.findMany({ where: { incidentId: incident.id } })
}

// Good — single query
const incidents = await db.incident.findMany({
  where: { organizationId },
  include: { assignments: { include: { user: true } } },
})
```

---

## Query Scoping

Every query is scoped to `organizationId`.

This prevents full-table scans and ensures the index is always used.

---

## Connection Pooling

Prisma uses a connection pool.

Default pool size: `min(10, CPU_COUNT * 2 + 1)`.

Adjust via the `connection_limit` parameter in `DATABASE_URL`.

Do not increase the pool beyond what PostgreSQL can handle (typically 100 connections per instance).

Use **PgBouncer** in transaction mode for high-concurrency deployments.

---

## Transactions

Use database transactions for operations that write to multiple tables.

Keep transactions short — do not perform external HTTP calls inside a transaction.

---

## Slow Query Logging

Enable PostgreSQL slow query logging:

```sql
log_min_duration_statement = 100  -- log queries slower than 100ms
```

Review the slow query log weekly during active development.

Use `EXPLAIN ANALYZE` to investigate suspicious queries.

---

# Realtime Performance

## WebSocket Event Throughput

The Socket.IO server processes events synchronously within a single Node.js process.

Keep event handlers non-blocking.

Offload slow operations (database writes, email delivery) to background workers via BullMQ.

---

## Debounced Database Writes

Yjs document updates arrive in rapid bursts.

Flushing every update to PostgreSQL individually would saturate the database under active editing.

Instead, use a per-document debounce:

```
User Types
↓
Yjs Update (immediate broadcast)
↓
Debounce Timer Reset (500ms)
↓
[500ms silence]
↓
Flush Snapshot to PostgreSQL
```

The broadcast to other clients is immediate.

The database write is deferred.

This reduces database write volume by an order of magnitude during active editing sessions.

---

## Presence Efficiency

Presence data lives exclusively in Redis Sorted Sets.

Do not write presence to PostgreSQL.

Presence TTL expires automatically on disconnect or inactivity.

Broadcast presence updates only when the set changes, not on every heartbeat.

---

## Reconnection Backoff

Clients that disconnect reconnect with randomized exponential backoff.

This prevents thundering herd reconnection storms when the server restarts.

```
Attempt 1: 1s + random jitter
Attempt 2: 2s + random jitter
Attempt 3: 4s + random jitter
...
Maximum: 30s
```

---

## Horizontal Scaling

Version 1 runs a single Socket.IO instance.

Version 2 scales horizontally using `@socket.io/redis-adapter`.

The Redis adapter broadcasts events across all Socket.IO instances so clients connected to different nodes still receive each other's updates.

Sticky sessions are required at the load balancer for the WebSocket handshake.

---

# Frontend Performance

## Server Components

Next.js Server Components render on the server and send HTML.

Use Server Components for:

- Page shells
- Initial data fetching
- Static content

Use Client Components only when interactivity is required.

---

## Data Fetching

Fetch data as close to where it is needed as possible.

Avoid prop drilling fetched data through multiple component levels.

Use React's `use` with `Suspense` for progressive loading.

---

## Bundle Size

Avoid importing large libraries for small use cases.

Use tree-shakeable imports:

```ts
// Bad
import _ from "lodash"

// Good
import debounce from "lodash/debounce"
```

Analyze the bundle with `next build --analyze` when adding new dependencies.

---

## Image Optimization

Use `next/image` for all images.

It handles:

- Lazy loading
- Responsive sizes
- WebP conversion
- Layout shift prevention

---

## Core Web Vitals Targets

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |

Monitor Core Web Vitals continuously using Vercel Analytics or a synthetic monitoring tool.

---

# Caching

## API Responses

Version 1 does not cache API responses.

All data is fetched fresh from PostgreSQL.

Future: cache expensive read-only aggregations (organization member lists, service lists) in Redis with a short TTL.

---

## CDN

Static assets (JavaScript bundles, CSS, fonts, images) are served through a CDN in production.

Next.js handles cache headers for static assets automatically.

---

## Browser Cache

API responses include appropriate `Cache-Control` headers.

Authenticated data: `Cache-Control: no-store`.

Public data (future status pages): `Cache-Control: public, max-age=60`.

---

# Load Testing

Use **Artillery** to load test the WebSocket layer before major releases.

Target: 500 concurrent connections on a single server, 5,000 with the Redis adapter.

Load test scenarios:

1. 500 clients connect and join incident rooms simultaneously
2. 100 clients send Yjs updates at 10 updates/second for 60 seconds
3. 500 clients reconnect simultaneously (thundering herd test)

Results are compared against baseline after every significant change.

---

# Performance Monitoring in Production

Track in Grafana:

- API p50, p95, p99 latency by route
- Database query p95 latency
- WebSocket event processing time
- Redis operation latency
- Node.js event loop lag

Alert when:

- API p95 exceeds 500ms for 5 minutes
- Event loop lag exceeds 100ms for 1 minute
- Database p95 query time exceeds 200ms for 5 minutes

---

# Summary

SyncBoard's performance strategy addresses each layer of the stack independently. The API stays fast through lean handlers and indexed queries. The realtime layer stays responsive through debounced writes, Redis-backed presence, and non-blocking event handlers. The frontend minimizes load time through Server Components, selective hydration, and bundle discipline. Load testing and production metrics provide continuous feedback so regressions are caught before they affect users.
