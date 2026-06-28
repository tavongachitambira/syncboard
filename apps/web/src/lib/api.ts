import type { ApiResponse } from "@workspace/shared"

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000"

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const json: unknown = await res.json()
  return json as ApiResponse<T>
}