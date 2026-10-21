import type { NextFunction, Request, Response } from "express"
import { env } from "../env.js"
import { AuthorizationError } from "../lib/errors.js"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// CSRF defence on top of SameSite=Lax: a browser always sends Origin on
// state-changing requests, so a mismatch means a cross-site request.
// Requests without an Origin header (non-browser clients) are not CSRF-able.
export function originCheck(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const origin = req.get("origin")

  if (
    !SAFE_METHODS.has(req.method) &&
    origin !== undefined &&
    origin !== new URL(env.WEB_URL).origin
  ) {
    throw new AuthorizationError("Cross-origin request rejected.")
  }

  next()
}
