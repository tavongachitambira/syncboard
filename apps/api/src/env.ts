import { resolve } from "node:path"
import { config } from "dotenv"
import { z } from "zod"

config({ path: resolve(import.meta.dirname, "../.env"), quiet: true })

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  WEB_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // PEM with literal \n for newlines. Only apps/api holds the private key.
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_KEY_ID: z.string().min(1).default("v1"),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
  process.exit(1)
}

export const env = parsed.data