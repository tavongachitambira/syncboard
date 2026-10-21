import { prisma as db } from "../../lib/prisma.js"
import { AppError } from "../../lib/errors.js"
import type { CreateCommentInput, UpdateCommentInput, CommentResponse } from "@workspace/shared"

function toCommentResponse(c: {
  id: string
  incidentId: string
  authorId: string
  content: string
  createdAt: Date
  author: { id: string; displayName: string; avatarUrl: string | null }
}): CommentResponse {
  return {
    id: c.id,
    incidentId: c.incidentId,
    author: {
      id: c.author.id,
      displayName: c.author.displayName,
      avatarUrl: c.author.avatarUrl,
    },
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  }
}

export async function listComments(
  organizationId: string,
  incidentId: string,
): Promise<CommentResponse[]> {
  // Verify incident belongs to this org
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }

  const comments = await db.comment.findMany({
    where: { incidentId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  })
  return comments.map(toCommentResponse)
}

export async function createComment(
  organizationId: string,
  incidentId: string,
  authorId: string,
  input: CreateCommentInput,
): Promise<CommentResponse> {
  const incident = await db.incident.findFirst({
    where: { id: incidentId, organizationId },
  })
  if (incident === null) {
    throw new AppError("INCIDENT_NOT_FOUND", "Incident not found", 404)
  }

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: { incidentId, authorId, content: input.content },
      include: { author: true },
    })
    await tx.activity.create({
      data: {
        incidentId,
        actorId: authorId,
        type: "COMMENT_ADDED",
        payload: { commentId: c.id },
      },
    })
    return c
  })

  return toCommentResponse(comment)
}

export async function updateComment(
  organizationId: string,
  commentId: string,
  actorId: string,
  input: UpdateCommentInput,
): Promise<CommentResponse> {
  const comment = await db.comment.findFirst({
    where: { id: commentId, incident: { organizationId } },
    include: { author: true },
  })
  if (comment === null) {
    throw new AppError("COMMENT_NOT_FOUND", "Comment not found", 404)
  }
  if (comment.authorId !== actorId) {
    throw new AppError("FORBIDDEN", "You can only edit your own comments", 403)
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content: input.content },
    include: { author: true },
  })
  return toCommentResponse(updated)
}

export async function deleteComment(
  organizationId: string,
  commentId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const comment = await db.comment.findFirst({
    where: { id: commentId, incident: { organizationId } },
  })
  if (comment === null) {
    throw new AppError("COMMENT_NOT_FOUND", "Comment not found", 404)
  }

  const isOwner = comment.authorId === actorId
  const isAdmin = actorRole === "ADMIN" || actorRole === "OWNER"

  if (!isOwner && !isAdmin) {
    throw new AppError("FORBIDDEN", "You can only delete your own comments", 403)
  }

  await db.comment.delete({ where: { id: commentId } })
}