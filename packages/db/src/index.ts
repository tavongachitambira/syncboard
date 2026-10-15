import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client.js"

// This package never reads process.env. Each app validates DATABASE_URL at
// startup and builds its own client with this factory.
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
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