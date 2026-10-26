import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client.js"

// This package never reads process.env. Each app validates DATABASE_URL at
// startup and builds its own client with this factory.
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // A new connection to a remote database can take several seconds (TLS and
      // auth round trips), so allow for that and keep idle connections around
      // instead of paying the cost again after pg's 10s default.
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 5 * 60_000,
    }),
  })
}

export { Prisma, PrismaClient } from "../generated/prisma/client.js"
export type {
  Activity,
  ApiKey,
  Comment,
  Incident,
  IncidentAssignee,
  IncidentDocument,
  Invitation,
  Notification,
  Operation,
  Organization,
  Service,
  User,
} from "../generated/prisma/client.js"