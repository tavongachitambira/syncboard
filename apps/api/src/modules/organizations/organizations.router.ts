import { Router, type Router as ExpressRouter } from "express"
import { updateOrganizationSchema } from "@workspace/shared"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as organizationService from "./organization.service.js"

export const organizationsRouter: ExpressRouter = Router()
organizationsRouter.use(authenticate)

organizationsRouter.get("/current", async (req, res) => {
  const data = await organizationService.getOrganization(
    req.caller.organizationId
  )
  res.json({ success: true, data })
})

organizationsRouter.patch("/current", authorize("ADMIN"), async (req, res) => {
  const input = parseInput(updateOrganizationSchema, req.body)
  const data = await organizationService.updateOrganization(
    req.caller.organizationId,
    input
  )
  res.json({ success: true, data })
})
