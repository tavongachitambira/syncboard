import { Router, type Router as ExpressRouter } from "express"
import type { Request, Response, NextFunction } from "express"
import { inviteMemberSchema, updateRoleSchema } from "@workspace/shared"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import { AppError } from "../../lib/errors.js"
import * as membersService from "./members.service.js"

export const membersRouter: ExpressRouter = Router()
const memberId = (req: Request) =>
  typeof req.params["memberId"] === "string" ? req.params["memberId"] : ""

membersRouter.use(authenticate)

membersRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await membersService
      .listMembers(req.caller.organizationId)
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  }
)

membersRouter.post(
  "/invite",
  authorize("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = inviteMemberSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await membersService
      .inviteMember(req.caller.organizationId, req.caller.sub, parsed.data)
      .catch(next)
    if (!result) return
    res.status(201).json({ success: true, data: result })
  }
)

membersRouter.patch(
  "/:memberId/role",
  authorize("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = updateRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new AppError("VALIDATION_ERROR", "Validation failed", 400))
      return
    }
    const result = await membersService
      .updateMemberRole(
        req.caller.organizationId,
        memberId(req),
        req.caller.sub,
        parsed.data
      )
      .catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  }
)

membersRouter.delete(
  "/:memberId",
  authorize("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    await membersService
      .removeMember(req.caller.organizationId, memberId(req), req.caller.sub)
      .catch(next)
    res.status(204).send()
  }
)
