import { randomBytes } from "node:crypto"
import { prisma as db } from "../../lib/prisma.js"
import { AppError, ConflictError } from "../../lib/errors.js"
import { isForeignKeyViolation } from "../../lib/prisma-errors.js"
import type { Prisma } from "@workspace/db"
import type {
  InviteMemberInput,
  UpdateRoleInput,
  UserResponse,
} from "@workspace/shared"

// Only these columns are ever read for API responses, so password hashes never
// leave the database layer.
const memberSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  organizationId: true,
  createdAt: true,
} satisfies Prisma.UserSelect

function toUserResponse(user: {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER"
  organizationId: string
  createdAt: Date
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationId: user.organizationId,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function listMembers(
  organizationId: string
): Promise<UserResponse[]> {
  return (
    await db.user.findMany({
      where: { organizationId },
      select: memberSelect,
      orderBy: { displayName: "asc" },
    })
  ).map(toUserResponse)
}

export async function inviteMember(
  organizationId: string,
  invitedById: string,
  input: InviteMemberInput
): Promise<{ id: string }> {
  return db.invitation.create({
    data: {
      organizationId,
      email: input.email,
      role: input.role,
      invitedById,
      tokenHash: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  })
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  actorId: string,
  input: UpdateRoleInput
): Promise<UserResponse> {
  if (memberId === actorId)
    throw new AppError(
      "INVALID_ROLE_CHANGE",
      "You cannot change your own role",
      400
    )
  const member = await db.user.findFirst({
    where: { id: memberId, organizationId },
  })
  if (member === null)
    throw new AppError("MEMBER_NOT_FOUND", "Member not found", 404)
  if (member.role === "OWNER")
    throw new AppError(
      "FORBIDDEN",
      "The organization owner role cannot be changed",
      403
    )
  return toUserResponse(
    await db.user.update({
      where: { id: memberId },
      data: { role: input.role },
      select: memberSelect,
    })
  )
}

export async function removeMember(
  organizationId: string,
  memberId: string,
  actorId: string
): Promise<void> {
  if (memberId === actorId)
    throw new AppError(
      "INVALID_MEMBER_REMOVAL",
      "You cannot remove yourself",
      400
    )
  const member = await db.user.findFirst({
    where: { id: memberId, organizationId },
  })
  if (member === null)
    throw new AppError("MEMBER_NOT_FOUND", "Member not found", 404)
  if (member.role === "OWNER")
    throw new AppError(
      "FORBIDDEN",
      "The organization owner cannot be removed",
      403
    )
  try {
    await db.user.delete({ where: { id: memberId } })
  } catch (error) {
    // Services, comments, activities and operations reference their author with
    // NoAction, so a member with history on record cannot be deleted.
    if (isForeignKeyViolation(error)) {
      throw new ConflictError(
        "This member still owns services or has activity on record and cannot be removed."
      )
    }
    throw error
  }
}
