import type { NextFunction, Request, RequestHandler, Response } from "express"
import { RateLimitError } from "../lib/errors.js"
import { redis } from "../lib/redis.js"

// INCR and EXPIRE run as one Lua script, so they are atomic. Issuing them as
// separate commands left a gap: if the window ended between them, INCR
// recreated the key with no expiry and that IP stayed blocked forever. The TTL
// check also repairs a counter that already lost its expiry.
const HIT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 or redis.call("TTL", KEYS[1]) < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`

// Fixed-window counter per client IP (ADR-06).
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
    const count = await redis.eval(HIT, 1, key, options.windowSeconds)

    if (typeof count !== "number") {
      throw new Error("Unexpected reply from the rate limit script")
    }
    if (count > options.limit) throw new RateLimitError()
    next()
  }
}
