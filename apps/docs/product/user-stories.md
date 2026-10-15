# 03 - User Stories

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document captures the functional requirements of SyncBoard from the perspective of its users.

Each user story follows the format:

> **As a** `<role>`
>
> **I want** `<goal>`
>
> **So that** `<business value>`

These stories define *what* the system should do rather than *how* it should be implemented.

Each story also includes acceptance criteria that determine when the feature is considered complete.

---

# Epic 1 — Authentication & Identity

## US-001 — Register an Account

**As a new user**

I want to create an account

So that I can access my organization's workspace.

### Acceptance Criteria

* User can register using email and password.
* Email addresses must be unique.
* Passwords are securely hashed.
* User is redirected to onboarding after registration.

---

## US-002 — Log In

**As an existing user**

I want to sign in

So that I can continue working on incidents.

### Acceptance Criteria

* User can authenticate with valid credentials.
* Invalid credentials return an error.
* Authentication persists across page refresh (access token refreshed transparently).
* Protected pages require authentication.

---

## US-003 — Log Out

**As a user**

I want to log out

So that no one else can access my account.

### Acceptance Criteria

* Refresh token is revoked server-side.
* Cookies are removed.
* User is redirected to the login page.

---

## US-004 — Join an Organization

**As an invited user**

I want to accept an invitation

So that I can collaborate with my team.

### Acceptance Criteria

* Invitation links expire.
* Users cannot join twice.
* Assigned role is applied automatically.

---

# Epic 2 — Organization Management

## US-005 — Create an Organization

**As a user**

I want to create an organization

So that my engineering team has its own workspace.

### Acceptance Criteria

* Organization name is required.
* Organization slug is unique.
* Creator becomes Owner.

---

## US-006 — Invite Members

**As an administrator**

I want to invite teammates

So that they can collaborate on incidents.

### Acceptance Criteria

* Invitations are sent by email.
* Roles are selected during invitation.
* Invitation status can be tracked.

---

## US-007 — Manage Members

**As an administrator**

I want to update member roles

So that permissions remain accurate.

### Acceptance Criteria

* Roles can be changed.
* Owners cannot accidentally remove themselves.
* Permission changes take effect immediately.

---

# Epic 3 — Application Management

## US-008 — Register an Application

**As an administrator**

I want to register an application

So that incidents can be linked to the correct service.

### Acceptance Criteria

* Application has a unique name within the organization.
* Description is optional.
* Application belongs to exactly one organization.

---

## US-009 — Configure Notification Policy

**As an administrator**

I want to define notification rules

So that incidents reach the correct engineers.

### Acceptance Criteria

* Policies can target teams or roles.
* Escalation delays are configurable.
* Policies are associated with an application.

---

# Epic 4 — Incident Management

## US-010 — Create an Incident

**As an engineer**

I want to create an incident

So that the team can begin responding immediately.

### Acceptance Criteria

* Title is required.
* Severity is required.
* Initial status is **Open**.
* Incident belongs to an application.
* Creator becomes an initial participant.

---

## US-011 — Edit Incident

**As an engineer**

I want to update incident details

So that information stays accurate.

### Acceptance Criteria

* Status can be updated.
* Severity can be updated.
* Changes appear in the activity timeline.

---

## US-012 — Assign Engineers

**As an engineer**

I want to assign team members

So that responsibilities are clearly defined.

### Acceptance Criteria

* Multiple assignees are supported.
* Assigned users receive notifications.
* Assignment history is recorded.

---

## US-013 — Resolve Incident

**As an engineer**

I want to mark an incident as resolved

So that everyone knows the issue has been fixed.

### Acceptance Criteria

* Resolution timestamp is recorded.
* Activity is added to the timeline.
* Incident becomes read-only (except comments).

---

## US-014 — Search Incidents

**As a user**

I want to search incidents

So that I can quickly find previous issues.

### Acceptance Criteria

* Search by title.
* Search by incident ID.
* Filter by status.
* Filter by severity.

---

# Epic 5 — Collaboration

## US-015 — Shared Notes

**As an engineer**

I want to edit incident notes with teammates

So that everyone contributes to the investigation.

### Acceptance Criteria

* Multiple users can edit simultaneously.
* Conflicts are resolved automatically.
* Changes appear in real time.

---

## US-016 — Comments

**As an engineer**

I want to comment on an incident

So that discussions remain attached to the investigation.

### Acceptance Criteria

* Rich text is supported.
* Comments show author and timestamp.
* Comments remain immutable after posting (future editing may be supported).

---

## US-017 — Presence

**As an engineer**

I want to see who is currently viewing an incident

So that I know who is actively participating.

### Acceptance Criteria

* Online participants are visible.
* Presence updates automatically.
* Users disappear after disconnecting.

---

## US-018 — Live Updates

**As an engineer**

I want to receive updates instantly

So that I always have the latest information.

### Acceptance Criteria

* No manual refresh required.
* Status updates appear immediately.
* Comments appear immediately.
* Assignments appear immediately.

---

# Epic 6 — Activity Timeline

## US-019 — Timeline

**As an engineer**

I want every important action recorded

So that I understand what happened during the incident.

### Acceptance Criteria

Timeline includes:

* Incident created
* Status changes
* Severity changes
* Assignments
* Comments
* Resolution

---

## US-020 — Audit Trail

**As an administrator**

I want a permanent record of incident activity

So that investigations can be reviewed later.

### Acceptance Criteria

* Activities cannot be deleted.
* Entries are ordered chronologically.
* Actor and timestamp are always recorded.

---

# Epic 7 — Notifications

## US-021 — Assignment Notification

**As an engineer**

I want to be notified when assigned

So that I can respond quickly.

### Acceptance Criteria

* In-app notification is created.
* Email notification (future).
* Notification links directly to the incident.

---

## US-022 — Automatic Incident Notification

**As an organization**

I want newly created incidents to notify the appropriate team

So that response begins immediately.

### Acceptance Criteria

* Notification policy is executed.
* Duplicate notifications are prevented.
* Delivery is logged.

---

# Epic 8 — External Integrations

## US-023 — API-Based Incident Creation

**As an external monitoring system**

I want to create incidents through an API

So that engineers are automatically informed when failures occur.

### Acceptance Criteria

* API authentication required.
* Request validation performed.
* Incident created successfully.
* Notification policy executed.

---

## US-024 — API Keys

**As an administrator**

I want to generate API keys

So that external systems can authenticate securely.

### Acceptance Criteria

* Keys are unique.
* Keys can be revoked.
* Usage is logged.

---

# Epic 9 — Dashboard

## US-025 — Incident Dashboard

**As a user**

I want to view all active incidents

So that I can quickly understand the current operational state.

### Acceptance Criteria

Dashboard displays:

* Active incidents
* Severity
* Current status
* Assigned engineers
* Last updated timestamp

---

## US-026 — Personal Dashboard

**As an engineer**

I want to view incidents assigned to me

So that I know what requires my attention.

### Acceptance Criteria

* Assigned incidents are listed.
* Overdue incidents are highlighted (future).
* Filters are available.

---

# Future User Stories

The following stories are intentionally deferred beyond Version 1.

* AI-generated incident summaries.
* Slack integration.
* Microsoft Teams integration.
* GitHub Actions integration.
* Status page publishing.
* On-call scheduling.
* Mobile application.
* File attachments.
* Incident templates.
* Analytics dashboard.
* Service dependency graph.
* Keyboard shortcuts.
* Offline synchronization.

---

# Definition of Done

A user story is considered complete when:

* Functional requirements are implemented.
* Acceptance criteria are satisfied.
* Tests pass.
* Documentation is updated.
* Feature has been reviewed.
* Feature is deployable without breaking existing functionality.

---

# Summary

This document defines the user-facing functionality of SyncBoard.

Every feature developed during implementation should be traceable to one or more user stories in this document. Likewise, every database entity, API endpoint, UI component, and background process should exist to fulfill a documented user need.
