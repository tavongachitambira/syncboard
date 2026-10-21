// Token and cookie contract from ADR-02. Shared so apps/api (issuing) and
// apps/socket (verifying) cannot drift apart.

export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

// /auth/refresh reads sub and jti from the (expired) access token, so the
// access cookie must outlive the JWT. The JWT exp claim stays the authority.
export const ACCESS_COOKIE_MAX_AGE_SECONDS = REFRESH_TOKEN_TTL_SECONDS

// The refresh cookie is only ever sent to the refresh endpoint.
export const REFRESH_COOKIE_PATH = "/api/v1/auth/refresh"