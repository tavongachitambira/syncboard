import type { IncomingMessage } from "node:http"
import { env } from "../env.js"

const allowedOrigin = new URL(env.WEB_URL).origin

// CORS does not apply to WebSocket handshakes, so the origin is checked here.
// Browsers always send Origin; requests without one cannot be cross-site
// browser requests.
export function allowRequest(
  req: IncomingMessage,
  callback: (error: string | null | undefined, success: boolean) => void
): void {
  const origin = req.headers.origin
  callback(null, origin === undefined || origin === allowedOrigin)
}
