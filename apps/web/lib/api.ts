import { z } from "zod"
import { ErrorCode } from "@workspace/shared"

// Dev: the API on :4000 (same site as :3000, so cookies flow). Production sits
// behind the reverse proxy: set NEXT_PUBLIC_API_URL=/api/v1.
// Next only inlines the dotted form of NEXT_PUBLIC_ variables.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"

const REFRESH_LOCK = "syncboard-refresh"

const SESSION_LOST_CODES: readonly string[] = [
  ErrorCode.MISSING_TOKEN,
  ErrorCode.INVALID_TOKEN,
  ErrorCode.REFRESH_TOKEN_REVOKED,
]

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const envelope = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.string()).optional(),
    }),
  }),
])

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
}

async function call<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  })

  const parsed = envelope.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new ApiError(
      ErrorCode.INTERNAL_ERROR,
      "Unexpected response from the server.",
      response.status
    )
  }

  if (!parsed.data.success) {
    const { code, message, details } = parsed.data.error
    throw new ApiError(code, message, response.status, details)
  }

  // The API contract fixes the data shape per endpoint, so each caller
  // declares T. The envelope itself is validated above.
  return parsed.data.data as T
}

async function rawStatus(
  path: string,
  method: "GET" | "POST"
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
    })
    return response.ok
  } catch {
    return false
  }
}

// Rotating refresh tokens means two refreshes at once look like token reuse and
// revoke the whole session. Within a tab, concurrent callers share one
// promise; across tabs, a Web Lock serialises them.
let inFlightRefresh: Promise<boolean> | undefined

async function performRefresh(): Promise<boolean> {
  // Another tab may have refreshed while this one waited for the lock.
  if (await rawStatus("/auth/me", "GET")) return true
  return rawStatus("/auth/refresh", "POST")
}

async function runRefresh(): Promise<boolean> {
  if (!("locks" in navigator)) return performRefresh()
  return await navigator.locks.request(REFRESH_LOCK, performRefresh)
}

function refreshSession(): Promise<boolean> {
  if (inFlightRefresh === undefined) {
    inFlightRefresh = runRefresh().finally(() => {
      inFlightRefresh = undefined
    })
  }
  return inFlightRefresh
}

// Logging out clears the cookies even when the tokens are invalid, which stops
// the route guard from bouncing /login back to the app on a dead session.
async function endSession(): Promise<void> {
  await rawStatus("/auth/logout", "POST")
  window.location.assign("/login")
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  try {
    return await call<T>(path, options)
  } catch (error) {
    if (!(error instanceof ApiError)) throw error

    if (error.code === ErrorCode.TOKEN_EXPIRED) {
      if (await refreshSession()) return call<T>(path, options)
      await endSession()
    } else if (SESSION_LOST_CODES.includes(error.code)) {
      await endSession()
    }

    throw error
  }
}