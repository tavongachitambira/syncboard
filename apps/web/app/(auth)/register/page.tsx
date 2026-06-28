"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerSchema } from "@workspace/shared"

import { apiFetch } from "@/src/lib/api"
import type { UserResponse, OrganizationResponse } from "@workspace/shared"

type RegisterData = {
  user: UserResponse
  organization: OrganizationResponse
}

export default function RegisterPage() {
  const router = useRouter()
  const [fields, setFields] = useState({
    email: "",
    password: "",
    displayName: "",
    organizationName: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsed = registerSchema.safeParse(fields)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }

    setPending(true)
    try {
      const res = await apiFetch<RegisterData>("/auth/register", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      })

      if (!res.success) {
        setError(
          res.error.code === "EMAIL_TAKEN"
            ? "An account with that email already exists"
            : res.error.message,
        )
        return
      }

      router.push("/dashboard")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be the owner of your new organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="organizationName" className="text-sm font-medium">
              Organization name
            </label>
            <input
              id="organizationName"
              type="text"
              autoComplete="organization"
              required
              value={fields.organizationName}
              onChange={set("organizationName")}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              value={fields.displayName}
              onChange={set("displayName")}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={fields.email}
              onChange={set("email")}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={fields.password}
              onChange={set("password")}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>

          {error !== null && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}