import { Router, type Router as ExpressRouter } from "express"
import type { Request, Response, NextFunction } from "express"
import { createCommentSchema, updateCommentSchema } from "@workspace/shared"
import { authenticate } from "../../middleware/authenticate.js"
import { AppError } from "../../lib/errors.js"
import * as commentsService from "./comments.service.js"

export const commentsRouter: ExpressRouter = Router({ mergeParams: true })

commentsRouter.use(authenticate)

commentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await commentsService
      .listComments(
        req.caller.organizationId,
        typeof req.params["incidentId"] === "string" ? req.params["incidentId"] : "",
      )
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  },
)

commentsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = createCommentSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await commentsService
      .createComment(
        req.caller.organizationId,
        typeof req.params["incidentId"] === "string" ? req.params["incidentId"] : "",
        req.caller.sub,
        parsed.data,
      )
      .catch(next)
    if (!result) return
    res.status(201).json({ success: true, data: result })
  },
)

commentsRouter.patch(
  "/:commentId",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = updateCommentSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await commentsService
      .updateComment(
        req.caller.organizationId,
        typeof req.params["commentId"] === "string" ? req.params["commentId"] : "",
        req.caller.sub,
        parsed.data,
      )
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  },
)

commentsRouter.delete(
  "/:commentId",
  async (req: Request, res: Response, next: NextFunction) => {
    await commentsService
      .deleteComment(
        req.caller.organizationId,
        typeof req.params["commentId"] === "string" ? req.params["commentId"] : "",
        req.caller.sub,
        req.caller.role,
      )
      .catch(next)
    res.status(204).send()
  },
)
