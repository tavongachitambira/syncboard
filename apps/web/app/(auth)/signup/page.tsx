"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import {Button } from "@components/button"
import {apiFetch} from "@/src/lib/api"
import  { UserResponse, OrganizationResponse} from "@workspace/shared"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/field"
import { Input } from "@components/input"
import {signupSchema as formSchema} from "@workspace/shared"

export default function SignupForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "", 
      organizationName: "",
      password: "",
      displayName: "",
    },
  })


  type SignupData = { 
    user: UserResponse, 
    organization: OrganizationResponse
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    
   try{ 
//
    const res = await apiFetch<SignupData>("/auth/signup", { 
      method: "POST", 
      body: JSON.stringify(data)
    })

     if (!res.success) {
       //.........
        return
      }

      // redirect using routes 
   }finally{ 
    // 
   }
  
}

  return (
    <Card className=" m-auto sm:max-w-md">
     <CardHeader>
  <CardTitle className="font-semibold text-lg">Create your account</CardTitle>
  <CardDescription>
    You&apos;re just a few steps away from your new workspace. Create your account
    to set up your organization, invite your team, and start collaborating.
  </CardDescription>
</CardHeader>
      <CardContent>
        <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>

            {/* Organization Name  */}
            <Controller
              name="organizationName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="organization-name">
                   Organization Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="organization-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Organization Name"
                   
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Display Name */}
            <Controller
              name="displayName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="display-name">
                   Display Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="display-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Display Name"
                   
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

              {/* Email  */}
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">
                   Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="org@example.com"
                    
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Password  */}          
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">
                   Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="********"
                    type="password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" form="signup-form" variant="default">
            Submit
          </Button>
        </Field>
      </CardFooter>
    </Card>
  )
}
