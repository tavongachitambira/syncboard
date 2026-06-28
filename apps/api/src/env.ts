import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import { z } from "zod"

for (const path of [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../packages/db/.env"),
]) {
  if (existsSync(path)) {
    config({ path })
  }
}

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // RS256 key pair — store as PEM, use literal \n for newlines in .env
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  // Allowed origin for CORS
  WEB_URL: z.url().default("http://localhost:3000"),
})

console.log("env loaded", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: Boolean(process.env.DATABASE_URL),
  REDIS_URL: Boolean(process.env.REDIS_URL),
  JWT_PRIVATE_KEY: Boolean(process.env.JWT_PRIVATE_KEY),
  JWT_PUBLIC_KEY: Boolean(process.env.JWT_PUBLIC_KEY),
  WEB_URL: process.env.WEB_URL,
})
export const env = schema.parse(process.env)
