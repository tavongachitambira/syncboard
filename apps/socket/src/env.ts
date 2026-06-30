import { config } from "dotenv"
import { resolve } from "path"
import { z } from "zod"

config({ path: resolve(import.meta.dirname, "../.env") })

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_PUBLIC_KEY: z.string().min(1),
  // Allowed origins for Socket.IO CORS
  WEB_URL: z.url().default("http://localhost:3000"),
})

export const env = schema.parse(process.env)