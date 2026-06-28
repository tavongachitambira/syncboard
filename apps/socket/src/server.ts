import { createServer } from "node:http"
import { Server } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { Redis } from "ioredis"
import { env } from "./env.js"
import { authenticate } from "./middleware/authenticate.js"

const httpServer = createServer()

const io = new Server(httpServer, {
  path: "/socket",
  cors: {
    origin: env.WEB_URL,
    credentials: true,
  },
})

// Redis adapter — two connections required by socket.io/redis-adapter
const pubClient = new Redis(env.REDIS_URL)
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))

// Auth on every connection — rejected before any event handler runs
io.use(authenticate)

io.on("connection", (socket) => {
  const { sub: userId, organizationId } = socket.caller

  // Every authed socket joins its org room immediately
  socket.join(`organization:${organizationId}`)

  console.log(`socket connected uid=${userId} org=${organizationId}`)

  socket.on("disconnect", () => {
    console.log(`socket disconnected uid=${userId}`)
  })
})

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received — shutting down`)
  await Promise.all([pubClient.quit(), subClient.quit()])
  httpServer.close(() => process.exit(0))
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

httpServer.listen(env.PORT, () => {
  console.log(`socket listening on :${env.PORT}`)
})