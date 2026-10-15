import "dotenv/config"
import { defineConfig } from "prisma/config"

// env() throws when the variable is missing, which would break `prisma
// generate` (it never connects). Read it directly; migrate commands still fail
// with a clear connection error if it is unset.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
})