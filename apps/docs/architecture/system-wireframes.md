

# 08 - Wireframes

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the layout and interaction of every major screen in SyncBoard.

The goal of the wireframes is **not visual design**. They describe:

* Information placement
* User workflow
* Component hierarchy
* Navigation
* Primary actions

Visual styling (colors, typography, spacing, animations) will be addressed later through the design system.

---

# Design Principles

Every screen should satisfy these principles:

* Show the most important information first.
* Require minimal clicks.
* Keep navigation consistent.
* Minimize cognitive load during incidents.
* Prioritize collaboration over configuration.

---

# Global Layout

Every authenticated page shares the same structure.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Header                                                               │
│ Logo        Search              Notifications        User Menu        │
├──────────────┬───────────────────────────────────────────────────────┤
│ Sidebar      │                                                       │
│              │                                                       │
│ Dashboard    │                                                       │
│ Incidents    │                 Page Content                          │
│ Services     │                                                       │
│ Activity     │                                                       │
│ Notifications│                                                       │
│              │                                                       │
│──────────────│                                                       │
│ Members      │                                                       │
│ API Keys     │                                                       │
│ Settings     │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

---

# Authentication

## Login

```text
+----------------------------------------------------+

                    SyncBoard

            Email

            Password

        [ Sign In ]

---------------------------------------------

Don't have an account?

Create Organization

Join Organization

Forgot Password (V2)

+----------------------------------------------------+
```

---

# Dashboard

The dashboard is the operational overview.

```text
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                                   │
├─────────────────────────────────────────────────────────────┤

Active Incidents     Critical      Assigned To Me

--------------------------------------------------------------

Critical Incidents

┌─────────────────────────────────────────────────────────┐
│ Payments API Timeout                            Critical│
│ Investigating                                   John    │
└─────────────────────────────────────────────────────────┘

--------------------------------------------------------------

Recent Activity

• Mike created Incident #221

• Sarah assigned Emma

• Incident #218 resolved

--------------------------------------------------------------

Assigned To Me

Payments API

Authentication Service

Notification Worker
```

Primary actions:

* Create Incident
* Search
* Open Incident

---

# Incidents List

```text
┌────────────────────────────────────────────────────────────┐

Incidents

Search _______________________

Filters

Status

Severity

Service

Assignee

------------------------------------------------------------

Critical

Payments API Timeout

Investigating

John

------------------------------------------------------------

High

Authentication Login Failure

Open

Sarah

------------------------------------------------------------

Pagination

```

Actions:

* Open Incident
* Filter
* Search
* Create Incident

---

# Create Incident

```text
┌───────────────────────────────────────────────┐

Create Incident

Title

_________________________

Service

▼ Payments API

Severity

○ Critical

○ High

○ Medium

○ Low

Description

______________________________

Assign Engineers

[John]

[Sarah]

[Create]

└───────────────────────────────┘
```

---

# Incident Workspace

This is the **heart of SyncBoard**.

Almost every engineering action happens here.

```text
┌─────────────────────────────────────────────────────────────────────────────┐

Payments API Timeout

Critical

Investigating

Service: Payments API

Assigned:
John
Sarah

───────────────────────────────────────────────────────────────────────────────

 Investigation                        Timeline

───────────────────────────┬──────────────────────────────────────────────────

Shared Notes              │ Incident Created
                           │
───────────────────────────│ Sarah Assigned
                           │
Collaborative Editor       │
(Yjs)                      │ Mike Joined
                           │
                           │
───────────────────────────│ Status Changed
                           │
Comments                   │
                           │
───────────────────────────│ Severity Updated
                           │
Participants               │
John 🟢                    │
Sarah 🟢                   │
Mike ⚪                    │

───────────────────────────┴──────────────────────────────────────────────────

```

This layout reflects how engineers naturally work:

* Left → Investigation
* Right → Timeline and context

---

# Service List

```text
Services

Search

----------------------------------------------------

Payments API

12 Incidents

Owner

Platform Team

----------------------------------------------------

Authentication API

5 Incidents

Owner

Backend Team

----------------------------------------------------

Notification Worker

2 Incidents
```

Actions:

* Register Service
* Edit
* Delete

---

# Service Details

```text
Payments API

Description

REST API responsible for processing payments.

Owner

Platform Team

Recent Incidents

• Timeout

• Payment Failure

• Database Connection Lost

Future

Dependencies

Integrations

Metrics
```

---

# Notifications

```text
Notifications

------------------------------------------

John assigned you to

Payments API Timeout

------------------------------------------

Mike mentioned you

(Authentication Failure)

------------------------------------------

Incident Resolved

Database Connection Lost

------------------------------------------
```

Actions:

* Mark Read
* Open Incident

---

# Activity Feed

```text
Organization Activity

-------------------------------------------------

Mike created Incident

Sarah joined Incident

John resolved Incident

Emma registered Service

Platform Team created API Key

-------------------------------------------------
```

---

# Members

```text
Members

-------------------------------------------------

John

Admin

● Online

-------------------------------------------------

Sarah

Engineer

● Online

-------------------------------------------------

Emma

Viewer

○ Offline

-------------------------------------------------
```

Actions:

* Invite
* Remove
* Change Role

---

# API Keys

```text
API Keys

--------------------------------------------

Production

Created

Last Used

**************

--------------------------------------------

Monitoring

Created

Never Used

**************
```

Actions:

* Create
* Rotate
* Revoke

---

# Settings

Sections:

```text
Organization

Security

Roles

Preferences

Danger Zone
```

---

# Mobile Considerations

Although V1 targets desktop, every page should degrade gracefully.

Guidelines:

* Sidebar becomes a drawer.
* Timeline moves below the investigation panel.
* Tables become cards.
* Dialogs become full-screen sheets.

---

# Empty States

Every page should communicate what to do next.

Example:

```text
No incidents found.

Create your first incident to begin tracking production issues.

[ Create Incident ]
```

---

# Loading States

Every asynchronous page should include skeleton loaders rather than spinners where possible.

Examples:

* Dashboard cards
* Incident list
* Timeline
* Comments
* Shared notes

---

# Error States

Errors should be actionable.

Instead of:

```text
Error
```

Use:

```text
Unable to load incidents.

Retry

Return to Dashboard
```

---

# Accessibility

Every interactive element should support:

* Keyboard navigation
* Visible focus states
* Screen readers
* Proper ARIA labels
* Sufficient color contrast
* Responsive layouts

---

# Component Inventory

The following reusable components should be designed in the UI package:

## Layout

* App Shell
* Sidebar
* Header
* Breadcrumbs

## Navigation

* Navigation Item
* Search Bar
* Notification Badge

## Incident

* Incident Card
* Severity Badge
* Status Badge
* Participant Avatar Group
* Activity Item
* Timeline

## Collaboration

* Rich Text Editor
* Comment Thread
* Presence Indicator
* User Cursor (V2)

## Forms

* Dialog
* Sheet
* Input
* Select
* Multi-select
* Date Picker (Future)

## Feedback

* Toast
* Alert
* Skeleton
* Empty State
* Error State
* Confirmation Dialog

---

# Screen Priority

Implementation order:

1. Authentication
2. Dashboard
3. Incident List
4. Incident Workspace ⭐
5. Create Incident
6. Services
7. Members
8. Notifications
9. Settings
10. API Keys

---

# Summary

The **Incident Workspace** is the centerpiece of SyncBoard. Every other screen exists to help users reach it, configure it, or review its outcomes.

The wireframes emphasize clarity, collaboration, and operational awareness over visual complexity. They establish a consistent foundation that can later be implemented using a design system (e.g., Tailwind CSS + shadcn/ui) without changing the underlying information architecture.

---
