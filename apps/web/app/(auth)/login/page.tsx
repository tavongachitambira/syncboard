"use client"

import Link from "next/link"
import { Button } from "@components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/field"
import { Input } from "@components/input"
import { useLoginForm } from "@/features/auth/hooks"

export default function LoginPage() {
  const { form, onSubmit } = useLoginForm()
  const { errors, isSubmitting } = form.formState

  return (
    <Card className="m-auto sm:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to open your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.email !== undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={errors.email !== undefined}
                {...form.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={errors.password !== undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password !== undefined}
                {...form.register("password")}
              />
              <FieldError errors={[errors.password]} />
            </Field>

            <FieldError errors={[errors.root]} />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          type="submit"
          form="login-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/register"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}