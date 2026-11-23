import { randomUUID } from "node:crypto"
import { compare, hash } from "bcryptjs"

const COST = 12

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST)
}

export function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return compare(plain, hashed)
}

// A real bcrypt hash to compare against when the email is unknown, so login
// takes the same time whether or not the account exists.
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hash(randomUUID(), COST)
  return dummyHash
}
