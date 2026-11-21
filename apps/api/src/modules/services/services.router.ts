import { Router, type Router as ExpressRouter } from "express"
import type { Request } from "express"
import { createServiceSchema, updateServiceSchema } from "@workspace/shared"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as service from "./services.service.js"

export const servicesRouter: ExpressRouter = Router()
servicesRouter.use(authenticate)

const param = (req: Request): string => {
  const value = req.params["serviceId"]
  return typeof value === "string" ? value : ""
}

servicesRouter.get("/", async (req, res) => {
  const data = await service.listServices(req.caller.organizationId)
  res.json({ success: true, data })
})

servicesRouter.post("/", authorize("ADMIN"), async (req, res) => {
  const input = parseInput(createServiceSchema, req.body)
  const data = await service.createService(
    req.caller.organizationId,
    req.caller.sub,
    input
  )
  res.status(201).json({ success: true, data })
})

servicesRouter.patch("/:serviceId", authorize("ADMIN"), async (req, res) => {
  const input = parseInput(updateServiceSchema, req.body)
  const data = await service.updateService(
    req.caller.organizationId,
    param(req),
    input
  )
  res.json({ success: true, data })
})

servicesRouter.delete("/:serviceId", authorize("ADMIN"), async (req, res) => {
  await service.deleteService(req.caller.organizationId, param(req))
  res.status(204).send()
})
