import type { NextFunction, Request, Response } from "express"
import { ErrorCode } from "@workspace/shared"
import { AppError, NotFoundError, ValidationError } from "../lib/errors.js"
import { logger } from "../lib/logger.js"

export function notFoundHandler(): never {
  throw new NotFoundError("Route")
}

// body-parser reports malformed JSON with this type.
function isMalformedJson(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  )
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appError = isMalformedJson(error)
    ? new ValidationError({ body: "Malformed JSON." })
    : error

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