"use client"

import { useState, useSyncExternalStore } from "react"

import { Button } from "@components/button"

const STORAGE_KEY = "syncboard:cookie-consent"
type Choice = "accepted" | "rejected"
// Server and hydration snapshot: render nothing until the stored choice has been read.
type Snapshot = Choice | "unset" | "unknown"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

function readChoice(): Snapshot {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === "accepted" || value === "rejected" ? value : "unset"
  } catch {
    return "unset"
  }
}

/**
 * Consent for OPTIONAL cookies only (the session cookie is strictly necessary and needs none).
 * Accept and Reject are the same size, weight and colour on purpose: declining must be as easy
 * as accepting. Nothing optional may load before the person has chosen.
 * Mounted from the root layout only when NEXT_PUBLIC_OPTIONAL_COOKIES=true.
 */
export function CookieBanner() {
  const stored = useSyncExternalStore<Snapshot>(subscribe, readChoice, () => "unknown")
  // Covers browsers where localStorage is blocked: the banner still closes for this visit.
  const [dismissed, setDismissed] = useState(false)

  if (stored !== "unset" || dismissed) return null

  function choose(choice: Choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice)
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
    } catch {
      // Not persisted; the in-memory flag below still hides the banner.
    }
    setDismissed(true)
  }

  return (
    <section
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-(--z-bar) rounded-card border border-border-strong bg-popover p-4 text-sm text-popover-foreground shadow-overlay sm:start-4 sm:end-auto sm:bottom-4 sm:max-w-sm"
    >
      <p className="font-semibold">Optional cookies</p>
      <p className="mt-1 text-muted-foreground">
        We would like to use optional cookies to see which pages are useful.
        Nothing optional is switched on until you choose.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => choose("rejected")}>
          Reject optional
        </Button>
        <Button variant="outline" onClick={() => choose("accepted")}>
          Accept optional
        </Button>
      </div>
    </section>
  )
}
