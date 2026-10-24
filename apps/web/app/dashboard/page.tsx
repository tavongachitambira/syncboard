"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@components/button"
import { getMe, logout, type Session } from "@/features/auth/api"

// Placeholder: proves the session works end to end. Replaced by the real
// dashboard in a later phase.
export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    getMe()
      .then((result) => {
        if (active) setSession(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  if (failed) return <p className="p-6 text-sm">Could not load your session.</p>
  if (session === null) return <p className="p-6 text-sm">Loading…</p>

  return (
    <div className="space-y-4 p-6 text-sm">
      <p>
        Signed in as <strong>{session.user.displayName}</strong> (
        {session.user.role}) in <strong>{session.organization.name}</strong>.
      </p>
      <Button variant="outline" onClick={handleLogout}>
        Sign out
      </Button>
    </div>
  )
}