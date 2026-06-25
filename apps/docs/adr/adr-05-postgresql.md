# ADR-05: PostgreSQL as the Primary Database

**Project:** SyncBoard

**Version:** 1.0

**Status:** Accepted

**Date:** 2025-01

---

# Context

SyncBoard requires a primary data store for:

- Organization and user records
- Incidents, comments, activities, and assignments
- Collaborative document operations and snapshots
- Notifications and API keys
- Future billing records

The data store must support:

- Relational data with foreign key constraints and cascades
- ACID transactions for multi-table writes (e.g. create incident + assignments + activity in a single transaction)
- Binary storage for Yjs snapshots (`BYTEA`)
- JSON storage for flexible payloads (activity details, operation metadata)
- Strong consistency — eventual consistency is not acceptable for incident state
- Efficient range queries for timeline and activity feeds

---

# Decision

SyncBoard uses **PostgreSQL** as its primary and only persistent database.

All business data, collaborative editing operations, snapshots, and audit history are stored in PostgreSQL.

The ORM is **Prisma**, which provides:

- A type-safe query builder generated from the schema
- A migration system (`prisma migrate`) for schema evolution
- A seed script for development and test fixtures

All queries are scoped to `organizationId` to enforce tenant isolation at the database layer.

Multi-table writes are wrapped in transactions.

Optimistic concurrency control uses a `version` column on the `Incident` table to prevent lost updates on structured fields.

JSONB is used for flexible payload storage (activity details, operation metadata) where the structure varies by event type.

---

# Alternatives Considered

## MongoDB

A document database with flexible schemas and horizontal sharding.

Rejected because:

- SyncBoard's data is inherently relational: incidents belong to services which belong to organizations; assignments link incidents and users
- MongoDB's multi-document transactions are less mature than PostgreSQL's ACID transactions
- Foreign key constraints are not enforced natively — referential integrity must be managed in application code
- JSONB in PostgreSQL provides the schema flexibility of a document store for fields that need it (activity payloads), without sacrificing relational integrity for structured data

## SQLite

An embedded relational database requiring no separate server process.

Rejected because:

- Write concurrency is limited by SQLite's file-level locking
- Not suitable for multi-process deployments (API and Socket servers would need separate file access)
- No support for concurrent connections from multiple server processes

## PlanetScale / Neon

Managed serverless PostgreSQL services.

Not selected for MVP because:

- Adds external vendor dependency
- Self-hosted PostgreSQL is sufficient for the initial deployment target
- Migration is straightforward if a managed service is preferred later

---

# Consequences

**Positive**

- ACID transactions ensure that creating an incident, adding assignments, generating the activity, and sending notifications either all succeed or all roll back
- Foreign keys and cascades enforce referential integrity — deleting an organization cascades through services, incidents, comments, and operations without requiring application-level cleanup
- JSONB provides indexed JSON storage for activity payloads without requiring a separate document store
- BYTEA stores Yjs snapshots natively
- Prisma's type-safe query builder prevents entire classes of runtime errors
- PostgreSQL's mature ecosystem provides excellent tooling for backups, replication, and observability

**Negative**

- PostgreSQL requires an always-on server process — not serverless-friendly without a proxy like PgBouncer
- Schema changes require migrations — Prisma manages this, but the migration process must be part of every deployment
- Vertical scaling is the primary scaling path for PostgreSQL; horizontal read scaling requires read replicas; horizontal write scaling (sharding) is complex

---

# Notes

The `Operation` table will grow without bound as Yjs edits accumulate.

Snapshots compress the replay burden, but the operation table will require a retention or archival policy as the platform matures (e.g. archive operations older than 90 days to cold storage after creating a snapshot).

Connection pooling is handled by Prisma's built-in pool. PgBouncer in transaction mode will be added when concurrent connection count exceeds the PostgreSQL limit.

The application database user has `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges only. Schema changes are performed by a separate migration user with DDL privileges.

Backups: daily automated backups with 30-day retention. Point-in-time recovery is enabled for production.
