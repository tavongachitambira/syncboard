/**
 * "Ada Lovelace" -> "AL", "ada" -> "A", "" -> "?".
 * Lives outside avatar.tsx (a client module) so Server Components can call it.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}
