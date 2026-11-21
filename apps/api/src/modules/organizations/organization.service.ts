import { prisma as db } from "../../lib/prisma.js"
import { AppError } from "../../lib/errors.js"
import type {
  OrganizationResponse,
  UpdateOrganizationInput,
} from "@workspace/shared"

function toResponse(org: {
  id: string
  name: string
  slug: string
  createdAt: Date
}): OrganizationResponse {
  return { ...org, createdAt: org.createdAt.toISOString() }
}

export async function getOrganization(
  organizationId: string
): Promise<OrganizationResponse> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  })
  if (org === null)
    throw new AppError("ORGANIZATION_NOT_FOUND", "Organization not found", 404)
  return toResponse(org)
}

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<OrganizationResponse> {
  await getOrganization(organizationId)
  return toResponse(
    await db.organization.update({ where: { id: organizationId }, data: input })
  )
}
