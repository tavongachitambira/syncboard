import { Prisma } from "@workspace/db"

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  )
}

// A unique constraint rejected the write (P2002).
export function isUniqueViolation(error: unknown): boolean {
  return hasCode(error, "P2002")
}

// A foreign key blocked the write or delete (P2003).
export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, "P2003")
}
