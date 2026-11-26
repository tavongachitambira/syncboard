import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Toaster } from "@components/sonner"
import { TooltipProvider } from "@components/tooltip"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { CookieBanner } from "@/components/cookie-banner"
import { ThemeProvider } from "@/components/theme-provider"
import { fontMono, fontSans, fontSansExt } from "@/lib/fonts"

const TITLE = "SyncBoard | Run incidents together, in real time"
const DESCRIPTION =
  "SyncBoard is incident management for teams on call. Everyone works the same incident live: severity, status, owner and who is looking."

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: { default: TITLE, template: "%s | SyncBoard" },
  description: DESCRIPTION,
  applicationName: "SyncBoard",
  openGraph: {
    type: "website",
    siteName: "SyncBoard",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
}

// The hex values are the light / dark canvas tokens; the browser chrome needs a literal.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1214" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSansExt.variable,
        fontSans.variable,
        fontMono.variable
      )}
    >
      <body>
        {/* First stop for keyboard users; every page puts <main id="main"> on its content. */}
        <a
          href="#main"
          className="focus-ring sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-3 focus-visible:top-3 focus-visible:z-(--z-toast) focus-visible:rounded-control focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <TooltipProvider>
            {/* One stacking context for the whole app: z-index never escapes it (Z-Index Mastery). */}
            <div className="isolate flex min-h-svh flex-col">{children}</div>
            <Toaster />
            {/* Only needed once optional (analytics) cookies exist. See .env.example. */}
            {process.env.NEXT_PUBLIC_OPTIONAL_COOKIES === "true" ? (
              <CookieBanner />
            ) : null}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
