import { resolve } from "node:path"
import { config } from "dotenv"
import { z } from "zod"

config({ path: resolve(import.meta.dirname, "../.env"), quiet: true })

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  WEB_URL: z.url().default("http://localhost:3000"),
  REDIS_URL: z.url(),
  // PEM with literal \n for newlines. Verification only; no private key here.
  JWT_PUBLIC_KEY: z.string().min(1),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
  process.exit(1)
}

export const env = parsed.data