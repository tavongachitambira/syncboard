import { ErrorCode } from "@workspace/shared"

// Error classes from apps/docs/engineering/error-handling.md.
// Everything thrown to the client extends AppError.

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

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super(ErrorCode.VALIDATION_ERROR, "Validation failed.", 400, details)
  }
}

// 401 variants (MISSING_TOKEN, TOKEN_EXPIRED, ...) share one class; the code
// tells the client what to do next.
export class AuthenticationError extends AppError {
  constructor(
    message = "Authentication required.",
    code: ErrorCode = ErrorCode.UNAUTHORIZED
  ) {
    super(code, message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions.") {
    super(ErrorCode.FORBIDDEN, message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} does not exist.`,
      404
    )
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CONFLICT) {
    super(code, message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(
      ErrorCode.RATE_LIMITED,
      "Too many requests. Please try again later.",
      429
    )
  }
}
