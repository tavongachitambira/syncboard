"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@components/button"
import { ErrorState } from "@components/error-state"

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="grid flex-1 place-content-center p-6">
      <ErrorState
        title="We couldn't load this page"
        description="Try again. If it keeps happening, share the reference below with whoever runs your workspace."
        action={<Button onClick={() => unstable_retry()}>Try again</Button>}
        secondaryAction={
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
        reference={error.digest}
      />
    </main>
  )
}
