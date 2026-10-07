import { prisma as db } from "@workspace/db"
import { AppError } from "../../lib/errors.js"
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
  organizationId: string,
): Promise<ServiceResponse[]> {
  const services = await db.service.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  })
  return services.map(toServiceResponse)
}

export async function createService(
  organizationId: string,
  ownerId: string,
  input: CreateServiceInput,
): Promise<ServiceResponse> {
  const existing = await db.service.findFirst({
    where: { organizationId, name: input.name },
  })
  if (existing !== null) {
    throw new AppError(409, "SERVICE_NAME_TAKEN", "A service with that name already exists")
  }

  const service = await db.service.create({
    data: {
      organizationId,
      ownerId,
      name: input.name,
      description: input.description ?? null,
    },
  })
  return toServiceResponse(service)
}

export async function updateService(
  organizationId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<ServiceResponse> {
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found")
  }

  const updated = await db.service.update({
    where: { id: serviceId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  })
  return toServiceResponse(updated)
}

export async function deleteService(
  organizationId: string,
  serviceId: string,
): Promise<void> {
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId },
  })
  if (service === null) {
    throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found")
  }
  await db.service.delete({ where: { id: serviceId } })
}
