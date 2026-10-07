
import { Router, type Router as ExpressRouter } from "express"
import type { Request, Response, NextFunction } from "express"
import { signinSchema, signupSchema} from "@workspace/shared"
import { AppError } from "../../lib/errors.js"
import {
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "../../lib/cookies.js"
import { authenticate } from "../../middleware/authenticate.js"
import * as authService from "./auth.service.js"

export const authRouter : ExpressRouter = Router()

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  const details: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path
      .filter((p): p is string | number => typeof p !== "symbol")
      .join(".") || "root"
    details[key] = issue.message
  }
  return new AppError(400, "VALIDATION_ERROR", "Validation failed")
}

authRouter.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      next(validationError(parsed.error.issues))
      return
    }

    const result = await authService.register(parsed.data).catch(next)
    if (!result) return

    setTokenCookies(res, result.accessToken, result.refreshToken)
    res.status(201).json({
      success: true,
      data: { user: result.user, organization: result.organization },
    })
  },
)

authRouter.post(
  "/signin",
  async (req: Request, res: Response, next: NextFunction) => {
    
    const parsed = signinSchema.safeParse(req.body)
    if (!parsed.success) {
      next(validationError(parsed.error.issues))
      return
    }

    const result = await authService.login(parsed.data).catch(next)
    if (!result) return

    setTokenCookies(res, result.accessToken, result.refreshToken)
    res.json({
      success: true,
      data: { user: result.user, organization: result.organization },
    })
  },
)

authRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    const rawRefresh: unknown = req.cookies[REFRESH_TOKEN_COOKIE]
    const rawAccess: unknown = req.cookies[ACCESS_TOKEN_COOKIE]

    if (typeof rawRefresh !== "string" || typeof rawAccess !== "string") {
      next(new AppError(401, "MISSING_TOKEN", "Missing token cookies"))
      return
    }

    const result = await authService.refresh(rawRefresh, rawAccess).catch(next)
    if (!result) return

    setTokenCookies(res, result.accessToken, result.refreshToken)
    res.json({ success: true, data: {} })
  },
)

authRouter.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    const rawAccess: unknown = req.cookies[ACCESS_TOKEN_COOKIE]
    if (typeof rawAccess === "string") {
      await authService.logout(rawAccess).catch(next)
    }
    clearTokenCookies(res)
    res.json({ success: true, data: {} })
  },
)

authRouter.post(
  "/logout-all",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.logoutAll(req.caller.sub).catch(next)
    clearTokenCookies(res)
    res.json({ success: true, data: {} })
  },
)

authRouter.get(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.getMe(req.caller.sub).catch(next)
    if (!result) return
    res.json({ success: true, data: result })
  },
)