import { app } from "./app.js"
import { env } from "./env.js"
import { logger } from "./lib/logger.js"
import { getDummyHash } from "./lib/password.js"
import { prisma } from "./lib/prisma.js"
import { redis } from "./lib/redis.js"

async function start(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
  await redis.connect()
  // Build the login timing-equalisation hash now, not on the first request.
  await getDummyHash()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening")
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "shutting down")
    server.close()
    await prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"))
  process.on("SIGINT", () => void shutdown("SIGINT"))
}

start().catch((error: unknown) => {
  logger.fatal({ error }, "failed to start")
  process.exit(1)
})