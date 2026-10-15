import "dotenv/config"
import bcrypt from "bcryptjs"
import { createPrismaClient } from "../src/index.js"

const connectionString = process.env["DATABASE_URL"]
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed")
}

const db = createPrismaClient(connectionString)

const PASSWORD = "password123"
const BCRYPT_COST = 12

const people = [
  { email: "owner@acme.com", displayName: "Alice Owner", role: "OWNER" },
  { email: "admin@acme.com", displayName: "Bob Admin", role: "ADMIN" },
  {
    email: "engineer@acme.com",
    displayName: "Carol Engineer",
    role: "ENGINEER",
  },
  { email: "viewer@acme.com", displayName: "Dave Viewer", role: "VIEWER" },
] as const

async function main(): Promise<void> {
  const org = await db.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Inc", slug: "acme" },
  })

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_COST)

  for (const person of people) {
    await db.user.upsert({
      where: { email: person.email },
      update: {},
      create: { ...person, passwordHash, organizationId: org.id },
    })
  }

  const owner = await db.user.findUniqueOrThrow({
    where: { email: "owner@acme.com" },
  })
  const engineer = await db.user.findUniqueOrThrow({
    where: { email: "engineer@acme.com" },
  })

  const payments = await db.service.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Payments API" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Payments API",
      description: "Handles payment processing",
      ownerId: owner.id,
    },
  })

  const existing = await db.incident.findFirst({
    where: { organizationId: org.id, title: "Payments API timeout" },
  })

  if (!existing) {
    const incident = await db.incident.create({
      data: {
        organizationId: org.id,
        serviceId: payments.id,
        title: "Payments API timeout",
        severity: "CRITICAL",
        status: "INVESTIGATING",
        assignees: { create: [{ userId: engineer.id }] },
        activities: {
          create: [
            {
              actorId: owner.id,
              type: "INCIDENT_CREATED",
              payload: { severity: "CRITICAL" },
            },
            {
              actorId: owner.id,
              type: "ASSIGNED",
              payload: { userId: engineer.id },
            },
          ],
        },
      },
    })
    console.log(`incident: ${incident.title} (${incident.id})`)
  }

  console.log(`seeded org "${org.name}". Test logins (all ${PASSWORD}):`)
  for (const person of people) console.log(`  ${person.email} [${person.role}]`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())