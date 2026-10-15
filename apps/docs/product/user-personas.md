# 02 - User Personas

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines every type of user that interacts with SyncBoard, their goals, responsibilities, permissions, and expected workflows.

Rather than designing the application around database tables or technical implementation, SyncBoard is designed around the people who use it.

Every feature should exist because it solves a real user's problem.

---

# Guiding Principle

Users do not care about technologies such as Redis, Socket.io, PostgreSQL, or BullMQ.

Users care about:

* Quickly understanding what is happening.
* Knowing what they are responsible for.
* Collaborating effectively.
* Resolving incidents faster.

Every technical decision should support one or more of these goals.

---

# Organizational Hierarchy

```
Organization

├── Owner
│
├── Administrators
│
├── Engineers
│
└── Viewers
```

These are **system roles**.

Job titles such as Backend Engineer, Frontend Engineer, DevOps Engineer, and Site Reliability Engineer (SRE) are organizational roles and may all map to the **Engineer** system role.

---

# Persona 1 — Owner

## Description

The Owner is the individual who creates the organization within SyncBoard.

There is typically one owner per organization.

---

## Responsibilities

* Create organization
* Manage billing (future)
* Configure organization settings
* Invite administrators
* Delete organization
* Transfer ownership

---

## Goals

* Manage the organization
* Configure the platform
* Ensure engineering teams can collaborate
* Control access to the workspace

---

## Pain Points

Without SyncBoard:

* Difficult onboarding
* Manual permission management
* No centralized administration

---

## Typical Workflow

```
Create Organization

        ↓

Invite Admins

        ↓

Configure Workspace

        ↓

Invite Teams

        ↓

Monitor Adoption
```

---

## Permissions

✅ Full Access

* Manage organization
* Manage users
* Manage applications
* Configure notification policies
* View every incident
* Delete incidents
* Manage API keys
* Configure integrations

---

# Persona 2 — Administrator

## Description

Administrators manage the engineering workspace but do not necessarily own the organization.

They ensure teams have access to the correct resources and maintain day-to-day operational settings.

---

## Responsibilities

* Invite members
* Remove members
* Create applications
* Configure integrations
* Manage teams
* Configure notification policies

---

## Goals

* Keep the workspace organized.
* Ensure engineers have appropriate access.
* Maintain organizational structure.

---

## Typical Workflow

```
Receive New 
Team Request

    ↓

Create Team

    ↓

Invite Members

    ↓

Assign Roles

    ↓

Register Application
```

---

## Pain Points

* Manual onboarding
* Managing growing engineering teams
* Tracking access permissions

---

## Permissions

✅ Organization Management

✅ User Management

✅ Team Management

✅ Application Management

✅ Integration Management

❌ Delete Organization

---

# Persona 3 — Engineer

## Description

Engineers are the primary users of SyncBoard.

Their responsibility is to investigate, collaborate on, and resolve incidents.

This role may include:

* Backend Engineers
* Frontend Engineers
* DevOps Engineers
* SREs
* Platform Engineers

---

## Responsibilities

* Join incidents
* Investigate issues
* Update documentation
* Comment on incidents
* Assign themselves to work
* Resolve incidents

---

## Primary Goals

* Understand the incident quickly.
* Collaborate efficiently.
* Reduce downtime.
* Document findings.

---

## Daily Workflow

```
Notification Received

↓

Open Incident

    ↓

Read Timeline

    ↓

Join Investigation

    ↓

Update Notes

    ↓

Assign Yourself

    ↓

Resolve Problem

    ↓

Close Incident
```

---

## Pain Points

Before SyncBoard:

* Searching Slack for updates.
* Duplicate investigations.
* Unclear ownership.
* Missing documentation.
* Refreshing multiple dashboards.

---

## Needs

* Fast interface
* Live collaboration
* Shared notes
* Comments
* Activity history
* Real-time updates
* Presence indicators

---

## Permissions

✅ Create Incident

✅ Edit Incident

✅ Comment

✅ Assign Engineers

✅ Resolve Incident

✅ View Timeline

❌ Organization Settings

❌ Delete Organization

---

# Persona 4 — Viewer

## Description

Viewers are users who need visibility into incidents but should not modify engineering data.

Examples include:

* Customer Support
* Product Managers
* Executives
* Business Stakeholders

---

## Responsibilities

* Monitor incident progress.
* Inform customers.
* Track resolution status.

---

## Goals

* Understand current system health.
* Communicate accurate updates.
* Observe without disrupting engineers.

---

## Workflow

```
Open Dashboard

    ↓

View Incident

    ↓

Read Timeline

    ↓

Communicate Updates
```

---

## Needs

* Clear status
* Read-only timeline
* Assigned engineers
* Estimated progress

---

## Permissions

✅ View Incidents

✅ View Timeline

✅ View Comments

❌ Edit Incident

❌ Comment

❌ Assign Users

❌ Change Status

---

# User Goals Matrix

| Persona       | Primary Goal        |
| ------------- | ------------------- |
| Owner         | Manage organization |
| Administrator | Manage workspace    |
| Engineer      | Resolve incidents   |
| Viewer        | Stay informed       |

---

# Permission Matrix

| Permission              | Owner | Admin | Engineer | Viewer |
| ----------------------- | :---: | :---: | :------: | :----: |
| View Dashboard          |   ✅   |   ✅   |     ✅    |    ✅   |
| Create Incident         |   ✅   |   ✅   |     ✅    |    ❌   |
| Edit Incident           |   ✅   |   ✅   |     ✅    |    ❌   |
| Delete Incident         |   ✅   |   ✅   |     ❌    |    ❌   |
| Comment                 |   ✅   |   ✅   |     ✅    |    ❌   |
| Assign Engineers        |   ✅   |   ✅   |     ✅    |    ❌   |
| Invite Members          |   ✅   |   ✅   |     ❌    |    ❌   |
| Manage Teams            |   ✅   |   ✅   |     ❌    |    ❌   |
| Manage Applications     |   ✅   |   ✅   |     ❌    |    ❌   |
| Manage API Keys         |   ✅   |   ✅   |     ❌    |    ❌   |
| Configure Notifications |   ✅   |   ✅   |     ❌    |    ❌   |
| View Audit Log          |   ✅   |   ✅   |     ✅    |    ✅   |
| Update Organization Settings |   ✅   |   ✅   |     ❌    |    ❌   |
| Delete / Transfer Organization |   ✅   |   ❌   |     ❌    |    ❌   |

---

# Collaboration Model

A production incident is not owned by a single engineer.

Instead, SyncBoard enables collaborative ownership.

```
Incident

    ↓

Assigned Engineers

    ↓

Shared Notes

    ↓

Comments

    ↓

Timeline

    ↓

Resolution
```

Every participant sees updates immediately.

---

# Future Personas

Future versions of SyncBoard may introduce additional personas.

## On-Call Engineer

Receives incidents automatically based on rotation schedules.

---

## Incident Commander

Coordinates large incidents, assigns work, and manages communication.

---

## External Guest

Temporary access for consultants or external engineers.

---

## Integration User

Represents automated systems such as monitoring platforms using API keys.

---

# Design Principles

Every interface in SyncBoard should answer four questions within seconds:

1. What is happening?
2. Who is responsible?
3. What has already been done?
4. What should I do next?

If a user cannot answer these questions quickly, the interface should be redesigned.

---

# Summary

SyncBoard is designed around people rather than technology.

Owners manage organizations.

Administrators manage workspaces.

Engineers solve incidents.

Viewers stay informed.

Every feature developed throughout this project should improve the experience of one or more of these personas while reducing the time required to resolve production incidents.
