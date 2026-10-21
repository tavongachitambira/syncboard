import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose"
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  jwtPayloadSchema,
  type JwtPayload,
  type UserRole,
} from "@workspace/shared"
import { env } from "../env.js"

const ALG = "RS256"

// PEMs live in env with literal \n sequences.
const normalisePem = (pem: string): string => pem.replace(/\\n/g, "\n")

let privateKey: Promise<CryptoKey> | undefined
let publicKey: Promise<CryptoKey> | undefined

function getPrivateKey(): Promise<CryptoKey> {
  privateKey ??= importPKCS8(normalisePem(env.JWT_PRIVATE_KEY), ALG)
  return privateKey
}

function getPublicKey(): Promise<CryptoKey> {
  publicKey ??= importSPKI(normalisePem(env.JWT_PUBLIC_KEY), ALG)
  return publicKey
}

export type TokenPair = {
  accessToken: string
  // Raw opaque value. Only its hash is stored in Redis.
  refreshToken: string
}

export async function issueTokenPair(claims: {
  userId: string
  organizationId: string
  role: UserRole
}): Promise<TokenPair> {
  const accessToken = await new SignJWT({
    organizationId: claims.organizationId,
    role: claims.role,
  })
    .setProtectedHeader({ alg: ALG, kid: env.JWT_KEY_ID })
    .setSubject(claims.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(await getPrivateKey())

  return { accessToken, refreshToken: randomBytes(32).toString("hex") }
}

// Verifies the signature and parses the claims. With allowExpired the token may
// be past exp (but never older than the refresh lifetime): /auth/refresh and
// /auth/logout only need a trustworthy sub and jti from it.
export async function verifyAccessToken(
  token: string,
  options: { allowExpired?: boolean } = {}
): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, await getPublicKey(), {
    algorithms: [ALG],
    clockTolerance: options.allowExpired ? REFRESH_TOKEN_TTL_SECONDS : 0,
  })
  return jwtPayloadSchema.parse(payload)
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex")
  const right = Buffer.from(b, "hex")
  return left.length === right.length && timingSafeEqual(left, right)
}