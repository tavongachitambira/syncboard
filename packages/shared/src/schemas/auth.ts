import { z } from "zod"
import { UserRole } from "../types/user.js"

// bcrypt only hashes the first 72 bytes, so longer passwords would silently
// collide on their prefix.
const BCRYPT_MAX_BYTES = 72

// Normalise before validating: z.email() would reject padded input.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email())

const password = z
  .string()
  .min(8)
  .refine(
    (value) => new TextEncoder().encode(value).length <= BCRYPT_MAX_BYTES,
    {
      message: `Password must be at most ${BCRYPT_MAX_BYTES} bytes`,
    }
  )

export const registerSchema = z.object({
  email: emailSchema,
  password,
  displayName: z.string().trim().min(1).max(100),
  organizationName: z.string().trim().min(1).max(100),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  // Not re-validated against the registration rules: login only compares.
  password: z.string().min(1).max(1024),
})
export type LoginInput = z.infer<typeof loginSchema>

// Claims carried in the RS256 access token. apps/api signs them; apps/api and
// apps/socket parse them with this schema after signature verification.
export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  jti: z.uuid(),
  organizationId: z.uuid(),
  role: z.enum(UserRole),
  iat: z.number().int(),
  exp: z.number().int(),
})
export type JwtPayload = z.infer<typeof jwtPayloadSchema>