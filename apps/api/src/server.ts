import { app } from "./app.js"
import { env } from "./env.js"
import { logger } from "./lib/logger.js"
import { getDummyHash } from "./lib/password.js"
import { prisma } from "./lib/prisma.js"
import { redis } from "./lib/redis.js"
import { verifyKeyPair } from "./lib/tokens.js"

async function start(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
  await redis.connect()
  // Build the login timing-equalisation hash now, not on the first request.
  await getDummyHash()
  await verifyKeyPair()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening")
  })

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, "shutting down")

    // Don't hang forever on a stuck connection.
    const forceExit = setTimeout(() => {
      logger.error("graceful shutdown timed out, exiting")
      process.exit(1)
    }, 10_000)
    forceExit.unref()

    try {
      // Stop accepting connections and wait for in-flight requests to finish
      // *before* closing the database and Redis they are using. Closing those
      // first (and exiting straight away) cut live requests off mid-response.
      const closed = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
      // A connection that is busy now becomes idle once its response is sent;
      // keep sweeping so keep-alive sockets don't hold shutdown open until
      // their idle timeout.
      const sweep = setInterval(() => server.closeIdleConnections(), 100)
      try {
        await closed
      } finally {
        clearInterval(sweep)
      }
      await prisma.$disconnect()
      await redis.quit()
      process.exit(0)
    } catch (error) {
      logger.error({ error }, "error during shutdown")
      process.exit(1)
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"))
  process.on("SIGINT", () => void shutdown("SIGINT"))
}

start().catch((error: unknown) => {
  logger.fatal({ error }, "failed to start")
  process.exit(1)
})
