import { Router, type Router as ExpressRouter } from "express"
import type { NextFunction, Request, Response } from "express"
import { createIncidentSchema, listIncidentsSchema, updateIncidentSchema } from "@workspace/shared"
import { AppError } from "../../lib/errors.js"
import { authenticate } from "../../middleware/authenticate.js"
import { authorize } from "../../middleware/authorize.js"
import * as incident from "./incidents.service.js"

export const incidentsRouter: ExpressRouter = Router()
incidentsRouter.use(authenticate)
const param = (req: Request, key: string) => typeof req.params[key] === "string" ? req.params[key] : ""
incidentsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => { const parsed = listIncidentsSchema.safeParse(req.query); if (!parsed.success) return next(new AppError("VALIDATION_ERROR", "Validation failed", 400)); try { res.json({ success: true, ...(await incident.listIncidents(req.caller.organizationId, parsed.data)) }) } catch (error) { next(error) } })
incidentsRouter.post("/", authorize("ENGINEER"), async (req: Request, res: Response, next: NextFunction) => { const parsed = createIncidentSchema.safeParse(req.body); if (!parsed.success) return next(new AppError("VALIDATION_ERROR", "Validation failed", 400)); try { res.status(201).json({ success: true, data: await incident.createIncident(req.caller.organizationId, req.caller.sub, parsed.data) }) } catch (error) { next(error) } })
incidentsRouter.get("/:incidentId", async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await incident.getIncident(req.caller.organizationId, param(req, "incidentId")) }) } catch (error) { next(error) } })
incidentsRouter.patch("/:incidentId", authorize("ENGINEER"), async (req: Request, res: Response, next: NextFunction) => { const parsed = updateIncidentSchema.safeParse(req.body); if (!parsed.success) return next(new AppError("VALIDATION_ERROR", "Validation failed", 400)); try { res.json({ success: true, data: await incident.updateIncident(req.caller.organizationId, param(req, "incidentId"), req.caller.sub, parsed.data) }) } catch (error) { next(error) } })
incidentsRouter.post("/:incidentId/resolve", authorize("ENGINEER"), async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await incident.resolveIncident(req.caller.organizationId, param(req, "incidentId"), req.caller.sub) }) } catch (error) { next(error) } })
