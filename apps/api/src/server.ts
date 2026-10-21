import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import { env } from "./env.js"
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js"
import { originCheck } from "./middleware/origin-check.js"
import { activitiesRouter } from "./modules/activities/activities.router.js"
import { authRouter } from "./modules/auth/auth.router.js"
import { commentsRouter } from "./modules/comments/comments.router.js"
import { incidentsRouter } from "./modules/incidents/incidents.router.js"
import { membersRouter } from "./modules/members/members.router.js"
import { organizationsRouter } from "./modules/organizations/organizations.router.js"
import { servicesRouter } from "./modules/services/services.router.js"

export const app: Express = express()

app.disable("x-powered-by")
app.use(cors({ origin: env.WEB_URL, credentials: true }))
app.use(express.json({ limit: "100kb" }))
app.use(cookieParser())

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" })
})

const api = express.Router()

api.use(originCheck)
api.use("/auth", authRouter)
api.use("/organizations", organizationsRouter)
api.use("/members", membersRouter)
api.use("/services", servicesRouter)
api.use("/incidents", incidentsRouter)
api.use("/incidents/:incidentId/comments", commentsRouter)
api.use("/incidents/:incidentId/activities", activitiesRouter)

app.use("/api/v1", api)

app.use(notFoundHandler)
app.use(errorHandler)