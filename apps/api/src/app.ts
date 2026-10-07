import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { env } from "./env.js"
import { authRouter } from "./modules/auth/auth.router.js"
import { organizationsRouter } from "./modules/organizations/organizations.router.js"
import { membersRouter } from "./modules/members/members.router.js"
import { servicesRouter } from "./modules/services/services.router.js"
import { incidentsRouter } from "./modules/incidents/incidents.router.js"
import { commentsRouter } from "./modules/comments/comments.router.js"
import { activitiesRouter } from "./modules/activities/activities.router.js"
import { AppError } from "./lib/errors.js"
import type { Express, Request, Response, NextFunction } from "express"

export const app: Express = express()

app.use(cors({ origin: env.WEB_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const api = express.Router()

api.use("/auth", authRouter)
api.use("/organizations", organizationsRouter)
api.use("/members", membersRouter)
api.use("/services", servicesRouter)
api.use("/incidents", incidentsRouter)
api.use("/incidents/:incidentId/comments", commentsRouter)
api.use("/incidents/:incidentId/activities", activitiesRouter)

app.use("/api/v1", api)

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    })
    return
  }
  console.error(err)
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  })
})
