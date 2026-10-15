# Observability

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the observability strategy for SyncBoard.

It covers structured logging, metrics, health checks, alerting, and distributed tracing.

Observability is the ability to understand the internal state of the system from its external outputs. Without it, production failures are invisible until a user reports them.

---

# Three Pillars

| Pillar | Tool | Status |
|--------|------|--------|
| Logs | Pino | MVP |
| Metrics | Prometheus + Grafana | MVP |
| Traces | OpenTelemetry | Future |

---

# Logging

## Logger

All applications use **Pino** for structured JSON logging.

```ts
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
})
```

In development, logs are pretty-printed for readability.

In production, logs are emitted as JSON for ingestion by a log aggregator.

---

## Log Levels

| Level | When to Use |
|-------|-------------|
| `fatal` | Application is about to crash |
| `error` | Unhandled exception or critical failure |
| `warn` | Degraded behavior or recoverable failure |
| `info` | Normal significant events (startup, shutdown, request lifecycle) |
| `debug` | Detailed information for debugging (disabled in production) |
| `trace` | Granular tracing (disabled in production) |

Default production log level: `info`.

---

## What to Log

Always log:

- Application startup (port, environment, database connection status)
- Application shutdown
- Unhandled errors and exceptions
- Authentication events (login, logout, failed attempts)
- Authorization failures
- Business-critical operations (incident created, incident resolved)
- External service failures (database, Redis, third-party APIs)
- WebSocket connection and disconnection

Never log:

- Passwords, tokens, or API secrets
- Token values or auth cookies
- Personal data (email, display name) unless necessary for debugging
- Request/response bodies by default (too verbose and may contain sensitive data)

---

## Log Structure

Every log entry includes:

```json
{
  "level": "info",
  "time": 1719304800000,
  "pid": 1234,
  "hostname": "api-pod-7b9d4",
  "msg": "Incident created",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "userId": "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
  "requestId": "01J..."
}
```

Structured fields allow log aggregators to filter, query, and alert on specific values.

---

## Request Logging

HTTP request logging uses a Pino middleware.

Log on response, not on request arrival, to capture the status code and duration:

```
POST /api/v1/incidents 201 42ms
```

Sensitive headers (Authorization, Cookie) are redacted automatically.

---

## Request IDs

Every inbound request receives a unique ID.

```ts
import { randomUUID } from "crypto"

app.use((req, _res, next) => {
  req.id = req.headers["x-request-id"] as string ?? randomUUID()
  next()
})
```

The request ID propagates through all log entries for that request and is returned in the `X-Request-ID` response header.

This allows end-to-end tracing of a single request across log entries.

---

# Metrics

## Prometheus

Applications expose a `/metrics` endpoint in the Prometheus text exposition format.

The `prom-client` library handles collection.

```ts
import { collectDefaultMetrics, Registry } from "prom-client"

const register = new Registry()
collectDefaultMetrics({ register })

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType)
  res.end(await register.metrics())
})
```

Default metrics include Node.js process stats: CPU, memory, event loop lag, garbage collection.

---

## Custom Metrics

Define application-level metrics that reflect business and infrastructure state.

### API

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Request duration by method and route |
| `db_query_duration_seconds` | Histogram | Database query duration by operation |

### Socket Server

| Metric | Type | Description |
|--------|------|-------------|
| `socket_connections_active` | Gauge | Currently connected WebSocket clients |
| `socket_events_total` | Counter | Total events received by event name |
| `yjs_updates_total` | Counter | Total Yjs document updates processed |
| `presence_users_active` | Gauge | Users currently tracked in presence |

### Business

| Metric | Type | Description |
|--------|------|-------------|
| `incidents_created_total` | Counter | Total incidents created |
| `incidents_resolved_total` | Counter | Total incidents resolved |
| `incidents_active` | Gauge | Currently open incidents |

---

## Grafana Dashboards

Grafana visualizes Prometheus metrics.

Recommended dashboards:

- **API Overview** — request rate, error rate, p50/p95/p99 latency
- **WebSocket** — active connections, event throughput, reconnection rate
- **Database** — query duration, connection pool usage
- **Business** — active incidents, resolution rate, incident severity distribution
- **Infrastructure** — CPU, memory, event loop lag per service

---

# Health Checks

Every service exposes a `/health` endpoint.

```ts
app.get("/health", async (_req, res) => {
  res.json({ status: "healthy" })
})
```

---

## Readiness Checks

A readiness endpoint verifies that dependencies are reachable before accepting traffic.

```ts
app.get("/ready", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({ status: "ready" })
  } catch (error) {
    logger.error({ error }, "Readiness check failed")
    res.status(503).json({ status: "not ready" })
  }
})
```

A 503 response prevents the load balancer from routing traffic to an unhealthy instance.

---

# Alerting

Alerts fire when metrics cross defined thresholds.

Recommended alerts:

| Alert | Condition |
|-------|-----------|
| High Error Rate | `5xx` responses exceed 1% of requests over 5 minutes |
| High Latency | p95 request duration exceeds 500ms over 5 minutes |
| Database Unreachable | Readiness check fails for 30 seconds |
| Redis Unreachable | Readiness check fails for 30 seconds |
| High Memory Usage | Process memory exceeds 80% of limit |
| WebSocket Spike | Active connections increase by 50% in 1 minute |

Alerts are routed to a notification channel (Slack, PagerDuty) rather than to email.

---

# Distributed Tracing (Future)

Version 2 will add distributed tracing via **OpenTelemetry**.

Traces will capture:

- The full request lifecycle across API and Socket servers
- Database query spans
- Redis operation spans
- WebSocket event processing

Traces connect directly to log entries via the `traceId` field injected into every logger context.

---

# Error Tracking (Future)

**Sentry** will be added for real-time error tracking.

Benefits over log-only error visibility:

- Groups related errors automatically
- Captures source maps for production stack traces
- Links errors to the release that introduced them
- Provides user impact counts

---

# Environment Variables

```
LOG_LEVEL=info
PROMETHEUS_METRICS_ENABLED=true
```

---

# Summary

Observability in SyncBoard starts with structured JSON logs from Pino, application and business metrics exposed to Prometheus, and health and readiness checks on every service. Grafana dashboards surface the system's state visually, and alerting rules ensure that failures are caught before users report them. Distributed tracing and error tracking are planned for Version 2 as the platform scales.
