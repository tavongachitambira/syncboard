import type { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../lib/tokens.js"
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies.js"
import { AppError } from "../lib/errors.js"
import type { JwtPayload } from "@workspace/shared"

declare global {
  namespace Express {
    interface Request {
      caller: JwtPayload
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token: unknown = req.cookies[ACCESS_TOKEN_COOKIE]

  if (typeof token !== "string" || token.length === 0) {
    next(new AppError(401, "MISSING_TOKEN", "Authentication required"))
    return
  }

  try {
    req.caller = await verifyAccessToken(token)
    next()
  } catch {
    next(new AppError(401, "ACCESS_TOKEN_EXPIRED", "Token invalid or expired"))
  }
}