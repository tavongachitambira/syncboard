# Error Handling

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the error handling strategy for SyncBoard.

It covers how errors are classified, thrown, caught, formatted, logged, and surfaced to clients across the REST API, WebSocket layer, and frontend.

Consistent error handling ensures that failures are predictable, debuggable, and never expose internal implementation details.

---

# Principles

- Every error has a machine-readable code
- Production responses never expose stack traces or internal details
- Every unhandled error is logged with full context before the process continues
- Validation errors are distinguished from business errors and system errors
- Clients always receive a structured, predictable error shape

---

# Error Classification

| Class | Meaning | HTTP Status |
|-------|---------|-------------|
| Validation Error | Input failed schema validation | 400 |
| Authentication Error | Request is unauthenticated | 401 |
| Authorization Error | Authenticated but not permitted | 403 |
| Not Found Error | Resource does not exist or is not visible | 404 |
| Conflict Error | State mismatch, e.g. optimistic lock failure | 409 |
| Business Error | Rule violation, e.g. incident already resolved | 422 |
| Rate Limit Error | Too many requests | 429 |
| Internal Error | Unhandled failure | 500 |

---

# Base Error Class

All application errors extend a base class.

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, string>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}
```

---

# Domain Error Classes

```ts
export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super("VALIDATION_ERROR", "Validation failed.", 400, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.") {
    super("UNAUTHORIZED", message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions.") {
    super("FORBIDDEN", message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `${resource} does not exist.`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409)
  }
}

export class BusinessError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 422)
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("RATE_LIMITED", "Too many requests. Please try again later.", 429)
  }
}
```

---

# REST API Error Response

All error responses follow a consistent shape.

```json
{
  "success": false,
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident does not exist."
  }
}
```

Validation errors include field-level details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": {
      "title": "Required",
      "severity": "Invalid enum value"
    }
  }
}
```

---

# Global Error Handler (Express)

A single Express error-handling middleware catches all thrown errors.

```ts
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
    return
  }

  logger.error({ error }, "Unhandled error")

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
  })
}
```

Stack traces and raw error messages from unexpected failures are logged server-side and never forwarded to the client.

---

# Validation (Zod Integration)

Input validation runs before any business logic.

A reusable middleware validates request bodies against a Zod schema:

```ts
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = Object.fromEntries(
        result.error.errors.map((e) => [e.path.join("."), e.message])
      )
      throw new ValidationError(details)
    }
    req.body = result.data
    next()
  }
}
```

Query parameter validation follows the same pattern using `req.query`.

---

# Service Layer Errors

Services throw domain errors directly.

They never return `null` for not-found cases.

```ts
// Bad
async function getIncident(id: string) {
  const incident = await db.incident.findUnique({ where: { id } })
  return incident ?? null
}

// Good
async function getIncident(id: string) {
  const incident = await db.incident.findUnique({ where: { id } })
  if (!incident) throw new NotFoundError("Incident")
  return incident
}
```

---

# Async Error Propagation

All async route handlers must propagate errors to the Express error handler.

Use a wrapper to avoid repeating `try/catch` in every route:

```ts
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
```

Usage:

```ts
router.post("/incidents", asyncHandler(async (req, res) => {
  const incident = await incidentService.create(req.body)
  res.status(201).json({ success: true, data: incident })
}))
```

---

# WebSocket Errors

WebSocket event handlers catch errors and emit a structured error event back to the sender.

```ts
socket.on("incident:update", async (payload, callback) => {
  try {
    await incidentService.update(payload)
    callback({ success: true })
  } catch (error) {
    if (error instanceof AppError) {
      callback({ success: false, error: { code: error.code, message: error.message } })
    } else {
      logger.error({ error }, "Unhandled socket error")
      callback({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } })
    }
  }
})
```

WebSocket errors never disconnect the client unless the error is an authentication failure.

---

# Frontend Error Handling

## API Errors

The frontend API client parses the structured error response and throws a typed error.

```ts
if (!response.ok) {
  const body = await response.json()
  throw new ApiError(body.error.code, body.error.message, body.error.details)
}
```

## React Error Boundaries

Page-level error boundaries catch rendering errors.

They display a user-friendly fallback without exposing technical details.

## Toast Notifications

Business errors surface as dismissible toast messages.

Internal errors show a generic message: "Something went wrong. Please try again."

Validation errors highlight the relevant form fields.

---

# Logging on Errors

Every unexpected error must be logged with full context before it is re-thrown or returned to the client.

```ts
logger.error(
  {
    error,
    incidentId: payload.incidentId,
    userId: req.session.userId,
    requestId: req.id,
  },
  "Failed to update incident"
)
```

See the Observability document for the full logging strategy.

---

# What Not to Do

Do not swallow errors:

```ts
// Bad
try {
  await doSomething()
} catch (_) {}
```

Do not return errors as values:

```ts
// Bad
return { error: "Not found" }

// Good
throw new NotFoundError("Incident")
```

Do not expose stack traces to clients:

```ts
// Bad
res.status(500).json({ error: error.stack })
```

Do not log passwords, tokens, or secrets in error context.

---

# Error Codes Reference

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Input failed schema validation |
| `UNAUTHORIZED` | No valid session |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `SESSION_EXPIRED` | Session has timed out |
| `FORBIDDEN` | Authenticated but not permitted |
| `INCIDENT_NOT_FOUND` | Incident does not exist |
| `INCIDENT_ALREADY_RESOLVED` | Cannot modify a resolved incident |
| `SERVICE_NOT_FOUND` | Service does not exist |
| `MEMBER_NOT_FOUND` | Member does not exist |
| `ORGANIZATION_NOT_FOUND` | Organization does not exist |
| `CONFLICT` | Optimistic lock version mismatch |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server failure |

---

# Summary

Error handling in SyncBoard is centralized, typed, and consistent across the REST API and WebSocket layer. Domain errors are thrown as class instances, caught by a single middleware, and returned as structured JSON. Unexpected failures are logged with full context and surfaced to clients as a generic internal error. The frontend consumes the structured error format to display appropriate messages without ever seeing implementation details.
