import { randomBytes } from "node:crypto"
import { Prisma, type Organization, type User } from "@workspace/db"
import {
  ErrorCode,
  type LoginInput,
  type OrganizationResponse,
  type RegisterInput,
  type UserResponse,
} from "@workspace/shared"
import { AuthenticationError, ConflictError } from "../../lib/errors.js"
import {
  getDummyHash,
  hashPassword,
  verifyPassword,
} from "../../lib/password.js"
import { prisma } from "../../lib/prisma.js"
import { refreshTokens } from "../../lib/redis.js"
import {
  hashToken,
  hashesMatch,
  issueTokenPair,
  verifyAccessToken,
} from "../../lib/tokens.js"

export type AuthSession = {
  user: UserResponse
  organization: OrganizationResponse
  accessToken: string
  refreshToken: string
}

const MAX_SLUG_ATTEMPTS = 5

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return slug.length > 0 ? slug : "workspace"
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

function toUserResponse(user: User): UserResponse {
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

function toOrganizationResponse(
  organization: Organization
): OrganizationResponse {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    createdAt: organization.createdAt.toISOString(),
  }
}

// Issues a token pair and registers the refresh token. The jti of the access
// token is the registry key, so refresh and logout can find the entry again.
async function startSession(
  user: User,
  organization: Organization
): Promise<AuthSession> {
  const { accessToken, refreshToken } = await issueTokenPair({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  })

  const { jti } = await verifyAccessToken(accessToken)
  await refreshTokens.set(user.id, jti, hashToken(refreshToken))

  return {
    user: toUserResponse(user),
    organization: toOrganizationResponse(organization),
    accessToken,
    refreshToken,
  }
}

async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  return user !== null
}

function emailTaken(): ConflictError {
  return new ConflictError(
    "That email address is already registered.",
    ErrorCode.EMAIL_TAKEN
  )
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  if (await emailExists(input.email)) throw emailTaken()

  const passwordHash = await hashPassword(input.password)
  const baseSlug = slugify(input.organizationName)

  // A unique violation is either the email (lost a race with another signup)
  // or the slug (same organization name). Re-check the email to tell which,
  // and retry the slug with a random suffix.
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug =
      attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`

    try {
      const { organization, user } = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.organizationName, slug },
        })
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            role: "OWNER",
            organizationId: organization.id,
          },
        })
        return { organization, user }
      })

      return await startSession(user, organization)
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      if (await emailExists(input.email)) throw emailTaken()
    }
  }

  throw new ConflictError("Could not create the workspace. Please try again.")
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organization: true },
  })

  // Always run bcrypt so response time does not reveal whether the email exists.
  const passwordValid = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await getDummyHash())
  )

  if (user === null || !passwordValid) {
    throw new AuthenticationError(
      "Invalid email or password.",
      ErrorCode.INVALID_CREDENTIALS
    )
  }

  return startSession(user, user.organization)
}

// Rotates the refresh token. The access token may be expired but must carry a
// valid signature: its sub and jti locate the registry entry.
export async function refresh(
  rawRefreshToken: string,
  rawAccessToken: string
): Promise<AuthSession> {
  let claims
  try {
    claims = await verifyAccessToken(rawAccessToken, { allowExpired: true })
  } catch {
    throw new AuthenticationError(
      "Invalid access token.",
      ErrorCode.INVALID_TOKEN
    )
  }

  const storedHash = await refreshTokens.consume(claims.sub, claims.jti)

  // Missing means the token was already used or revoked; a mismatch means a
  // forged or stale cookie. Either way, treat it as compromise.
  if (
    storedHash === null ||
    !hashesMatch(storedHash, hashToken(rawRefreshToken))
  ) {
    await refreshTokens.deleteAll(claims.sub)
    throw new AuthenticationError(
      "Refresh token is no longer valid.",
      ErrorCode.REFRESH_TOKEN_REVOKED
    )
  }

  // Role and organization are re-read so changes apply from the next refresh.
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { organization: true },
  })
  if (user === null) throw new AuthenticationError()

  return startSession(user, user.organization)
}

export async function logout(
  rawAccessToken: string | undefined
): Promise<void> {
  if (rawAccessToken === undefined) return

  try {
    const claims = await verifyAccessToken(rawAccessToken, {
      allowExpired: true,
    })
    await refreshTokens.delete(claims.sub, claims.jti)
  } catch {
    // An unreadable token has no registry entry to revoke.
  }
}

export async function getMe(
  userId: string
): Promise<Pick<AuthSession, "user" | "organization">> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  })
  if (user === null) throw new AuthenticationError()

  return {
    user: toUserResponse(user),
    organization: toOrganizationResponse(user.organization),
  }
}