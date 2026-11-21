import type { z } from "zod"
import { ValidationError } from "./errors.js"

// Validates untrusted input and returns the typed result. Used instead of a
// body-mutating middleware so handlers get the parsed type without a cast.
export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown
): z.output<T> {
  const result = schema.safeParse(input)
  if (result.success) return result.data

  const details: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".") || "root"
    details[path] ??= issue.message
  }
  throw new ValidationError(details)
}
