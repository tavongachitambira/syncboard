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
import { useRegisterForm } from "@/features/auth/hooks"

export default function RegisterPage() {
  const { form, onSubmit } = useRegisterForm()
  const { errors, isSubmitting } = form.formState

  return (
    <Card className="m-auto sm:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Create your account
        </CardTitle>
        <CardDescription>
          Set up your organization, invite your team, and start collaborating.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.organizationName !== undefined}>
              <FieldLabel htmlFor="organization-name">
                Organization name
              </FieldLabel>
              <Input
                id="organization-name"
                autoComplete="organization"
                placeholder="Acme Inc"
                aria-invalid={errors.organizationName !== undefined}
                {...form.register("organizationName")}
              />
              <FieldError errors={[errors.organizationName]} />
            </Field>

            <Field data-invalid={errors.displayName !== undefined}>
              <FieldLabel htmlFor="display-name">Your name</FieldLabel>
              <Input
                id="display-name"
                autoComplete="name"
                placeholder="Alex Rivera"
                aria-invalid={errors.displayName !== undefined}
                {...form.register("displayName")}
              />
              <FieldError errors={[errors.displayName]} />
            </Field>

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
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
          form="register-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}