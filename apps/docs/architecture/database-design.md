

# 10 - Database Design

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document describes the logical and physical database design for SyncBoard.

It explains:

* Entity relationships
* Table responsibilities
* Primary and foreign keys
* Indexing strategy
* Constraints
* Data ownership
* Performance considerations

The database is implemented using **PostgreSQL** with **Prisma ORM**.

---

# Database Philosophy

The database should reflect the **business domain**, not the UI.

Design goals:

* Normalize business data.
* Preserve audit history.
* Support real-time collaboration.
* Prevent cross-organization access.
* Optimize common query patterns.
* Allow future expansion without destructive migrations.

---

# Storage Technologies

| Data                   | Storage              |
| ---------------------- | -------------------- |
| Business Data          | PostgreSQL           |
| Realtime Presence      | Redis                |
| CRDT Operations        | PostgreSQL           |
| Yjs Snapshot           | PostgreSQL (`BYTEA`) |
| Files (Future)         | Object Storage       |
| Session Store (Future) | Redis                |

---

# Entity Relationship Diagram

```text
Organization
│
├── Members
├── Services
├── Invitations
├── API Keys
│
└── Incidents
      │
      ├── Comments
      ├── Activities
      ├── Operations
      └── IncidentDocument
```

---

# Table: Organization

## Purpose

Represents a customer workspace.

### Primary Key

```text
id UUID
```

### Relationships

```
1 → Many Members

1 → Many Services

1 → Many Incidents
```

### Constraints

* Slug must be unique.
* Organization cannot be deleted while billing is active (future).

---

# Table: User

Represents an authenticated account.

> **Future Note:** If we support multiple organizations, introduce a `Membership` table. Until then, `User.orgId` is acceptable and keeps the MVP simpler.

Fields:

* id
* email
* passwordHash
* displayName
* avatarUrl
* role
* orgId

Indexes:

```text
email UNIQUE

orgId

(role, orgId)
```

---

# Table: Service

Represents an application or operational service.

Fields:

* id
* organizationId
* name
* description
* ownerId
* createdAt
* updatedAt

Relationships:

```
Organization

1 ---- *

Service

Service

1 ---- *

Incident
```

Indexes:

```text
organizationId

(organizationId, name)
```

---

# Table: Incident

Represents a production incident.

Core Fields

```text
id

organizationId

serviceId

title

severity

status

createdAt

updatedAt

resolvedAt

version
```

Relationships

```
Organization

1 → *

Incident

Service

1 → *

Incident
```

Indexes

```text
organizationId

serviceId

status

severity

updatedAt

(organizationId, status)

(serviceId, status)
```

---

# Table: Assignment

Rather than storing assignments in a single nullable column, use a join table.

```
Incident

* ---- *

User
```

Fields

```
incidentId

userId

assignedAt
```

Composite Key

```
incidentId + userId
```

This prevents duplicate assignments and naturally supports multiple assignees.

---

# Table: Comment

Stores threaded discussions.

Fields

```
id

incidentId

authorId

content

createdAt
```

Indexes

```
incidentId

(authorId, createdAt)
```

Comments are immutable after creation except for edits (future).

---

# Table: Activity

Represents the business audit trail.

Fields

```
id

incidentId

actorId

type

payload JSONB

createdAt
```

Examples

```
Incident Created

Status Changed

Assigned User

Severity Changed

Resolved
```

Activities are append-only.

They should never be updated or deleted.

---

# Table: IncidentDocument

Stores the latest Yjs snapshot.

Fields

```
incidentId

snapshot BYTEA

version

updatedAt
```

Only one document exists per incident.

Historical edits are reconstructed from `Operation`.

---

# Table: Operation

Stores collaborative editing operations.

Fields

```
id

incidentId

authorId

messageId

type

payload JSONB

state

createdAt
```

Purpose

* Replay document state
* Conflict recovery
* Offline synchronization
* Audit

Indexes

```text
incidentId

(incidentId, createdAt)

messageId UNIQUE
```

---

# Table: Invitation

Fields

```
id

organizationId

email

role

token

expiresAt

acceptedAt
```

Rules

* Token unique.
* Expires automatically.
* Single use.

---

# Table: APIKey

Fields

```
id

organizationId

name

hashedSecret

createdAt

lastUsedAt

revokedAt
```

Never store plaintext API secrets.

---

# Future Billing Tables

These remain largely as you designed them:

* Subscription
* BillingEvent

They should be isolated from the core incident domain.

---

# Cascade Rules

| Parent       | Child      | Action                               |
| ------------ | ---------- | ------------------------------------ |
| Organization | Services   | Cascade                              |
| Organization | Members    | Cascade                              |
| Organization | Incidents  | Cascade                              |
| Incident     | Comments   | Cascade                              |
| Incident     | Activities | Cascade                              |
| Incident     | Operations | Cascade                              |
| Incident     | Document   | Cascade                              |
| Service      | Incidents  | Restrict (or reassign before delete) |

---

# Indexing Strategy

Primary read patterns:

* Dashboard: incidents by organization and status.
* Service page: incidents by service.
* User view: incidents assigned to a member.
* Timeline: activities by incident.
* Collaboration: operations by incident ordered by creation time.

Representative indexes:

```text
Incident(orgId, status)
Incident(serviceId, status)
Assignment(userId)
Activity(incidentId, createdAt)
Operation(incidentId, createdAt)
Comment(incidentId, createdAt)
```

---

# Transactions

Use database transactions for operations that modify multiple business entities.

Examples:

**Create Incident**

1. Insert Incident
2. Insert Assignments
3. Insert Activity
4. Insert Notification(s)

Commit only if all succeed.

---

# Optimistic Concurrency

Incidents include a `version` field.

On update:

1. Read current version.
2. Compare with client version.
3. Reject stale updates.
4. Increment version on success.

This protects structured fields such as status and severity. Collaborative notes are handled by Yjs rather than optimistic locking.

---

# Soft vs Hard Deletes

| Entity       | Strategy                        |
| ------------ | ------------------------------- |
| Incident     | Hard delete (admin only, V2)    |
| Activity     | Never delete                    |
| Operation    | Never delete                    |
| Comment      | Hard delete (future moderation) |
| API Key      | Revoke instead of delete        |
| Organization | Archive (future)                |

---

# Security Considerations

Every business table contains an `organizationId` directly or is reachable through a parent that does.

Every query must be scoped by organization.

This prevents accidental cross-tenant access.

---

# Migration Strategy

1. Create enums.
2. Create core tables.
3. Create relationship tables.
4. Add indexes.
5. Seed default roles and demo data.
6. Run integration tests.

---

# Mapping to Prisma

| Domain Entity    | Prisma Model               |
| ---------------- | -------------------------- |
| Organization     | `Organisation`             |
| User             | `User`                     |
| Service          | `Service` *(new)*          |
| Incident         | `Incident`                 |
| Assignment       | `Assignment` *(new)*       |
| Comment          | `Comment` *(new)*          |
| Activity         | `Activity` *(new)*         |
| IncidentDocument | `IncidentDocument` *(new)* |
| Operation        | `Operation`                |
| Invitation       | `Invitation` *(new)*       |
| APIKey           | `ApiKey` *(new)*           |
| Subscription     | `Subscription`             |
| BillingEvent     | `BillingEvent`             |

---

# Summary

The database design mirrors the business domain rather than the user interface. Each table has a single responsibility, relationships follow aggregate boundaries, and indexing is driven by expected query patterns. The design supports real-time collaboration, preserves audit history, and leaves room for future capabilities such as multi-organization membership, analytics, and billing without requiring a fundamental redesign.

---

