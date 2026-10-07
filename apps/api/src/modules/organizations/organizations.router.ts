import { Router, type Router as ExpressRouter } from "express"
import type { NextFunction, Request, Response } from "express"
import { updateOrganizationSchema } from "@workspace/shared"
import { AppError } from "../../lib/errors.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as organizationService from "./organization.service.js"

export const organizationsRouter: ExpressRouter = Router()
organizationsRouter.use(authenticate)

organizationsRouter.get("/current", async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await organizationService.getOrganization(req.caller.organizationId) }) } catch (error) { next(error) }
})

organizationsRouter.patch("/current", authorize("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  const parsed = updateOrganizationSchema.safeParse(req.body)
  if (!parsed.success) return next(new AppError(400, "VALIDATION_ERROR", "Validation failed"))
  try { res.json({ success: true, data: await organizationService.updateOrganization(req.caller.organizationId, parsed.data) }) } catch (error) { next(error) }
})
