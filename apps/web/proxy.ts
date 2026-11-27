import { NextResponse, type NextRequest } from "next/server"
import { ACCESS_TOKEN_COOKIE } from "@workspace/shared"

const AUTH_PAGES = new Set(["/login", "/register"])
// Reachable without a session. `/patterns` is the dev-only pattern gallery; the page itself
// 404s in production unless ENABLE_PATTERN_GALLERY=true.
const PUBLIC_PAGES = new Set(["/patterns"])
// Generated metadata images have no file extension, so the matcher below does not skip them.
const PUBLIC_PREFIXES = ["/opengraph-image", "/twitter-image"]

// Optimistic route guard (Next 16 "proxy", formerly middleware). It only checks
// that the access cookie exists. The cookie outlives the 15-minute JWT so the
// client can refresh, which means presence is not proof of a valid session.
// The API verifies every real request.
export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE)
  const { pathname } = request.nextUrl

  const redirectTo = (path: string): NextResponse =>
    NextResponse.redirect(new URL(path, request.url))

  // The landing page is public; people who are already signed in skip straight to the app.
  if (pathname === "/") {
    return hasSession ? redirectTo("/dashboard") : NextResponse.next()
  }

  if (
    PUBLIC_PAGES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }

  if (AUTH_PAGES.has(pathname)) {
    return hasSession ? redirectTo("/dashboard") : NextResponse.next()
  }

  return hasSession ? NextResponse.next() : redirectTo("/login")
}

export const config = {
  // Skip Next internals and any path with a file extension.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
