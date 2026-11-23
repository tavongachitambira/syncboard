import type { JwtPayload } from "@workspace/shared"

declare module "socket.io" {
  interface Socket {
    // Verified access-token claims, set by the authenticate middleware.
    caller: JwtPayload
  }
}
