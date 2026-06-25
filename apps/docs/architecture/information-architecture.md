# 07 - Information Architecture

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines how information is organized and accessed throughout SyncBoard.

It answers the following questions:

* What pages exist?
* How do users navigate the application?
* Which information belongs together?
* What actions can users perform on each page?

The Information Architecture (IA) provides the blueprint for navigation, routing, and ultimately the wireframes.

---

# Design Principles

The navigation should be:

* Predictable
* Consistent
* Minimal
* Task-oriented
* Focused on incident response

Users should never wonder where information lives.

---

# Primary Navigation

```text
Workspace

├── Dashboard
├── Incidents
├── Services
├── Activity
├── Notifications

Administration

├── Members
├── API Keys
├── Settings
```

The sidebar remains visible throughout the application.

---

# Route Map

```text
/

    ↓

Authentication

/login

/register

    ↓

Workspace

/dashboard

    ↓

Incidents

/incidents

/incidents/:id

    ↓

Services

/services

/services/:id

    ↓

Activity

/activity

    ↓

Notifications

/notifications

    ↓

Administration

/members

/api-keys

/settings
```

---

# Navigation Hierarchy

```text
Workspace
│
├── Dashboard
│
├── Incidents
│      ├── Incident Details
│      ├── Shared Notes
│      ├── Comments
│      └── Timeline
│
├── Services
│      ├── Service Details
│      └── Related Incidents
│
├── Activity
│
└── Notifications

Administration
│
├── Members
├── API Keys
└── Settings
```

---

# Dashboard

## Purpose

Provide an operational overview of the organization.

---

## Displays

* Active incidents
* Critical incidents
* Recently updated incidents
* Assigned incidents
* Incident statistics

---

## Primary Actions

* Create Incident
* Search
* Open Incident

---

# Incidents

## Purpose

Central location for managing incidents.

---

## Displays

* Incident list
* Status
* Severity
* Service
* Assignees
* Last updated

---

## Filters

* Status
* Severity
* Service
* Assignee
* Date

---

## Actions

* Create
* Edit
* Resolve
* Search
* Assign

---

# Incident Details

This is the most important screen in SyncBoard.

Everything required to resolve an incident should exist here.

---

## Layout

```text
------------------------------------------------

Title

Severity

Status

Service

Assigned Engineers

------------------------------------------------

Description

------------------------------------------------

Shared Notes

------------------------------------------------

Comments

------------------------------------------------

Activity Timeline

------------------------------------------------
```

---

## Responsibilities

The Incident page should answer four questions immediately:

* What happened?
* Who is working on it?
* What has already been tried?
* What should happen next?

---

# Services

## Purpose

Manage the systems owned by an organization.

Examples:

* Payments API
* Authentication API
* Notification Worker

---

## Displays

* Service name
* Owner
* Description
* Number of incidents

---

## Actions

* Register Service
* Edit
* Delete

---

# Service Details

Displays:

* Service information
* Related incidents
* Assigned owners
* Future integrations

---

# Activity

Provides an organization-wide activity feed.

Examples:

* Incident created
* User joined
* Service registered
* Incident resolved

---

# Notifications

Displays:

* Assignments
* New incidents
* Mentions (future)
* System messages

Actions:

* Mark as read
* Open incident

---

# Members

Displays:

* Organization members
* Role
* Status
* Last active

Actions:

* Invite
* Remove
* Change role

---

# API Keys

Displays:

* Active keys
* Creation date
* Last used

Actions:

* Create
* Revoke
* Copy

---

# Settings

Organization configuration.

Includes:

* Organization profile
* Security
* Roles
* Preferences

---

# Global Search

Available from every page.

Searches:

* Incidents
* Services
* Members

Future:

* Comments
* Activities

---

# Global Components

Visible across the application.

## Sidebar

Persistent navigation.

---

## Header

Contains:

* Search
* Notifications
* User menu

---

## Breadcrumbs

Display current location.

Example:

```text
Dashboard

    ↓

Incidents

    ↓

Payments API Timeout
```

---

# User Flows

## Creating an Incident

```text
Dashboard

    ↓

Create Incident

    ↓

Select Service

    ↓

Enter Details

    ↓

Assign Engineers

    ↓

Create

    ↓

Incident Page
```

---

## Joining an Incident

```text
Notification

    ↓

Incident Page

    ↓

Read Timeline

    ↓

Join Investigation

    ↓

Edit Shared Notes
```

---

## Registering a Service

```text
Services

    ↓      

New Service

    ↓

Enter Details

    ↓

Save

    ↓

Service Details
```

---

# Navigation Rules

1. Maximum three clicks to any feature.
2. Search available globally.
3. Sidebar remains consistent.
4. Context never changes unexpectedly.
5. Incident pages are the primary workspace.

---

# Future Navigation

Version 2 may introduce:

```text
Analytics

Billing

Teams

Status Pages

On-Call

Integrations
```

These should appear as additional top-level modules without disrupting the existing navigation.

---

# Summary

The Information Architecture organizes SyncBoard around the engineer's workflow rather than around technical implementation.

The application's center of gravity is the **Incident Details** page, where investigation, collaboration, and resolution occur. Every other page either helps users find incidents, configure the workspace, or monitor operational activity.
