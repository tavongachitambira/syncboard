import type { Response } from "express"
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@workspace/shared"
import { env } from "../env.js"

const BASE = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
} as const

export function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...BASE,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS * 1000,
  })
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...BASE,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  })
}

export function clearTokenCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...BASE, path: "/" })
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...BASE, path: REFRESH_COOKIE_PATH })
}