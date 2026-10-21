import type { JwtPayload } from "@workspace/shared"

declare global {
  namespace Express {
    interface Request {
      // Set by the authenticate middleware.
      caller: JwtPayload
    }
  }
}