"use client"

import "@workspace/ui/globals.css"
import { Button } from "@components/button"
import { ErrorState } from "@components/error-state"
import { cn } from "@workspace/ui/lib/utils"
import { fontMono, fontSans, fontSansExt } from "@/lib/fonts"

// Last resort: replaces the root layout, so it brings its own <html>, <body> and styles.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        fontSansExt.variable,
        fontSans.variable,
        fontMono.variable
      )}
    >
      <body>
        <main id="main" className="grid min-h-svh place-content-center p-6">
          <ErrorState
            title="SyncBoard hit a problem"
            description="Reload to try again. If it keeps happening, share the reference below with whoever runs your workspace."
            action={<Button onClick={() => unstable_retry()}>Reload</Button>}
            reference={error.digest}
          />
        </main>
      </body>
    </html>
  )
}
