import type { Metadata } from "next"
import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { Button } from "@components/button"
import { ErrorState } from "@components/error-state"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main id="main" className="grid flex-1 place-content-center p-6">
      <ErrorState
        icon={<SearchXIcon aria-hidden="true" />}
        title="We can't find that page"
        description="The link may be old or mistyped. Check the address, or go back to where you were."
        action={
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
    </main>
  )
}
