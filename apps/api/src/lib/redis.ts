import { Redis } from "ioredis"
import { REFRESH_TOKEN_TTL_SECONDS } from "@workspace/shared"
import { env } from "../env.js"
import { logger } from "./logger.js"

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
})

redis.on("error", (error: Error) => {
  logger.error({ error }, "Redis error")
})

// Registry of live refresh tokens (ADR-02, ADR-06).
// Key: refresh:{userId}:{jti}   Value: sha256(rawRefreshToken)
const key = (userId: string, jti: string): string => `refresh:${userId}:${jti}`

export const refreshTokens = {
  async set(userId: string, jti: string, tokenHash: string): Promise<void> {
    await redis.set(
      key(userId, jti),
      tokenHash,
      "EX",
      REFRESH_TOKEN_TTL_SECONDS
    )
  },

  // Reads and deletes in one atomic step, so a token can be redeemed once.
  consume(userId: string, jti: string): Promise<string | null> {
    return redis.getdel(key(userId, jti))
  },

  async delete(userId: string, jti: string): Promise<void> {
    await redis.del(key(userId, jti))
  },

  // Reuse detection: revoke every refresh token this user holds.
  async deleteAll(userId: string): Promise<void> {
    let cursor = "0"
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `refresh:${userId}:*`,
        "COUNT",
        100
      )
      if (keys.length > 0) await redis.del(...keys)
      cursor = next
    } while (cursor !== "0")
  },
}
