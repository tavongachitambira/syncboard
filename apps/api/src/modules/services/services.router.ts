import { Router, type Router as ExpressRouter } from "express"
import type { NextFunction, Request, Response } from "express"
import { createServiceSchema, updateServiceSchema } from "@workspace/shared"
import { AppError } from "../../lib/errors.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as service from "./services.service.js"

export const servicesRouter: ExpressRouter = Router()
servicesRouter.use(authenticate)
const param = (req: Request) =>
  typeof req.params["serviceId"] === "string" ? req.params["serviceId"] : ""
servicesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await service.listServices(req.caller.organizationId),
      })
    } catch (error) {
      next(error)
    }
  }
)
servicesRouter.post(
  "/",
  authorize("ENGINEER"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = createServiceSchema.safeParse(req.body)
    if (!parsed.success)
      return next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await service.createService(
            req.caller.organizationId,
            req.caller.sub,
            parsed.data
          ),
        })
    } catch (error) {
      next(error)
    }
  }
)
servicesRouter.patch(
  "/:serviceId",
  authorize("ENGINEER"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = updateServiceSchema.safeParse(req.body)
    if (!parsed.success)
      return next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
    try {
      res.json({
        success: true,
        data: await service.updateService(
          req.caller.organizationId,
          param(req),
          parsed.data
        ),
      })
    } catch (error) {
      next(error)
    }
  }
)
servicesRouter.delete(
  "/:serviceId",
  authorize("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.deleteService(req.caller.organizationId, param(req))
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
)
