"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { signupSchema } from "@workspace/shared"
import type { z } from "zod"

export function useAuthForm() {
  return useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      organizationName: "",
    },
  })
}
