import pino from "pino"
import { env } from "../env.js"

export const logger = pino({
  level: env.LOG_LEVEL,
  // The codebase logs errors as { error }, but pino only serializes the
  // `err` key by default, so an Error under `error` was written as {}.
  serializers: { error: pino.stdSerializers.err },
  redact: ["req.headers.cookie", "req.headers.authorization"],
  ...(env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
})
