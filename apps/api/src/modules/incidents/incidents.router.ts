import { Router, type Router as ExpressRouter } from "express"
import type { Request } from "express"
import {
  createIncidentSchema,
  listIncidentsSchema,
  updateIncidentSchema,
} from "@workspace/shared"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as incident from "./incidents.service.js"

export const incidentsRouter: ExpressRouter = Router()
incidentsRouter.use(authenticate)

const param = (req: Request, key: string): string => {
  const value = req.params[key]
  return typeof value === "string" ? value : ""
}

incidentsRouter.get("/", async (req, res) => {
  const input = parseInput(listIncidentsSchema, req.query)
  res.json({
    success: true,
    ...(await incident.listIncidents(req.caller.organizationId, input)),
  })
})

incidentsRouter.post("/", authorize("ENGINEER"), async (req, res) => {
  const input = parseInput(createIncidentSchema, req.body)
  const data = await incident.createIncident(
    req.caller.organizationId,
    req.caller.sub,
    input
  )
  res.status(201).json({ success: true, data })
})

incidentsRouter.get("/:incidentId", async (req, res) => {
  const data = await incident.getIncident(
    req.caller.organizationId,
    param(req, "incidentId")
  )
  res.json({ success: true, data })
})

incidentsRouter.patch(
  "/:incidentId",
  authorize("ENGINEER"),
  async (req, res) => {
    const input = parseInput(updateIncidentSchema, req.body)
    const data = await incident.updateIncident(
      req.caller.organizationId,
      param(req, "incidentId"),
      req.caller.sub,
      input
    )
    res.json({ success: true, data })
  }
)

incidentsRouter.post(
  "/:incidentId/resolve",
  authorize("ENGINEER"),
  async (req, res) => {
    const data = await incident.resolveIncident(
      req.caller.organizationId,
      param(req, "incidentId"),
      req.caller.sub
    )
    res.json({ success: true, data })
  }
)
