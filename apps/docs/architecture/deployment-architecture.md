# 14 - Deployment Architecture

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines how SyncBoard is built, deployed, monitored, and maintained in production.

It covers:

- Infrastructure
- Monorepo layout
- Docker
- CI/CD
- Environment configuration
- Scaling strategy
- Monitoring
- Logging
- Backup and disaster recovery

The deployment architecture is designed to support a growing SaaS platform while remaining simple enough for a single developer during the MVP stage.

---

# Deployment Goals

The deployment architecture should provide:

- Reliable deployments
- Zero-downtime releases
- Horizontal scalability
- High availability
- Easy rollback
- Secure secret management
- Observability

---

# Technology Stack

| Component | Technology |
|------------|------------|
|Frontend|Next.js|
|Backend|Express.js|
|Realtime|Socket.IO|
|Database|PostgreSQL|
|ORM|Prisma|
|Cache / PubSub|Redis|
|Reverse Proxy|Nginx / Caddy|
|Containerization|Docker|
|CI/CD|GitHub Actions|
|Hosting|DigitalOcean / Hetzner / AWS (future)|

---

# High-Level Architecture

```text
                     Internet

                         │

                    HTTPS (443)

                         │

                  Reverse Proxy

                         │

        ┌────────────────┼────────────────┐

        │                │                │

     Next.js         Express API      Socket.IO

        │                │                │

        └──────────────┬─┴────────────────┘

                       │

                 PostgreSQL

                       │

                     Redis
```

---

# Monorepo Structure

```
syncboard/

apps/
    web/
    api/
    socket/

packages/
    db/
    ui/
    shared/
    config/

docs/

docker/

.github/
```

---

# Responsibilities

## apps/web

Responsible for:

- UI
- Dashboard
- Authentication Pages
- Incident Workspace

---

## apps/api

Responsible for:

- REST API
- Authentication
- Authorization
- Business Logic

---

## apps/socket

Responsible for:

- WebSockets
- Presence
- Realtime synchronization
- Yjs updates

---

## packages/db

Contains:

- Prisma schema
- Migrations
- Seed scripts
- Prisma Client

---

## packages/shared

Contains:

- Shared Types
- Validation Schemas
- Constants
- Utility Functions

---

## packages/ui

Contains:

- Shared React Components
- Design System
- Layout Components

---

# Container Architecture

Each application runs independently.

```
Frontend Container

Backend Container

Socket Container

Database Container

Redis Container
```

---

# Docker Compose (Development)

```text
docker-compose.yml

↓

Next.js

↓

Express

↓

Socket.IO

↓

PostgreSQL

↓

Redis
```

All services communicate through an internal Docker network.

---

# Production Containers

```text
Nginx

↓

Frontend

↓

Backend

↓

Socket Server

↓

Redis

↓

PostgreSQL
```

Each service is independently deployable.

---

# Environment Variables

Frontend

```
NEXT_PUBLIC_API_URL

NEXT_PUBLIC_SOCKET_URL
```

---

Backend

```
DATABASE_URL

REDIS_URL

SESSION_SECRET

PORT

CLIENT_URL

STRIPE_SECRET_KEY
```

---

Socket Server

```
REDIS_URL

DATABASE_URL

SESSION_SECRET
```

---

# Environment Strategy

Separate environments

```
Development

Testing

Staging

Production
```

Each environment has its own:

- Database
- Redis
- Secrets
- Domain

---

# Build Pipeline

```
Install Dependencies

↓

Lint

↓

Type Check

↓

Unit Tests

↓

Build

↓

Docker Image

↓

Push Registry

↓

Deploy
```

---

# GitHub Actions Pipeline

On Pull Request

- Install
- Lint
- Type Check
- Test
- Build

---

On Merge to Main

- Build Images
- Push Registry
- Deploy
- Run Database Migrations
- Health Check

---

# Database Migrations

Deployment order

```
Deploy

↓

Run Prisma Migration

↓

Restart API

↓

Health Check
```

Never manually modify production schema.

---

# Static Assets

Served by:

```
Next.js

↓

CDN (Future)
```

Examples

- Images
- Icons
- Fonts

---

# Reverse Proxy

Responsibilities

- HTTPS
- Compression
- Caching
- Routing
- Security Headers

Routes

```
/

↓

Frontend

/api

↓

API

/socket

↓

Socket.IO
```

---

# Scaling Strategy

Version 1

```
1 Frontend

1 API

1 Socket

1 Database
```

---

Version 2

```
Load Balancer

↓

Multiple Frontend

↓

Multiple API

↓

Multiple Socket

↓

Redis Adapter

↓

PostgreSQL
```

---

# Database Scaling

Initially

Single PostgreSQL instance.

Future

- Read replicas
- Point-in-time recovery
- Partitioning
- Connection pooling

---

# Redis Usage

Redis provides

- Presence
- Pub/Sub
- Session Store (Future)
- Rate Limiting
- Caching

Redis should remain stateless.

---

# Logging

Applications log

- Startup
- Shutdown
- Errors
- Requests
- Authentication
- WebSocket Events

Recommended logger

```
Pino
```

Logs should be JSON in production.

---

# Monitoring

Monitor

- CPU
- Memory
- Disk
- Database Connections
- Redis Health
- WebSocket Connections
- Request Latency

Recommended tools

- Prometheus
- Grafana

Future

- Datadog
- New Relic

---

# Health Checks

Frontend

```
/

Returns

200
```

---

Backend

```
GET /health
```

Response

```json
{
  "status": "healthy"
}
```

---

Socket

```
GET /socket/health
```

---

# Readiness Checks

A service is ready only if

- Database connected
- Redis connected
- Configuration loaded

Otherwise

```
503 Service Unavailable
```

---

# Backup Strategy

PostgreSQL

- Daily backups
- Weekly full backups
- Retention: 30 days

Redis

No backup required.

Presence data is ephemeral.

---

# Disaster Recovery

If production fails

1. Restore database
2. Restore containers
3. Restore secrets
4. Verify health
5. Resume traffic

Recovery procedures should be tested regularly.

---

# Secret Management

Never store secrets in Git.

Development

```
.env.local
```

Production

- Docker Secrets
- Kubernetes Secrets (Future)
- Cloud Secret Manager

---

# Deployment Strategy

Preferred

Rolling Deployment

```
New Version

↓

Health Check

↓

Traffic Shift

↓

Remove Old Version
```

Future

Blue-Green Deployment

Canary Releases

---

# Observability

Metrics

- Requests/sec
- Error rate
- Latency
- Connected users
- Active incidents
- Socket connections

Logs

- Structured JSON

Tracing (Future)

- OpenTelemetry

---

# CI/CD Failure Handling

If any stage fails

- Stop deployment
- Notify developers
- Preserve previous version

Production should never deploy partially built artifacts.

---

# Production Checklist

Before every release

- All tests pass
- Lint passes
- Type check passes
- Migrations verified
- Secrets configured
- Monitoring enabled
- Health checks pass
- Rollback verified

---

# Future Infrastructure

Version 2

- Kubernetes
- Managed PostgreSQL
- Managed Redis
- CDN
- Object Storage
- Multi-region deployment

---

# Architecture Decision

Deployment responsibilities remain clearly separated.

| Component | Responsibility |
|------------|----------------|
|Next.js|User Interface|
|Express API|Business Logic|
|Socket.IO|Realtime Communication|
|PostgreSQL|Persistent Data|
|Redis|Realtime State & Pub/Sub|
|Reverse Proxy|Traffic Management|

---

# Summary

SyncBoard is deployed as a collection of independently deployable services connected through a shared PostgreSQL database and Redis instance.

The architecture prioritizes simplicity for the MVP while providing a clear path toward horizontal scaling, high availability, and production-grade observability. CI/CD, containerization, health checks, and secure secret management ensure that deployments remain reliable and repeatable as the platform grows.