import type { Response } from "express"
import { env } from "../env.js"
import { ACCESS_TTL_S, REFRESH_TTL_S } from "./tokens.js"

export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"

const BASE = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
} as const

export function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...BASE,
    path: "/",
    maxAge: ACCESS_TTL_S * 1000,
  })
  // Refresh token is scoped to the refresh endpoint only
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...BASE,
    path: "/auth/refresh",
    maxAge: REFRESH_TTL_S * 1000,
  })
}

export function clearTokenCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" })
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/auth/refresh" })
}