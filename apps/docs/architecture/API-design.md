# 11 - API Design

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the HTTP API exposed by SyncBoard.

It specifies:

- REST endpoints
- Authentication
- Authorization
- Request/Response contracts
- Error handling
- Versioning
- Idempotency
- API conventions

The API is designed to serve:

- Web Application
- External Integrations
- Monitoring Systems
- Future Mobile Applications

---

# API Design Principles

The SyncBoard API follows these principles:

- RESTful resource design
- Stateless requests
- JSON request/response bodies
- Predictable URLs
- Consistent error format
- Versioned endpoints
- Idempotent operations where appropriate

---

# Base URL

Development

```
http://localhost:4000/api/v1
```

Production

```
https://api.syncboard.com/v1
```

---

# Authentication

Two authentication mechanisms are supported.

## User Authentication

```
JWT (RS256), delivered as HttpOnly cookies
```

Used by:

- Web Application

Access tokens are short-lived (15 minutes) and verified statelessly. Refresh tokens are long-lived (7 days) and exchanged for a new access token via `/auth/refresh`.

---

## API Authentication

```
Authorization: Bearer <API_KEY>
```

Used by:

- Monitoring Systems
- CI/CD
- External Integrations

---

# Response Format

Successful response

```json
{
  "success": true,
  "data": {}
}
```

---

Failure response

```json
{
  "success": false,
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident does not exist."
  }
}
```

---

Validation error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "title": "Required",
      "severity": "Invalid value"
    }
  }
}
```

---

# HTTP Status Codes

| Code | Meaning |
|-------|----------|
|200|Success|
|201|Created|
|204|No Content|
|400|Validation Error|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Unprocessable Entity|
|429|Rate Limited|
|500|Internal Error|

---

# API Versioning

```
/api/v1
```

Future

```
/api/v2
```

Breaking changes require a new version.

---

# Resource Overview

```
Authentication

Organizations

Members

Services

Incidents

Assignments

Comments

Activities

Notifications

API Keys
```

---

# Authentication Endpoints

## Register

POST

```
/auth/register
```

Request

```json
{
  "email": "john@example.com",
  "password": "********",
  "displayName": "John"
}
```

Response

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "organizationId": "..."
  }
}
```

---

## Login

POST

```
/auth/login
```

---

## Logout

POST

```
/auth/logout
```

---

## Refresh

POST

```
/auth/refresh
```

Exchanges a valid, unrevoked refresh token cookie for a new access token cookie. Returns `401` if the refresh token is missing, expired, or revoked.

---

## Current User

GET

```
/auth/me
```

---

# Organization Endpoints

## Get Organization

GET

```
/organizations/current
```

---

## Update Organization

PATCH

```
/organizations/current
```

---

# Member Endpoints

## List Members

GET

```
/members
```

---

## Invite Member

POST

```
/members/invite
```

---

## Remove Member

DELETE

```
/members/{memberId}
```

---

## Update Role

PATCH

```
/members/{memberId}/role
```

---

# Service Endpoints

## List Services

GET

```
/services
```

---

## Create Service

POST

```
/services
```

Request

```json
{
  "name": "Payments API",
  "description": "Handles payment processing"
}
```

---

## Update Service

PATCH

```
/services/{serviceId}
```

---

## Delete Service

DELETE

```
/services/{serviceId}
```

---

# Incident Endpoints

## List Incidents

GET

```
/incidents
```

Query Parameters

```
status

severity

serviceId

assignee

page

limit
```

---

## Get Incident

GET

```
/incidents/{incidentId}
```

---

## Create Incident

POST

```
/incidents
```

Request

```json
{
  "title": "Payments API timeout",
  "severity": "critical",
  "serviceId": "...",
  "assignees": [
    "...",
    "..."
  ]
}
```

---

## Update Incident

PATCH

```
/incidents/{incidentId}
```

Supported updates

- Status
- Severity
- Title
- Description

---

## Resolve Incident

POST

```
/incidents/{incidentId}/resolve
```

---

# Assignment Endpoints

## Assign User

POST

```
/incidents/{incidentId}/assignments
```

---

## Remove Assignment

DELETE

```
/incidents/{incidentId}/assignments/{memberId}
```

---

# Comment Endpoints

## List Comments

GET

```
/incidents/{incidentId}/comments
```

---

## Create Comment

POST

```
/incidents/{incidentId}/comments
```

---

## Update Comment

PATCH

```
/comments/{commentId}
```

---

## Delete Comment

DELETE

```
/comments/{commentId}
```

---

# Activity Endpoints

## Get Timeline

GET

```
/incidents/{incidentId}/activities
```

Activities are read-only.

---

# Notification Endpoints

## List Notifications

GET

```
/notifications
```

---

## Mark Read

PATCH

```
/notifications/{notificationId}
```

---

## Mark All Read

POST

```
/notifications/read-all
```

---

# API Key Endpoints

## List Keys

GET

```
/api-keys
```

---

## Create Key

POST

```
/api-keys
```

---

## Revoke Key

DELETE

```
/api-keys/{keyId}
```

---

# Pagination

Collection endpoints return:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 245,
    "pages": 13
  }
}
```

---

# Filtering

Example

```
GET /incidents?status=open&severity=critical
```

---

# Sorting

Example

```
GET /incidents?sort=updatedAt&order=desc
```

---

# Searching

```
GET /incidents?q=payments
```

---

# Idempotency

Supported for:

- Incident creation
- API integrations

Header

```
Idempotency-Key: UUID
```

Repeated requests with the same key should not create duplicate incidents.

---

# Rate Limiting

Authenticated Users

```
500 requests/minute
```

API Keys

```
1000 requests/minute
```

Authentication

```
20 login attempts/hour
```

---

# Validation

Every request is validated using Zod.

Validation occurs before business logic.

---

# Authorization

Every endpoint requires:

1. Authentication
2. Organization membership
3. Permission check

Example

```
User

↓

Authenticated

↓

Organization Member

↓

Role Check

↓

Resource Ownership

↓

Business Logic
```

---

# Error Codes

Authentication

```
UNAUTHORIZED

INVALID_CREDENTIALS

SESSION_EXPIRED
```

Validation

```
VALIDATION_ERROR

INVALID_INPUT
```

Incident

```
INCIDENT_NOT_FOUND

INCIDENT_ALREADY_RESOLVED
```

Service

```
SERVICE_NOT_FOUND
```

Organization

```
MEMBER_NOT_FOUND

ORGANIZATION_NOT_FOUND
```

Permissions

```
FORBIDDEN

INSUFFICIENT_PERMISSIONS
```

---

# Future Endpoints

```
/analytics

/billing

/webhooks

/integrations

/status-pages
```

---

# OpenAPI

The complete REST API should be documented using OpenAPI 3.1.

Generated documentation should remain synchronized with implementation.

---

# Summary

The SyncBoard API provides a consistent REST interface for both the web application and external systems. Every endpoint follows predictable conventions for authentication, validation, authorization, pagination, and error handling, ensuring that the API remains stable, discoverable, and easy to extend as the platform evolves.