import { Router, type Router as ExpressRouter } from "express"
import type { Request, Response, NextFunction } from "express"
import { authenticate } from "../../middleware/authenticate.js"
import { AppError } from "../../lib/errors.js"
import { prisma as db } from "@workspace/db"
import { ActivityType, type ActivityResponse } from "@workspace/shared"

export const activitiesRouter: ExpressRouter = Router({ mergeParams: true })

activitiesRouter.use(authenticate)

activitiesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const param = req.params["incidentId"]
    const incidentId = typeof param === "string" ? param : ""

    const incident = await db.incident
      .findFirst({
        where: { id: incidentId, organizationId: req.caller.organizationId },
      })
      .catch(next)

    if (incident === undefined) return
    if (incident === null) {
      next(new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found"))
      return
    }

    const activities = await db.activity
      .findMany({
        where: { incidentId },
        include: { actor: true },
        orderBy: { createdAt: "asc" },
      })
      .catch(next)

    if (!activities) return

    const data: ActivityResponse[] = activities.map((a) => ({
      id: a.id,
      incidentId: a.incidentId,
      actor: {
        id: a.actor.id,
        displayName: a.actor.displayName,
        avatarUrl: a.actor.avatarUrl,
      },
      type: a.type as ActivityResponse["type"],
      payload: a.payload as Record<string, unknown>,
      createdAt: a.createdAt.toISOString(),
    }))

    res.json({ success: true, data })
  },
)
