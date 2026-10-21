import type { NextFunction, Request, Response } from "express"
import { errors } from "jose"
import { ACCESS_TOKEN_COOKIE, ErrorCode } from "@workspace/shared"
import { AuthenticationError } from "../lib/errors.js"
import { verifyAccessToken } from "../lib/tokens.js"

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token: unknown = req.cookies[ACCESS_TOKEN_COOKIE]

  if (typeof token !== "string" || token.length === 0) {
    throw new AuthenticationError(
      "Authentication required.",
      ErrorCode.MISSING_TOKEN
    )
  }

  try {
    req.caller = await verifyAccessToken(token)
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new AuthenticationError(
        "Access token expired.",
        ErrorCode.TOKEN_EXPIRED
      )
    }
    throw new AuthenticationError(
      "Invalid access token.",
      ErrorCode.INVALID_TOKEN
    )
  }

  next()
}