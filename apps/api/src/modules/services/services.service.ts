import { prisma as db } from "../../lib/prisma.js"
import { AppError, ConflictError } from "../../lib/errors.js"
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../lib/prisma-errors.js"
import type {
  CreateServiceInput,
  UpdateServiceInput,
  ServiceResponse,
} from "@workspace/shared"

function toServiceResponse(s: {
  id: string
  organizationId: string
  name: string
  description: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}): ServiceResponse {
  return {
    id: s.id,
    organizationId: s.organizationId,
    name: s.name,
    description: s.description,
    ownerId: s.ownerId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export async function listServices(
  organizationId: string
): Promise<ServiceResponse[]> {
  const services = await db.service.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  })
  return services.map(toServiceResponse)
}

const nameTaken = () =>
  new AppError(
    "SERVICE_NAME_TAKEN",
    "A service with that name already exists",
    409
  )

export async function createService(
  organizationId: string,
  ownerId: string,
  input: CreateServiceInput
): Promise<ServiceResponse> {
  const existing = await db.service.findFirst({
    where: { organizationId, name: input.name },
  })
  if (existing !== null) throw nameTaken()

  try {
    const service = await db.service.create({
      data: {
        organizationId,
        ownerId,
        name: input.name,
        description: input.description ?? null,
      },
    })
    return toServiceResponse(service)
  } catch (error) {
    // Two requests can pass the check above at the same time; the unique
    // (organizationId, name) index is what actually decides.
    if (isUniqueViolation(error)) throw nameTaken()
    throw error
  }
}

export async function updateService(
  organizationId: string,
  serviceId: string,
  input: UpdateServiceInput
): Promise<ServiceResponse> {
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError("SERVICE_NOT_FOUND", "Service not found", 404)
  }

  try {
    const updated = await db.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    })
    return toServiceResponse(updated)
  } catch (error) {
    // Renaming onto an existing name hits the unique (organizationId, name)
    // index; that used to surface as a 500.
    if (isUniqueViolation(error)) throw nameTaken()
    throw error
  }
}

export async function deleteService(
  organizationId: string,
  serviceId: string
): Promise<void> {
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError("SERVICE_NOT_FOUND", "Service not found", 404)
  }
  try {
    await db.service.delete({ where: { id: serviceId } })
  } catch (error) {
    // Incident.serviceId is NoAction, so a service that still has incidents
    // cannot be deleted (database-design.md: Service -> Incidents is Restrict).
    if (isForeignKeyViolation(error)) {
      throw new ConflictError(
        "This service still has incidents and cannot be deleted."
      )
    }
    throw error
  }
}
