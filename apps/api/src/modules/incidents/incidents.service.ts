import { prisma as db } from "@workspace/db"
import { AppError } from "../../lib/errors.js"
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  ListIncidentsInput,
  IncidentResponse,
  PaginationMeta,
} from "@workspace/shared"
import type { Prisma } from "@workspace/db"

type IncidentWithAssignees = Prisma.IncidentGetPayload<{
  include: { assignees: { include: { user: true } } }
}>

function toIncidentResponse(i: IncidentWithAssignees): IncidentResponse {
  return {
    id: i.id,
    organizationId: i.organizationId,
    serviceId: i.serviceId,
    title: i.title,
    severity: i.severity as IncidentResponse["severity"],
    status: i.status as IncidentResponse["status"],
    version: i.version,
    assignees: i.assignees.map((a) => ({
      id: a.user.id,
      displayName: a.user.displayName,
      avatarUrl: a.user.avatarUrl,
    })),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    resolvedAt: i.resolvedAt?.toISOString() ?? null,
  }
}

export async function listIncidents(
  organizationId: string,
  input: ListIncidentsInput,
): Promise<{ data: IncidentResponse[]; pagination: PaginationMeta }> {
  const where: Prisma.IncidentWhereInput = { organizationId }
  if (input.status !== undefined) where.status = input.status as never
  if (input.severity !== undefined) where.severity = input.severity as never
  if (input.serviceId !== undefined) where.serviceId = input.serviceId
  if (input.assignee !== undefined) where.assignees = { some: { userId: input.assignee } }
  if (input.q !== undefined) where.title = { contains: input.q, mode: "insensitive" }

  const [total, incidents] = await Promise.all([
    db.incident.count({ where }),
    db.incident.findMany({
      where,
      include: { assignees: { include: { user: true } } },
      orderBy: { [input.sort]: input.order },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ])

  return {
    data: incidents.map(toIncidentResponse),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    },
  }
}

export async function getIncident(
  organizationId: string,
  incidentId: string,
): Promise<IncidentResponse> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
    include: { assignees: { include: { user: true } } },
  })
  if (incident === null) {
    throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found")
  }
  return toIncidentResponse(incident)
}

export async function createIncident(
  organizationId: string,
  creatorId: string,
  input: CreateIncidentInput,
): Promise<IncidentResponse> {
  // Verify service belongs to this org
  const service = await db.service.findFirst({
    where: { id: input.serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found")
  }

  // Verify all assignees are members of this org
  if (input.assignees.length > 0) {
    const members = await db.user.findMany({
      where: { id: { in: input.assignees }, organizationId },
      select: { id: true },
    })
    if (members.length !== input.assignees.length) {
      throw new AppError(400, "INVALID_ASSIGNEE", "One or more assignees are not members of this organization")
    }
  }

  const incident = await db.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: {
        organizationId,
        serviceId: input.serviceId,
        title: input.title,
        severity: input.severity as never,
        assignees: {
          create: input.assignees.map((userId) => ({ userId })),
        },
      },
      include: { assignees: { include: { user: true } } },
    })

    await tx.activity.create({
      data: {
        incidentId: created.id,
        actorId: creatorId,
        type: "INCIDENT_CREATED",
        payload: {
          title: created.title,
          severity: created.severity,
          serviceId: created.serviceId,
        },
      },
    })

    return created
  })

  return toIncidentResponse(incident)
}

export async function updateIncident(
  organizationId: string,
  incidentId: string,
  actorId: string,
  input: UpdateIncidentInput,
): Promise<IncidentResponse> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found")
  }

  // Optimistic concurrency check
  if (input.version !== undefined && incident.version !== input.version) {
    throw new AppError(
      409,
      "VERSION_CONFLICT",
      "Incident was modified by another user. Please refresh and try again.",
    )
  }

  const { version: _version, ...fields } = input

  const activities: { type: string; payload: Record<string, unknown> }[] = []

  if (fields.title !== undefined && fields.title !== incident.title) {
    activities.push({
      type: "TITLE_CHANGED",
      payload: { from: incident.title, to: fields.title },
    })
  }
  if (fields.severity !== undefined && fields.severity !== incident.severity) {
    activities.push({
      type: "SEVERITY_CHANGED",
      payload: { from: incident.severity, to: fields.severity },
    })
  }

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.incident.update({
      where: { id: incidentId },
      data: { ...(fields.title !== undefined && { title: fields.title }), ...(fields.severity !== undefined && { severity: fields.severity as never }), version: { increment: 1 } },
      include: { assignees: { include: { user: true } } },
    })

    if (activities.length > 0) {
      await tx.activity.createMany({
        data: activities.map((a) => ({
          incidentId,
          actorId,
          type: a.type,
          payload: a.payload as Prisma.InputJsonValue,
        })),
      })
    }

    return u
  })

  return toIncidentResponse(updated)
}

export async function resolveIncident(
  organizationId: string,
  incidentId: string,
  actorId: string,
): Promise<IncidentResponse> {
  const incident = await db.incident.findFirst({ where: { id: incidentId, organizationId }, include: { assignees: { include: { user: true } } } })
  if (incident === null) {
    throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found")
  }
  if (incident.status === "RESOLVED") {
    throw new AppError(409, "INCIDENT_ALREADY_RESOLVED", "Incident is already resolved")
  }

  const resolved = await db.$transaction(async (tx) => {
    const u = await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        version: { increment: 1 },
      },
      include: { assignees: { include: { user: true } } },
    })

    await tx.activity.create({
      data: {
        incidentId,
        actorId,
        type: "RESOLVED",
        payload: { resolvedAt: u.resolvedAt?.toISOString() },
      },
    })

    return u
  })

  return toIncidentResponse(resolved)
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function addAssignment(
  organizationId: string,
  incidentId: string,
  actorId: string,
  userId: string,
): Promise<void> {
  const [incident, member] = await Promise.all([
    db.incident.findFirst({ where: { id: incidentId, organizationId } }),
    db.user.findFirst({ where: { id: userId, organizationId } }),
  ])

  if (incident === null) {
    throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found")
  }
  if (member === null) {
    throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found in this organization")
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.incidentAssignee.create({ data: { incidentId, userId } })
      await tx.activity.create({
        data: {
          incidentId,
          actorId,
          type: "ASSIGNED",
          payload: { userId, displayName: member.displayName },
        },
      })
    })
  } catch (err) {
    if (isPrismaError(err, "P2002")) {
      throw new AppError(409, "ALREADY_ASSIGNED", "User is already assigned to this incident")
    }
    throw err
  }
}

export async function removeAssignment(
  organizationId: string,
  incidentId: string,
  actorId: string,
  userId: string,
): Promise<void> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found")
  }

  const assignment = await db.incidentAssignee.findUnique({
    where: { incidentId_userId: { incidentId, userId } },
  })
  if (assignment === null) {
    throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found")
  }

  await db.$transaction(async (tx) => {
    await tx.incidentAssignee.delete({
      where: { incidentId_userId: { incidentId, userId } },
    })
    const member = await tx.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    })
    await tx.activity.create({
      data: {
        incidentId,
        actorId,
        type: "UNASSIGNED",
        payload: { userId, displayName: member?.displayName ?? userId },
      },
    })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>)["code"] === code
  )
}
