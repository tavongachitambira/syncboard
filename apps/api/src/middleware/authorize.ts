import type { NextFunction, Request, RequestHandler, Response } from "express"
import type { UserRole } from "@workspace/shared"
import { AuthenticationError, AuthorizationError } from "../lib/errors.js"

// Owner > Admin > Engineer > Viewer. The permission matrix in
// apps/docs/architecture/security-design.md is monotonic along this order.
const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 0,
  ENGINEER: 1,
  ADMIN: 2,
  OWNER: 3,
}

// Allows callers whose role ranks at or above any of the given roles.
// Must run after authenticate.
//
//   router.patch("/:id", authorize("ENGINEER"), handler)
export function authorize(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.caller === undefined) throw new AuthenticationError()

    const callerRank = ROLE_RANK[req.caller.role]
    if (!roles.some((role) => callerRank >= ROLE_RANK[role])) {
      throw new AuthorizationError()
    }

    next()
  }
}