"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"

import { Button } from "@components/button"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Phone-only primary action pinned to the bottom edge. It slides in once every watched
 * CTA (by element id) has scrolled out of view, and out again when one returns, so it
 * never duplicates a CTA that is already on screen. Its height is reserved by the
 * `body:has([data-sticky-cta])` rule in globals.css, so showing it never shifts content.
 */
export function StickyCta({
  href,
  watch,
  children,
}: {
  href: string
  /** Ids of the elements that already hold the same CTA. */
  watch: readonly string[]
  children: ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const key = watch.join(",")

  useEffect(() => {
    const targets = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    if (targets.length === 0) return

    const inView = new Set<Element>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) inView.add(entry.target)
        else inView.delete(entry.target)
      }
      setVisible(inView.size === 0)
    })
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [key])

  return (
    <div
      data-sticky-cta
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-bar) border-t border-border-strong bg-popover/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-(--duration-enter) ease-(--ease-enter) md:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <Button asChild size="lg" className="w-full">
        <Link href={href}>{children}</Link>
      </Button>
    </div>
  )
}
