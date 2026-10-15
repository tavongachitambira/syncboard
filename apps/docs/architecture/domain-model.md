# 09 - Domain Model

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the core business entities that make up SyncBoard.

Unlike the database schema, this document focuses on business concepts, responsibilities, relationships, lifecycle, and business rules.

Every API, database table, UI component, and background process should exist to support one or more of these domain entities.

The domain model serves as the single source of truth for the application's business logic.

---

# Ubiquitous Language

The following terms have precise meanings throughout the project.

| Term         | Meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| Organization | A company or engineering workspace using SyncBoard              |
| Member       | A user belonging to an organization                             |
| Service      | A software system being monitored (API, frontend, worker, etc.) |
| Incident     | A production issue requiring investigation                      |
| Assignment   | The relationship between an incident and an engineer            |
| Comment      | A discussion attached to an incident                            |
| Activity     | A historical business event                                     |
| Notification | Information delivered to a user                                 |
| Invitation   | A pending request to join an organization                       |
| API Key      | Credentials used by external systems                            |

These terms should never have multiple meanings.

---

# Domain Overview

```text
Organization
│
├── Members
│
├── Services
│     │
│     └── Incidents
│            │
│            ├── Assignments
│            ├── Comments
│            ├── Activities
│            ├── Shared Notes
│            └── Notifications
│
├── Invitations
│
└── API Keys
```

Everything belongs to exactly one Organization.

Organizations are the primary boundary of the system.

---

# Aggregate Boundaries

The application consists of several aggregates.

```text
Organization Aggregate

Incident Aggregate

Service Aggregate

Identity Aggregate
```

Each aggregate has exactly one Aggregate Root.

---

# Aggregate: Organization

## Aggregate Root

Organization

---

## Purpose

Represents a customer's engineering workspace.

Everything inside SyncBoard exists within an organization.

---

## Owns

* Members
* Services
* Invitations
* API Keys
* Settings

---

## Responsibilities

* Manage membership
* Maintain security boundaries
* Configure workspace
* Own every business object

---

## Business Rules

* Organization slugs are unique within the platform; names are not (a slug collision is resolved by appending a numeric suffix).
* Every organization has exactly one owner.
* Members cannot exist without an organization.
* Data cannot be shared across organizations.

---

## Lifecycle

```text
Created

    ↓

Configured

    ↓

Active

    ↓

Archived (Future)

    ↓

Deleted
```

---

# Entity: Member

## Purpose

Represents a person who belongs to an organization.

---

## Responsibilities

* Participate in incidents
* Create comments
* Receive notifications
* Own activity

---

## Business Rules

* Email must be unique globally.
* One account may belong to multiple organizations (future).
* Roles determine permissions.
* Members may be online or offline.

---

## Domain Events

* MemberInvited
* MemberJoined
* MemberRemoved
* RoleChanged

---

# Aggregate: Service

## Aggregate Root

Service

---

## Purpose

Represents an operational system owned by an organization.

Examples:

* Payments API
* Authentication API
* Notification Worker
* Mobile App

---

## Responsibilities

* Own incidents
* Store ownership information
* Provide organizational context

---

## Business Rules

* Service belongs to one organization.
* Service names are unique within an organization.
* Services may own many incidents.

---

## Future

Service dependencies.

Environment support.

Ownership teams.

---

# Aggregate: Incident

This is the most important aggregate.

Everything else revolves around incidents.

---

## Aggregate Root

Incident

---

## Responsibilities

* Coordinate investigation
* Track lifecycle
* Maintain ownership
* Store collaboration
* Record history

---

## Owns

* Assignments
* Shared Notes
* Comments
* Activities
* Attachments (Future)

---

## Business Rules

* Incident belongs to one service.
* Incident belongs to one organization.
* Incident has one severity.
* Incident has one status.
* Incident may have multiple assigned members.
* Incident cannot be resolved twice.
* Every state change generates an activity.

---

## Lifecycle

```text
Open

    ↓

Investigating

    ↓

Mitigating

    ↓

Resolved
```

Future:

```text
Resolved

    ↓

Reopened
```

---

## Domain Events

* IncidentCreated
* IncidentAssigned
* SeverityChanged
* StatusChanged
* CommentAdded
* IncidentResolved

These events are immutable.

---

# Entity: Assignment

## Purpose

Represents a member working on an incident.

---

## Business Rules

* A member cannot be assigned twice.
* Assignments create notifications.
* Assignments generate activities.

---

# Entity: Shared Notes

## Purpose

Collaborative investigation document.

---

## Responsibilities

* Store investigation notes.
* Synchronize edits.
* Preserve current investigation state.

---

## Business Rules

* Multiple users may edit simultaneously.
* Notes belong to exactly one incident.

Implementation:

Yjs document.

---

# Entity: Comment

## Purpose

Human discussion.

---

## Business Rules

* Comments belong to one incident.
* Comments belong to one author.
* Creation time is immutable.

---

## Domain Events

CommentCreated

---

# Entity: Activity

## Purpose

Historical business record.

---

## Examples

Incident Created

Status Changed

Assignment Added

Comment Posted

Severity Changed

Resolution Completed

---

## Business Rules

Activities cannot be deleted.

Activities are append-only.

Activities are chronological.

---

# Entity: Notification

## Purpose

Inform members of important events.

---

## Examples

Assignment

Incident Created

Mention

Future:

Escalation

Reminder

---

## Lifecycle
```
Unread

    ↓

   Read

    ↓

Archived
```
---

# Entity: Invitation

## Purpose

Allow new members to join an organization.

---

## Business Rules

* Invitation expires.
* Invitation may only be accepted once.

---

# Entity: API Key

## Purpose

Authenticate external systems.

---

## Responsibilities

* Authorize REST API requests.
* Identify integration.

---

## Business Rules

* Secret shown only once.
* Can be revoked.
* Usage logged.

---

# Value Objects

Unlike entities, value objects have no identity.

Examples:

Severity

Status

Role

Email

Slug

Display Name

Timestamp

These are immutable.

---

# Enumerations

Current enumerations:

IncidentStatus

Severity

MemberRole

NotificationType

InvitationStatus

Future enumerations:

Environment

DeploymentType

IncidentCategory

---

# Relationships

```text
Organization

1 ---- * Members

1 ---- * Services

1 ---- * Invitations

1 ---- * API Keys

Service

1 ---- * Incidents

Incident

1 ---- * Assignments

1 ---- * Comments

1 ---- * Activities

1 ---- 1 Shared Notes

Member

* ---- * Incidents
```

---

# Domain Invariants

These rules must never be violated.

✓ Incident always belongs to an organization.

✓ Service always belongs to an organization.

✓ Comment always belongs to an incident.

✓ Assignment always belongs to an incident.

✓ Activity always belongs to an incident.

✓ Notification always belongs to a member.

✓ Cross-organization access is impossible.

---

# Ownership

```text
Organization

owns

    ↓

Services

    ↓

Incidents

    ↓

Comments

    ↓

Activities

    ↓

Shared Notes
```

Deleting an organization removes every owned resource.

---

# Authorization Matrix

| Entity       | Owner  | Admin | Engineer      | Viewer |
| ------------ | ------ | ----- | ------------- | ------ |
| Organization | Manage | Read/Update | Read | Read |
| Service      | CRUD   | CRUD  | Read          | Read   |
| Incident     | CRUD   | CRUD  | Create/Update | Read   |
| Comment      | CRUD   | CRUD  | CRUD          | Read   |
| Activity     | Read   | Read  | Read          | Read   |
| Notification | Own    | Own   | Own           | Own    |
| API Key      | CRUD   | CRUD  | Read          | None   |

---

# Future Domain Expansion

Future aggregates:

* Team
* Notification Policy
* Billing
* Subscription
* Analytics
* Status Page
* On-call Schedule

The current model intentionally leaves room for these additions without changing the core ownership structure.

---

# Summary

The SyncBoard domain is centered around **Incidents**.

Organizations provide security and ownership boundaries.

Services provide operational context.

Members collaborate through comments and shared notes.

Activities preserve history.

Notifications keep participants informed.

By modeling the business before the database, SyncBoard ensures that implementation decisions remain aligned with the product's goals and can evolve without compromising the integrity of the domain.