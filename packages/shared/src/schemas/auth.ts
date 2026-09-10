import { z } from "zod"

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).trim(),
  organizationName: z.string().min(1).max(100).trim(),
})
export type SignupInput = z.infer<typeof signupSchema>

export const signinSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type SigninInput = z.infer<typeof signinSchema>