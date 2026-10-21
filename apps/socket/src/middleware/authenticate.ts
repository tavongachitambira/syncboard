import { parseCookie } from "cookie"
import { errors, importSPKI, jwtVerify } from "jose"
import type { Socket } from "socket.io"
import {
  ACCESS_TOKEN_COOKIE,
  ErrorCode,
  jwtPayloadSchema,
} from "@workspace/shared"
import { env } from "../env.js"

const ALG = "RS256"

let publicKey: Promise<CryptoKey> | undefined
function getPublicKey(): Promise<CryptoKey> {
  publicKey ??= importSPKI(env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"), ALG)
  return publicKey
}

// Socket.IO delivers err.message and err.data to the client's connect_error
// handler. The code in data lets the client decide: TOKEN_EXPIRED means
// refresh via /auth/refresh and reconnect; anything else means sign in again.
function reject(code: ErrorCode, message: string): Error & { data: object } {
  return Object.assign(new Error(message), { data: { code } })
}

// Connection middleware (ADR-03, ADR-02): verifies the access-token cookie sent
// on the handshake with the public key only. No call to apps/api, no store.
export async function authenticate(
  socket: Socket,
  next: (error?: Error) => void
): Promise<void> {
  const header = socket.handshake.headers.cookie
  const token =
    header === undefined ? undefined : parseCookie(header)[ACCESS_TOKEN_COOKIE]

  if (token === undefined || token.length === 0) {
    next(reject(ErrorCode.MISSING_TOKEN, "Authentication required."))
    return
  }

  try {
    const { payload } = await jwtVerify(token, await getPublicKey(), {
      algorithms: [ALG],
    })
    socket.caller = jwtPayloadSchema.parse(payload)
    next()
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      next(reject(ErrorCode.TOKEN_EXPIRED, "Access token expired."))
      return
    }
    next(reject(ErrorCode.INVALID_TOKEN, "Invalid access token."))
  }
}