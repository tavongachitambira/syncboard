import Redis from "ioredis"
import { env } from "../env.js"
import { REFRESH_TTL_S } from "./tokens.js"

export const redis = new Redis(env.REDIS_URL, { lazyConnect: true })

// Key: refresh:{userId}:{tokenId}  value: sha256(rawRefreshToken)
const key = (userId: string, tokenId: string): string =>
  `refresh:${userId}:${tokenId}`

export const refreshTokens = {
  async set(
    userId: string,
    tokenId: string,
    tokenHash: string,
  ): Promise<void> {
    await redis.set(key(userId, tokenId), tokenHash, "EX", REFRESH_TTL_S)
  },

  async get(userId: string, tokenId: string): Promise<string | null> {
    return redis.get(key(userId, tokenId))
  },

  async delete(userId: string, tokenId: string): Promise<void> {
    await redis.del(key(userId, tokenId))
  },

  // Reuse detection response — nuke every session for this user
  async deleteAll(userId: string): Promise<void> {
    const pattern = `refresh:${userId}:*`
    let cursor = "0"
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      )
      if (keys.length > 0) await redis.del(...keys)
      cursor = next
    } while (cursor !== "0")
  },
}