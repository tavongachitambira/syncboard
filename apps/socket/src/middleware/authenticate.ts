import {parseCookie} from "cookie"
import { jwtVerify, importSPKI } from "jose"
import { env } from "../env.js"
import type { JwtPayload } from "@workspace/shared"
import type { Socket } from "socket.io"

const ALG = "RS256"
let _publicKey: CryptoKey | undefined

async function getPublicKey(): Promise<CryptoKey> {
  _publicKey ??= await importSPKI(
    env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),
    ALG,
  )
  return _publicKey
}

// Augment Socket so event handlers can access caller without casting
declare module "socket.io" {
  interface Socket {
    caller: JwtPayload
  }
}

export async function authenticate(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const cookieHeader = socket.handshake.headers.cookie

  if (!cookieHeader) {
    next(new Error("MISSING_TOKEN"))
    return
  }

  const cookies = parseCookie(cookieHeader)
  const token = cookies["access_token"]

  if (!token) {
    next(new Error("MISSING_TOKEN"))
    return
  }

  try {
    const { payload } = await jwtVerify(token, await getPublicKey(), {
      algorithms: [ALG],
    })
    socket.caller = payload as unknown as JwtPayload
    next()
  } catch {
    next(new Error("ACCESS_TOKEN_EXPIRED"))
  }
}