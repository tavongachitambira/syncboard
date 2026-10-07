import { prisma as db } from "@workspace/db"
import { refreshTokens } from "../../lib/redis.js"
import { hashPassword, verifyPassword } from "../../lib/password.js"
import {
  issueTokenPair,
  decodeAccessToken,
  hashToken,
} from "../../lib/tokens.js"
import { AppError } from "../../lib/errors.js"
import type {
  SignupInput,
  SigninInput,
  UserResponse,
  OrganizationResponse,
  UserRole,
} from "@workspace/shared"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

type AuthResult = {
  user: UserResponse
  organization: OrganizationResponse
  accessToken: string
  refreshToken: string
}

export async function register(input: SignupInput): Promise<AuthResult> {
  const existing = await db.user.findUnique({ where: { email: input.email } })
  if (existing !== null) {
    throw new AppError(409, "EMAIL_TAKEN", "That email address is already in use")
  }

  const baseSlug = slugify(input.organizationName)
  let slug = baseSlug
  let suffix = 1
  while ((await db.organization.findUnique({ where: { slug } })) !== null) {
    slug = `${baseSlug}-${suffix++}`
  }

  const passwordHash = await hashPassword(input.password)

  let user: Awaited<ReturnType<typeof db.user.create>>
  let organization: Awaited<ReturnType<typeof db.organization.create>>

  try {
    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName, slug },
      })
      const usr = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          role: "OWNER",
          organizationId: org.id,
        },
      })
      return { user: usr, organization: org }
    })
    user = result.user
    organization = result.organization
  } catch (err) {
    // P2002 = unique constraint — slug collision from a race; tell the caller to retry
    if (isPrismaError(err, "P2002")) {
      throw new AppError(409, "SLUG_CONFLICT", "Organization name taken, please try another")
    }
    throw err
  }

  const { accessToken, refreshToken, tokenId } = await issueTokenPair({
    userId: user.id,
    organizationId: organization.id,
    role: "OWNER",
  })

  await refreshTokens.set(user.id, tokenId, hashToken(refreshToken))

  return {
    user: toUserResponse(user, "OWNER", organization.id),
    organization: toOrgResponse(organization),
    accessToken,
    refreshToken,
  }
}

export async function login(input: SigninInput): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { email: input.email } })

  // Always run bcrypt to prevent timing-based user enumeration
  const validPassword = await verifyPassword(
    input.password,
    user?.passwordHash ?? "$2b$12$placeholder.hash.that.never.matches",
  )

  if (user === null || !validPassword) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  })

  const { accessToken, refreshToken, tokenId } = await issueTokenPair({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as UserRole,
  })

  await refreshTokens.set(user.id, tokenId, hashToken(refreshToken))

  return {
    user: toUserResponse(user, user.role as UserRole, user.organizationId),
    organization: toOrgResponse(organization),
    accessToken,
    refreshToken,
  }
}

export async function refresh(
  rawRefreshToken: string,
  rawAccessToken: string,
): Promise<Pick<AuthResult, "accessToken" | "refreshToken">> {
  const { sub: userId, jti: tokenId } = decodeAccessToken(rawAccessToken)

  if (typeof userId !== "string" || typeof tokenId !== "string") {
    throw new AppError(401, "INVALID_TOKEN", "Malformed token")
  }

  const storedHash = await refreshTokens.get(userId, tokenId)

  if (storedHash === null) {
    // Token not in Redis — already rotated. Treat as compromise.
    await refreshTokens.deleteAll(userId)
    throw new AppError(401, "TOKEN_REUSED", "Session invalidated due to token reuse")
  }

  if (storedHash !== hashToken(rawRefreshToken)) {
    await refreshTokens.deleteAll(userId)
    throw new AppError(401, "INVALID_TOKEN", "Refresh token is invalid")
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } })

  await refreshTokens.delete(userId, tokenId)

  const {
    accessToken,
    refreshToken: newRefreshToken,
    tokenId: newTokenId,
  } = await issueTokenPair({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as UserRole,
  })

  await refreshTokens.set(user.id, newTokenId, hashToken(newRefreshToken))

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logout(rawAccessToken: string): Promise<void> {
  const { sub: userId, jti: tokenId } = decodeAccessToken(rawAccessToken)
  if (typeof userId === "string" && typeof tokenId === "string") {
    await refreshTokens.delete(userId, tokenId)
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await refreshTokens.deleteAll(userId)
}

export async function getMe(
  userId: string,
): Promise<Omit<AuthResult, "accessToken" | "refreshToken">> {
  const user = await db.user.findUnique({ where: { id: userId } })

  // Valid JWT but user no longer exists (e.g. account deleted)
  if (user === null) {
    throw new AppError(401, "USER_NOT_FOUND", "User no longer exists")
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  })

  return {
    user: toUserResponse(user, user.role as UserRole, user.organizationId),
    organization: toOrgResponse(organization),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>)["code"] === code
  )
}

function toUserResponse(
  user: {
    id: string
    email: string
    displayName: string
    avatarUrl: string | null
    createdAt: Date
  },
  role: UserRole,
  organizationId: string,
): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role,
    organizationId,
    createdAt: user.createdAt.toISOString(),
  }
}

function toOrgResponse(org: {
  id: string
  name: string
  slug: string
  createdAt: Date
}): OrganizationResponse {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt.toISOString(),
  }
}
