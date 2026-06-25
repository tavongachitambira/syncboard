# 06 - System Overview

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document provides a high-level architectural overview of SyncBoard.

It defines the major subsystems, how they interact, the responsibilities of each component, and the flow of information throughout the platform.

The purpose is not to describe implementation details but to establish a common understanding of the system architecture before development begins.

---

# System Vision

SyncBoard is a **real-time collaborative incident management platform** designed for engineering teams.

It acts as the central workspace where production incidents are created, investigated, documented, and resolved.

Rather than replacing monitoring tools, communication platforms, or deployment systems, SyncBoard integrates with them to provide a unified operational experience.

---

# System Context

```text
                    +----------------------+
                    | Monitoring Systems   |
                    | Datadog / Grafana    |
                    | Prometheus / Custom  |
                    +----------+-----------+
                               |
                               | REST API / Webhooks
                               |
+-------------------------------------------------------------+
|                        SyncBoard                            |
|                                                             |
|  Authentication                                              |
|  Organizations                                               |
|  Services                                                    |
|  Incidents                                                   |
|  Collaboration                                               |
|  Notifications                                               |
|  Activity Timeline                                           |
|  API                                                         |
+-------------------------------------------------------------+
          |                           |
          |                           |
          |                           |
  Web Browser                  Future Integrations
```

---

# High-Level Workflow

A typical incident follows this lifecycle:

```text
Issue Detected
      │
      ▼
Incident Created
      │
      ▼
Notification Sent
      │
      ▼
Engineers Join
      │
      ▼
Collaborative Investigation
      │
      ▼
Status Updates
      │
      ▼
Resolution
      │
      ▼
Incident Closed
```

Every subsystem contributes to one or more stages of this workflow.

---

# Core Subsystems

SyncBoard is composed of the following major subsystems.

---

## 1. Authentication

### Responsibilities

* User registration
* Login
* Session management
* Authorization
* Identity management

### Owns

* Users
* Sessions
* Credentials
* Roles

### Does NOT Own

* Organizations
* Incidents
* Notifications

---

## 2. Organization Management

### Responsibilities

* Create organizations
* Invite members
* Manage memberships
* Configure workspace

### Owns

* Organizations
* Memberships
* Invitations

---

## 3. Service Management

(Previously referred to as Applications.)

### Responsibilities

* Register services
* Configure services
* Associate incidents

Examples:

* Payments API
* Authentication API
* Notification Worker
* Mobile Frontend

---

## 4. Incident Management

This is the heart of SyncBoard.

### Responsibilities

* Create incidents
* Update incidents
* Assign engineers
* Track severity
* Track status
* Resolve incidents

### Owns

* Incident lifecycle

Everything else exists to support this subsystem.

---

## 5. Collaboration

Responsible for allowing multiple engineers to work together.

Includes:

* Shared notes
* Real-time editing
* Comments
* Presence
* Live synchronization

Future:

* Cursor positions
* Typing indicators

---

## 6. Activity Timeline

Every important business action should generate an activity.

Examples:

* Incident created
* User assigned
* Status changed
* Severity changed
* Comment added
* Incident resolved

The timeline provides a complete history of the incident.

---

## 7. Notification System

Responsible for informing users of important events.

Version 1:

* Assignment notifications
* Incident creation notifications
* In-app notifications

Future:

* Email
* Slack
* Teams
* SMS
* Escalation

---

## 8. API Layer

Provides external access to SyncBoard.

Supports:

* Incident creation
* Service management
* Authentication
* API keys

Future:

* Webhooks
* SDKs
* GraphQL

---

# Architectural Principles

## Domain-Driven Design

Business concepts drive the architecture.

Technology choices should support the domain rather than define it.

Examples of domain concepts:

* Organization
* Service
* Incident
* Comment
* Activity
* Membership

---

## Real-Time First

All users should observe the same incident state.

Changes should propagate without requiring manual refresh.

Examples:

* Status changes
* Shared notes
* Assignments
* Comments

---

## Event-Oriented

Important actions produce business events.

Examples:

* IncidentCreated
* UserAssigned
* CommentAdded
* IncidentResolved

These events drive:

* Activity timeline
* Notifications
* Audit logs

---

## Separation of Concerns

Each subsystem owns its own responsibilities.

Example:

Authentication manages identity.

Incident Management manages incidents.

Notifications deliver notifications.

No subsystem should take ownership of another subsystem's responsibilities.

---

# External Systems

Version 1 assumes external systems exist but does not depend on them.

Examples:

* Monitoring platforms
* Email providers
* Identity providers

Future integrations include:

* Datadog
* Grafana
* Prometheus
* Slack
* GitHub
* PagerDuty

---

# Data Flow

## Manual Incident

```text
Engineer
      │
      ▼
Create Incident
      │
      ▼
Database
      │
      ▼
Activity Generated
      │
      ▼
Notification Created
      │
      ▼
WebSocket Broadcast
      │
      ▼
Connected Users Updated
```

---

## Automatic Incident

```text
Monitoring Tool
      │
      ▼
REST API
      │
      ▼
Authentication
      │
      ▼
Incident Created
      │
      ▼
Notification
      │
      ▼
Realtime Broadcast
```

---

# Deployment Overview

Version 1 consists of the following applications:

```text
apps/

web/

api/

socket/
```

Supporting packages:

```text
packages/

db/

shared/

ui/

config/
```

Infrastructure:

```text
PostgreSQL

    ↓

Redis

    ↓

Object Storage (Future)
```

---

# Technology Responsibilities

| Technology      | Responsibility           |
| --------------- | ------------------------ |
| Next.js         | Web application          |
| React           | UI rendering             |
| Express/Fastify | REST API                 |
| Socket.IO       | Real-time communication  |
| PostgreSQL      | Persistent storage       |
| Prisma          | Database ORM             |
| Redis           | Presence & Pub/Sub       |
| Yjs             | Collaborative editing    |
| BullMQ          | Background jobs (future) |

---

# Security Model

Security is enforced at multiple layers.
```
Authentication

    ↓

Authorization

    ↓

Organization Boundaries

    ↓

Role Validation

    ↓

Input Validation

    ↓

Database Constraints
```

Users should never be able to access data outside their organization.

---

# Scalability Strategy

Version 1 targets small to medium engineering teams.

Expected workload:

* Hundreds of organizations
* Thousands of users
* Thousands of concurrent incidents

Future scalability improvements:

* Redis Pub/Sub
* Horizontal Socket.IO scaling
* Read replicas
* Queue workers
* CDN
* Object storage

These enhancements should not require changes to the domain model.

---

# Architectural Boundaries

```text
                User
                 │
                 ▼
          Web Application
                 │
       REST API / WebSocket
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
 Business Logic        Realtime Engine
      │                     │
      └──────────┬──────────┘
                 ▼
             PostgreSQL
```

Business logic remains independent of transport mechanisms.

Whether an update arrives through HTTP or WebSocket, the same domain rules should apply.

---

# Guiding Principles

Every architectural decision should satisfy the following principles:

1. The domain drives the implementation.
2. Real-time collaboration is a core capability.
3. Every important action is recorded.
4. Systems remain loosely coupled.
5. Features should be independently evolvable.
6. Simplicity is preferred over premature optimization.
7. Scalability should be enabled without redesigning the domain.

---

# Summary

SyncBoard is composed of a set of focused subsystems that work together to provide a real-time collaborative incident management experience.

The architecture is intentionally modular, allowing future features such as analytics, billing, advanced notifications, and enterprise integrations to be added without disrupting the core incident management workflow.

The system is designed around business concepts rather than technologies, ensuring that future implementation decisions remain aligned with the product's primary goal: helping engineering teams resolve production incidents faster through effective collaboration.
