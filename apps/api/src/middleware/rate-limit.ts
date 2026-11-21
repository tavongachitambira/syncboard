import type { NextFunction, Request, RequestHandler, Response } from "express"
import { RateLimitError } from "../lib/errors.js"
import { redis } from "../lib/redis.js"

// Fixed-window counter per client IP (ADR-06). The key is created with its TTL
// before it is incremented, so a crash can never leave a counter without expiry.
export function rateLimit(options: {
  name: string
  limit: number
  windowSeconds: number
}): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const key = `rl:${options.name}:${req.ip ?? "unknown"}`
    await redis.set(key, 0, "EX", options.windowSeconds, "NX")
    const count = await redis.incr(key)

    if (count > options.limit) throw new RateLimitError()
    next()
  }
}
