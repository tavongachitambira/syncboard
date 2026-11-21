import { Router, type Router as ExpressRouter } from "express"
import type { Request } from "express"
import { createCommentSchema, updateCommentSchema } from "@workspace/shared"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as commentsService from "./comments.service.js"

export const commentsRouter: ExpressRouter = Router({ mergeParams: true })

const param = (req: Request, name: string): string => {
  const value = req.params[name]
  return typeof value === "string" ? value : ""
}

commentsRouter.use(authenticate)

commentsRouter.get("/", async (req, res) => {
  const data = await commentsService.listComments(
    req.caller.organizationId,
    param(req, "incidentId")
  )
  res.json({ success: true, data })
})

commentsRouter.post("/", authorize("ENGINEER"), async (req, res) => {
  const input = parseInput(createCommentSchema, req.body)
  const data = await commentsService.createComment(
    req.caller.organizationId,
    param(req, "incidentId"),
    req.caller.sub,
    input
  )
  res.status(201).json({ success: true, data })
})

commentsRouter.patch("/:commentId", authorize("ENGINEER"), async (req, res) => {
  const input = parseInput(updateCommentSchema, req.body)
  const data = await commentsService.updateComment(
    req.caller.organizationId,
    param(req, "incidentId"),
    param(req, "commentId"),
    req.caller.sub,
    input
  )
  res.json({ success: true, data })
})

commentsRouter.delete(
  "/:commentId",
  authorize("ENGINEER"),
  async (req, res) => {
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
