import express, { type Express} from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { env } from "./env.js"
import { authRouter } from "./modules/auth/auth.router.js"
import { AppError } from "./lib/errors.js"
import type { Request, Response, NextFunction } from "express"

export const app: Express = express()

app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.use("/auth", authRouter)

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } })
})

// Global error handler
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