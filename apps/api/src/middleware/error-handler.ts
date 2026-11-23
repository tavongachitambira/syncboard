import type { NextFunction, Request, Response } from "express"
import { ErrorCode } from "@workspace/shared"
import { AppError, NotFoundError } from "../lib/errors.js"
import { logger } from "../lib/logger.js"

export function notFoundHandler(): never {
  throw new NotFoundError("Route")
}

// body-parser reports problems with the request body through errors that carry
// one of these `type`s. They are the client's fault, so they must not fall
// through to the 500 branch (an oversized body used to log "Unhandled error").
const BODY_ERRORS: Record<string, { status: number; message: string }> = {
  "entity.parse.failed": { status: 400, message: "Malformed JSON." },
  "entity.too.large": { status: 413, message: "Request body is too large." },
  "encoding.unsupported": {
    status: 415,
    message: "Unsupported content encoding.",
  },
  "charset.unsupported": { status: 415, message: "Unsupported charset." },
}

function toBodyError(error: unknown): AppError | null {
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return null
  }
  const known =
    typeof error.type === "string" ? BODY_ERRORS[error.type] : undefined
  if (known === undefined) return null
  return new AppError(
    ErrorCode.VALIDATION_ERROR,
    "Validation failed.",
    known.status,
    {
      body: known.message,
    }
  )
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Once a response has started we can no longer send a JSON error; let
  // Express close the connection instead of throwing ERR_HTTP_HEADERS_SENT.
  if (res.headersSent) {
    next(error)
    return
  }

  const appError = toBodyError(error) ?? error

  if (appError instanceof AppError) {
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    })
    return
  }

  logger.error({ error }, "Unhandled error")

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred.",
    },
  })
}
