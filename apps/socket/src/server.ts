import { createServer } from "node:http"
import { createAdapter } from "@socket.io/redis-adapter"
import { Redis } from "ioredis"
import { Server } from "socket.io"
import { env } from "./env.js"
import { logger } from "./lib/logger.js"
import { authenticate } from "./middleware/authenticate.js"
import { enforceExpiry } from "./middleware/enforce-expiry.js"
import { allowRequest } from "./middleware/origin-check.js"

// Anything outside the /socket path (handled by Socket.IO) lands here.
const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "healthy" }))
    return
  }
  res.writeHead(404).end()
})

const io = new Server(httpServer, {
  path: "/socket",
  allowRequest,
  cors: { origin: env.WEB_URL, credentials: true },
})

// The redis adapter needs a publisher and a separate subscriber connection.
const pubClient = new Redis(env.REDIS_URL)
const subClient = pubClient.duplicate()
for (const client of [pubClient, subClient]) {
  client.on("error", (error: Error) => logger.error({ error }, "Redis error"))
}
io.adapter(createAdapter(pubClient, subClient))

// Rejects the handshake before any event handler can run.
io.use(authenticate)

io.on("connection", (socket) => {
  const { sub: userId, organizationId } = socket.caller

  enforceExpiry(socket)
  void socket.join(`organization:${organizationId}`)

  logger.info({ userId, organizationId }, "socket connected")
  socket.on("disconnect", (reason) => {
    logger.info({ userId, reason }, "socket disconnected")
  })
})

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, "shutting down")
  await io.close()
  await Promise.all([pubClient.quit(), subClient.quit()])
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "socket listening")
})