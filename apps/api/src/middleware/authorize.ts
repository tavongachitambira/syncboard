import type { NextFunction, Request, RequestHandler, Response } from "express"
import { AppError } from "../lib/errors.js"
import type { UserRole } from "@workspace/shared"

// Roles ordered from least to most privileged. A caller holding a given role
// can do everything a lower-ranked role can — this mirrors the monotonic
// shape of the permission matrix in apps/docs/architecture/security-design.md,
// where Owner ⊇ Admin ⊇ Engineer ⊇ Viewer for every RBAC-gated resource.
const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 0,
  ENGINEER: 1,
  ADMIN: 2,
  OWNER: 3,
}

// All of the middleware below assumes `authenticate` has already run and
// populated `req.caller`. Checked defensively rather than trusted, in case a
// route is wired up without it.
function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!req.caller) {
    throw new AppError(401, "MISSING_TOKEN", "Authentication required")
  }
}

/**
 * Restricts a route to an explicit allow-list of roles. Use this when a
 * resource's permission-matrix row isn't a clean hierarchy cutoff (e.g. a
 * role granted an exception outside the normal rank order).
 *
 *   router.delete(
 *     "/members/:userId",
 *     authenticate,
 *     requireRole("OWNER", "ADMIN"),
 *     handler,
 *   )
 */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertAuthenticated(req)
    } catch (err) {
      next(err)
      return
    }

    if (!allowed.includes(req.caller.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      )
      return
    }

    next()
  }
}

/**
 * Restricts a route to callers whose role rank meets or exceeds `minimum`,
 * per the Owner > Admin > Engineer > Viewer hierarchy. Prefer this over
 * `requireRole` for the common case — most rows in the permission matrix are
 * "this role and everything above it."
 *
 *   router.patch("/incidents/:id", authenticate, requireMinRole("ENGINEER"), handler)
 */
export function requireMinRole(minimum: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertAuthenticated(req)
    } catch (err) {
      next(err)
      return
    }

    if (ROLE_RANK[req.caller!.role] < ROLE_RANK[minimum]) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      )
      return
    }

    next()
  }
}

/**
 * Enforces tenant isolation for single-resource routes, e.g. /incidents/:id.
 *
 * `loadResourceOrgId` is owned by the calling module's service layer and
 * resolves the resource's organizationId, or null if the resource doesn't
 * exist. Both "doesn't exist" and "exists in a different org" resolve to
 * 404 — never 403 — so a caller can't distinguish "not found" from "not
 * yours" and use that to probe for other organizations' data.
 *
 *   router.get(
 *     "/incidents/:incidentId",
 *     authenticate,
 *     requireOrgScope((req) => incidentService.getOrganizationId(req.params.incidentId)),
 *     handler,
 *   )
 */
export function requireOrgScope(
  loadResourceOrgId: (req: Request) => Promise<string | null>,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      assertAuthenticated(req)
    } catch (err) {
      next(err)
      return
    }

    try {
      const resourceOrgId = await loadResourceOrgId(req)

      if (resourceOrgId === null || resourceOrgId !== req.caller.organizationId) {
        next(new AppError(404, "NOT_FOUND", "Resource not found"))
        return
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Restricts a route to the resource's owner, OR any caller whose role is in
 * `allowed` — the "Own" column in the permission matrix (e.g. notifications:
 * every role manages their own; nobody touches another user's without an
 * elevated role).
 *
 * `getOwnerId` reads the owning userId off the request (a param, or a
 * resource already loaded upstream) — it does not hit the database itself.
 *
 *   router.patch(
 *     "/notifications/:id",
 *     authenticate,
 *     requireSelfOrRole((req) => req.params.userId, "OWNER", "ADMIN"),
 *     handler,
 *   )
 */
export function requireSelfOrRole(
  getOwnerId: (req: Request) => string,
  ...allowed: UserRole[]
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertAuthenticated(req)
    } catch (err) {
      next(err)
      return
    }

    const isSelf = getOwnerId(req) === req.caller.sub
    const isPrivileged = allowed.includes(req.caller.role)

    if (!isSelf && !isPrivileged) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      )
      return
    }

    next()
  }
}