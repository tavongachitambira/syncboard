import type { Socket } from "socket.io"
import { SocketEvents } from "@workspace/shared"

// The handshake proves the token was valid once; this keeps the connection from
// outliving it (ADR-02). It compares exp from the verified claims against the
// clock, with no Redis or database call.
//
// Two layers: a timer closes an idle connection at exp, and a per-event guard
// covers any timer drift. In both cases the client gets auth.expired, refreshes
// through /auth/refresh and reconnects with the new cookie.
export function enforceExpiry(socket: Socket): void {
  const expiresAt = socket.caller.exp * 1000

  const expire = (): void => {
    socket.emit(SocketEvents.AUTH_EXPIRED)
    socket.disconnect(true)
  }

  const timer = setTimeout(expire, Math.max(expiresAt - Date.now(), 0))
  socket.once("disconnect", () => clearTimeout(timer))

  // Runs for every inbound event before its handler.
  socket.use((_packet, next) => {
    if (Date.now() >= expiresAt) {
      expire()
      return
    }
    next()
  })
}
