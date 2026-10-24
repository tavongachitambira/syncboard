import type {
  LoginInput,
  OrganizationResponse,
  RegisterInput,
  UserResponse,
} from "@workspace/shared"
import { apiFetch } from "@/lib/api"

export type Session = {
  user: UserResponse
  organization: OrganizationResponse
}

export function register(input: RegisterInput): Promise<Session> {
  return apiFetch<Session>("/auth/register", { method: "POST", body: input })
}

export function login(input: LoginInput): Promise<Session> {
  return apiFetch<Session>("/auth/login", { method: "POST", body: input })
}

export function logout(): Promise<Record<string, never>> {
  return apiFetch("/auth/logout", { method: "POST" })
}

export function getMe(): Promise<Session> {
  return apiFetch<Session>("/auth/me")
}