import { prisma as db } from "../../lib/prisma.js"
import { AppError, BusinessError, ConflictError } from "../../lib/errors.js"
import { ErrorCode } from "@workspace/shared"
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  ListIncidentsInput,
  IncidentResponse,
  PaginationMeta,
  ActivityType,
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
  input: ListIncidentsInput
): Promise<{ data: IncidentResponse[]; pagination: PaginationMeta }> {
  const where: Prisma.IncidentWhereInput = { organizationId }
  if (input.status !== undefined) where.status = input.status as never
  if (input.severity !== undefined) where.severity = input.severity as never
  if (input.serviceId !== undefined) where.serviceId = input.serviceId
  if (input.assignee !== undefined)
    where.assignees = { some: { userId: input.assignee } }
  if (input.q !== undefined)
    where.title = { contains: input.q, mode: "insensitive" }

  const [total, incidents] = await Promise.all([
    db.incident.count({ where }),
    db.incident.findMany({
      where,
      include: { assignees: { include: { user: true } } },
      // `severity` has only four distinct values, so ties are the norm; without
      // a unique tiebreaker Postgres may order tied rows differently from one
      // LIMIT/OFFSET page to the next, repeating or skipping incidents.
      orderBy: [{ [input.sort]: input.order }, { id: "asc" }],
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
  incidentId: string
): Promise<IncidentResponse> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
    include: { assignees: { include: { user: true } } },
  })
  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }
  return toIncidentResponse(incident)
}

export async function createIncident(
  organizationId: string,
  creatorId: string,
  input: CreateIncidentInput
): Promise<IncidentResponse> {
  // Verify service belongs to this org
  const service = await db.service.findFirst({
    where: { id: input.serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError("SERVICE_NOT_FOUND", "Service not found", 404)
  }

  // Verify all assignees are members of this org
  if (input.assignees.length > 0) {
    const members = await db.user.findMany({
      where: { id: { in: input.assignees }, organizationId },
      select: { id: true },
    })
    if (members.length !== input.assignees.length) {
      throw new AppError(
        "INVALID_ASSIGNEE",
        "One or more assignees are not members of this organization",
        400
      )
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

const VERSION_CONFLICT_MESSAGE =
  "Incident was modified by another user. Please refresh and try again."

// A conditional write matched nothing. Look at the row again (inside the same
// transaction) to report why: it is gone, already resolved, or changed under us.
async function explainFailedWrite(
  tx: Prisma.TransactionClient,
  organizationId: string,
  incidentId: string,
  resolvedMessage: string
): Promise<AppError> {
  const current = await tx.incident.findFirst({
    where: { id: incidentId, organizationId },
    select: { status: true },
  })
  if (current === null) {
    return new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }
  if (current.status === "RESOLVED") {
    return new BusinessError(
      ErrorCode.INCIDENT_ALREADY_RESOLVED,
      resolvedMessage
    )
  }
  return new ConflictError(VERSION_CONFLICT_MESSAGE)
}

export async function updateIncident(
  organizationId: string,
  incidentId: string,
  actorId: string,
  input: UpdateIncidentInput
): Promise<IncidentResponse> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }
  const resolvedMessage = "A resolved incident cannot be modified."
  if (incident.status === "RESOLVED") {
    throw new BusinessError(
      ErrorCode.INCIDENT_ALREADY_RESOLVED,
      resolvedMessage
    )
  }

  // Optimistic concurrency check: fail fast when the client's copy is stale.
  if (input.version !== undefined && incident.version !== input.version) {
    throw new ConflictError(VERSION_CONFLICT_MESSAGE)
  }

  const { version: _version, ...fields } = input

  const activities: { type: ActivityType; payload: Record<string, unknown> }[] =
    []

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
  if (fields.status !== undefined && fields.status !== incident.status) {
    activities.push({
      type: "STATUS_CHANGED",
      payload: { from: incident.status, to: fields.status },
    })
  }

  const updated = await db.$transaction(async (tx) => {
    // The check above is only an early exit. Two requests holding the same
    // version can both pass it, so the write itself must be the compare-and-set:
    // matching on `version` (and "not resolved") means the second UPDATE finds
    // nothing once the first has committed, instead of overwriting it.
    const { count } = await tx.incident.updateMany({
      where: {
        id: incidentId,
        organizationId,
        version: incident.version,
        status: { not: "RESOLVED" },
      },
      data: {
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.severity !== undefined && { severity: fields.severity }),
        ...(fields.status !== undefined && { status: fields.status }),
        version: { increment: 1 },
      },
    })
    if (count === 0) {
      throw await explainFailedWrite(
        tx,
        organizationId,
        incidentId,
        resolvedMessage
      )
    }

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

    return tx.incident.findUniqueOrThrow({
      where: { id: incidentId },
      include: { assignees: { include: { user: true } } },
    })
  })

  return toIncidentResponse(updated)
}

export async function resolveIncident(
  organizationId: string,
  incidentId: string,
  actorId: string
): Promise<IncidentResponse> {
  const resolved = await db.$transaction(async (tx) => {
    // Resolve with a conditional write so that two concurrent requests cannot
    // both succeed (which recorded two RESOLVED activities and overwrote
    // resolvedAt); the loser matches no row and is reported as already resolved.
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, organizationId, status: { not: "RESOLVED" } },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        version: { increment: 1 },
      },
    })
    if (count === 0) {
      throw await explainFailedWrite(
        tx,
        organizationId,
        incidentId,
        "Incident is already resolved."
      )
    }

    const u = await tx.incident.findUniqueOrThrow({
      where: { id: incidentId },
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
  userId: string
): Promise<void> {
  const [incident, member] = await Promise.all([
    db.incident.findFirst({ where: { id: incidentId, organizationId } }),
    db.user.findFirst({ where: { id: userId, organizationId } }),
  ])

  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }
  if (member === null) {
    throw new AppError(
      "MEMBER_NOT_FOUND",
      "Member not found in this organization",
      404
    )
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
      throw new AppError(
        "ALREADY_ASSIGNED",
        "User is already assigned to this incident",
        409
      )
    }
    throw err
  }
}

export async function removeAssignment(
  organizationId: string,
  incidentId: string,
  actorId: string,
  userId: string
): Promise<void> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }

  const assignment = await db.incidentAssignee.findUnique({
    where: { incidentId_userId: { incidentId, userId } },
  })
  if (assignment === null) {
    throw new AppError("ASSIGNMENT_NOT_FOUND", "Assignment not found", 404)
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
