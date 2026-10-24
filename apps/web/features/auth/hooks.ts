"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import {
  useForm,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form"
import type { z } from "zod"
import {
  ErrorCode,
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@workspace/shared"
import { ApiError } from "@/lib/api"
import { login, register } from "./api"

const HOME = "/dashboard"

type RegisterValues = z.input<typeof registerSchema>
type LoginValues = z.input<typeof loginSchema>

const REGISTER_FIELDS = [
  "organizationName",
  "displayName",
  "email",
  "password",
] as const satisfies readonly FieldPath<RegisterValues>[]

const LOGIN_FIELDS = [
  "email",
  "password",
] as const satisfies readonly FieldPath<LoginValues>[]

// Puts an API error where the user can see it: on the matching field when the
// server names one, otherwise as a form-level message.
function applyApiError<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly FieldPath<T>[],
  error: unknown
): void {
  if (!(error instanceof ApiError)) {
    setError("root", {
      message: "Could not reach the server. Please try again.",
    })
    return
  }

  const byField: Record<string, string> =
    error.code === ErrorCode.EMAIL_TAKEN
      ? { email: error.message }
      : (error.details ?? {})

  let matched = false
  for (const field of fields) {
    const message = byField[field]
    if (message !== undefined) {
      setError(field, { message })
      matched = true
    }
  }

  if (!matched) setError("root", { message: error.message })
}

export function useRegisterForm() {
  const router = useRouter()
  const form = useForm<RegisterValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      displayName: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root")
    try {
      await register(values)
      router.replace(HOME)
    } catch (error) {
      applyApiError(form.setError, REGISTER_FIELDS, error)
    }
  })

  return { form, onSubmit }
}

export function useLoginForm() {
  const router = useRouter()
  const form = useForm<LoginValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root")
    try {
      await login(values)
      router.replace(HOME)
    } catch (error) {
      applyApiError(form.setError, LOGIN_FIELDS, error)
    }
  })

  return { form, onSubmit }
}