import { Router, type Router as ExpressRouter } from "express"
import {
  ACCESS_TOKEN_COOKIE,
  ErrorCode,
  REFRESH_TOKEN_COOKIE,
  loginSchema,
  registerSchema,
} from "@workspace/shared"
import { clearTokenCookies, setTokenCookies } from "../../lib/cookies.js"
import { AuthenticationError } from "../../lib/errors.js"
import { parseInput } from "../../lib/validate.js"
import { authenticate } from "../../middleware/authenticate.js"
import { rateLimit } from "../../middleware/rate-limit.js"
import * as authService from "./auth.service.js"

export const authRouter: ExpressRouter = Router()

// 20 attempts per hour per IP on credential endpoints (security-design.md).
const credentialLimit = rateLimit({
  name: "auth",
  limit: 20,
  windowSeconds: 60 * 60,
})

authRouter.post("/register", credentialLimit, async (req, res) => {
  const input = parseInput(registerSchema, req.body)
  const session = await authService.register(input)

  setTokenCookies(res, session.accessToken, session.refreshToken)
  res.status(201).json({
    success: true,
    data: { user: session.user, organization: session.organization },
  })
})

authRouter.post("/login", credentialLimit, async (req, res) => {
  const input = parseInput(loginSchema, req.body)
  const session = await authService.login(input)

  setTokenCookies(res, session.accessToken, session.refreshToken)
  res.json({
    success: true,
    data: { user: session.user, organization: session.organization },
  })
})

authRouter.post("/refresh", async (req, res) => {
  const refreshToken: unknown = req.cookies[REFRESH_TOKEN_COOKIE]
  const accessToken: unknown = req.cookies[ACCESS_TOKEN_COOKIE]

  if (typeof refreshToken !== "string" || typeof accessToken !== "string") {
    throw new AuthenticationError(
      "Authentication required.",
      ErrorCode.MISSING_TOKEN
    )
  }

  const session = await authService.refresh(refreshToken, accessToken)

  setTokenCookies(res, session.accessToken, session.refreshToken)
  res.json({ success: true, data: {} })
})

authRouter.post("/logout", async (req, res) => {
  const accessToken: unknown = req.cookies[ACCESS_TOKEN_COOKIE]
  await authService.logout(
    typeof accessToken === "string" ? accessToken : undefined
  )

  clearTokenCookies(res)
  res.json({ success: true, data: {} })
})

authRouter.get("/me", authenticate, async (req, res) => {
  const me = await authService.getMe(req.caller.sub)
  res.json({ success: true, data: me })
})