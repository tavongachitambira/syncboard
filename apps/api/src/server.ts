import { app } from "./app.js"
import { prisma} from '@workspace/db'
import { redis } from "./lib/redis.js"
import { env } from "./env.js"

const { prisma : db} = prisma; 

async function start(): Promise<void> {
  await redis.connect()

  const server = app.listen(env.PORT, () => {
    console.log(`api listening on :${env.PORT}`)
  })

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received — shutting down`)
    server.close()
    await db.$disconnect()
    await redis.quit()
    process.exit(0)
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})