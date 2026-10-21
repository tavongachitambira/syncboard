import { randomBytes } from "node:crypto"
import { prisma as db } from "../../lib/prisma.js"
import { AppError } from "../../lib/errors.js"
import type { InviteMemberInput, UpdateRoleInput, UserResponse } from "@workspace/shared"

function toUserResponse(user: { id: string; email: string; displayName: string; avatarUrl: string | null; role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER"; organizationId: string; createdAt: Date }): UserResponse {
  return { ...user, createdAt: user.createdAt.toISOString() }
}

export async function listMembers(organizationId: string): Promise<UserResponse[]> {
  return (await db.user.findMany({ where: { organizationId }, orderBy: { displayName: "asc" } })).map(toUserResponse)
}

export async function inviteMember(organizationId: string, input: InviteMemberInput): Promise<{ id: string }> {
  const inviter = await db.user.findFirst({ where: { organizationId }, orderBy: { createdAt: "asc" } })
  if (inviter === null) throw new AppError("ORGANIZATION_NOT_FOUND", "Organization not found", 404)
  return db.invitation.create({ data: { organizationId, email: input.email, role: input.role as never, invitedById: inviter.id, tokenHash: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
}

export async function updateMemberRole(organizationId: string, memberId: string, actorId: string, input: UpdateRoleInput): Promise<UserResponse> {
  if (memberId === actorId) throw new AppError("INVALID_ROLE_CHANGE", "You cannot change your own role", 400)
  const member = await db.user.findFirst({ where: { id: memberId, organizationId } })
  if (member === null) throw new AppError("MEMBER_NOT_FOUND", "Member not found", 404)
  if (member.role === "OWNER") throw new AppError("FORBIDDEN", "The organization owner role cannot be changed", 403)
  return toUserResponse(await db.user.update({ where: { id: memberId }, data: { role: input.role as never } }))
}

export async function removeMember(organizationId: string, memberId: string, actorId: string): Promise<void> {
  if (memberId === actorId) throw new AppError("INVALID_MEMBER_REMOVAL", "You cannot remove yourself", 400)
  const member = await db.user.findFirst({ where: { id: memberId, organizationId } })
  if (member === null) throw new AppError("MEMBER_NOT_FOUND", "Member not found", 404)
  if (member.role === "OWNER") throw new AppError("FORBIDDEN", "The organization owner cannot be removed", 403)
  await db.user.delete({ where: { id: memberId } })
}
