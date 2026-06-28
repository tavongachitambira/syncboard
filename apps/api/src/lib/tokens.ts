import {
  SignJWT,
  jwtVerify,
  decodeJwt,
  importPKCS8,
  importSPKI,
} from "jose"
import { randomBytes, createHash, randomUUID } from "node:crypto"
import { env } from "../env.js"
import type { JwtPayload, UserRole } from "@workspace/shared"

const ALG = "RS256"
export const ACCESS_TTL_S = 60 * 15 // 15 min
export const REFRESH_TTL_S = 60 * 60 * 24 * 7 // 7 days

// Keys imported once per process and cached
let _privateKey: CryptoKey | undefined
let _publicKey: CryptoKey | undefined

// PEMs stored with literal \n in env — replace before importing
function normalisePem(pem: string): string {
  return pem.replace(/\\n/g, "\n")
}

async function getPrivateKey(): Promise<CryptoKey> {
  _privateKey ??= await importPKCS8(normalisePem(env.JWT_PRIVATE_KEY), ALG)
  return _privateKey
}

async function getPublicKey(): Promise<CryptoKey> {
  _publicKey ??= await importSPKI(normalisePem(env.JWT_PUBLIC_KEY), ALG)
  return _publicKey
}

export type TokenPair = {
  accessToken: string
  refreshToken: string // raw opaque value — set as HttpOnly cookie
  tokenId: string // jti — used as Redis key suffix
}

export async function issueTokenPair(claims: {
  userId: string
  organizationId: string
  role: UserRole
}): Promise<TokenPair> {
  const tokenId = randomUUID()

  const accessToken = await new SignJWT({
    organizationId: claims.organizationId,
    role: claims.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.userId)
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_S}s`)
    .sign(await getPrivateKey())

  const refreshToken = randomBytes(32).toString("hex")

  return { accessToken, refreshToken, tokenId }
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, await getPublicKey(), {
    algorithms: [ALG],
  })
  return payload as unknown as JwtPayload
}

// Decodes without verification — used during refresh/logout when the
// access token may already be expired but we still need sub + jti.
export function decodeAccessToken(token: string): Partial<JwtPayload> {
  return decodeJwt(token) as unknown as Partial<JwtPayload>
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}