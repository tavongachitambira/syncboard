import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from '../generated/prisma/client';
import bcrypt from "bcrypt"

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  console.log("seeding...")

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Inc", slug: "acme" },
  })

  console.log(`org: ${org.name} (${org.id})`)

  // ── Users ─────────────────────────────────────────────────────────────────
  const users: {
    email: string
    displayName: string
    role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER"
    password: string
  }[] = [
    {
      email: "owner@acme.com",
      displayName: "Alice Owner",
      role: "OWNER",
      password: "password123",
    },
    {
      email: "admin@acme.com",
      displayName: "Bob Admin",
      role: "ADMIN",
      password: "password123",
    },
    {
      email: "engineer@acme.com",
      displayName: "Carol Engineer",
      role: "ENGINEER",
      password: "password123",
    },
    {
      email: "viewer@acme.com",
      displayName: "Dave Viewer",
      role: "VIEWER",
      password: "password123",
    },
  ]

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organizationId: org.id,
      },
    })
    console.log(`user: ${user.displayName} <${user.email}> [${user.role}]`)
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
done. test credentials:
  owner@acme.com    / password123
  admin@acme.com    / password123
  engineer@acme.com / password123
  viewer@acme.com   / password123
`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
    await pool.end()
  })