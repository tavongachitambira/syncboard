import { Router, type Router as ExpressRouter } from "express"
import type { Request } from "express"
import { inviteMemberSchema, updateRoleSchema } from "@workspace/shared"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as membersService from "./members.service.js"

export const membersRouter: ExpressRouter = Router()

const memberId = (req: Request): string => {
  const value = req.params["memberId"]
  return typeof value === "string" ? value : ""
}

membersRouter.use(authenticate)

membersRouter.get("/", async (req, res) => {
  const data = await membersService.listMembers(req.caller.organizationId)
  res.json({ success: true, data })
})

membersRouter.post("/invite", authorize("ADMIN"), async (req, res) => {
  const input = parseInput(inviteMemberSchema, req.body)
  const data = await membersService.inviteMember(
    req.caller.organizationId,
    req.caller.sub,
    input
  )
  res.status(201).json({ success: true, data })
})

membersRouter.patch("/:memberId/role", authorize("ADMIN"), async (req, res) => {
  const input = parseInput(updateRoleSchema, req.body)
  const data = await membersService.updateMemberRole(
    req.caller.organizationId,
    memberId(req),
    req.caller.sub,
    input
  )
  res.json({ success: true, data })
})

membersRouter.delete("/:memberId", authorize("ADMIN"), async (req, res) => {
  await membersService.removeMember(
    req.caller.organizationId,
    memberId(req),
    req.caller.sub
  )
  res.status(204).send()
})
