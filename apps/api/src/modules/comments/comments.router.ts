import { Router, type Router as ExpressRouter } from "express"
import type { Request, Response, NextFunction } from "express"
import { createCommentSchema, updateCommentSchema } from "@workspace/shared"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import { AppError } from "../../lib/errors.js"
import * as commentsService from "./comments.service.js"

export const commentsRouter: ExpressRouter = Router({ mergeParams: true })

const param = (req: Request, name: string): string => {
  const value = req.params[name]
  return typeof value === "string" ? value : ""
}

commentsRouter.use(authenticate)

commentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await commentsService
      .listComments(req.caller.organizationId, param(req, "incidentId"))
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  }
)

commentsRouter.post(
  "/",
  authorize("ENGINEER"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = createCommentSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await commentsService
      .createComment(
        req.caller.organizationId,
        param(req, "incidentId"),
        req.caller.sub,
        parsed.data
      )
      .catch(next)
    if (!result) return
    res.status(201).json({ success: true, data: result })
  }
)

commentsRouter.patch(
  "/:commentId",
  authorize("ENGINEER"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = updateCommentSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await commentsService
      .updateComment(
        req.caller.organizationId,
        param(req, "incidentId"),
        param(req, "commentId"),
        req.caller.sub,
        parsed.data
      )
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  }
)

// Express 5 forwards a rejected promise to the error handler, so a failed
// delete must not fall through to the 204 below (`.catch(next)` used to let it).
commentsRouter.delete(
  "/:commentId",
  authorize("ENGINEER"),
  async (req: Request, res: Response) => {
    await commentsService.deleteComment(
      req.caller.organizationId,
      param(req, "incidentId"),
      param(req, "commentId"),
      req.caller.sub,
      req.caller.role
    )
    res.status(204).send()
  }
)
