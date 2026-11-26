import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@components/avatar"
import { Button } from "@components/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@components/card"
import { Kbd, Shortcut } from "@components/kbd"
import { SeverityIcon, StatusIcon, STATUS_LABEL } from "@components/status"
import { HeroBoard } from "@/components/landing/hero-board"
import { Logo } from "@/components/logo"
import { StickyCta } from "@/components/sticky-cta"
import type { IncidentStatus, Severity } from "@workspace/shared"
import { getInitials } from "@workspace/ui/lib/initials"

export const metadata: Metadata = { alternates: { canonical: "/" } }

const SIGN_UP = "/register"
const SIGN_IN = "/login"

/* One CTA, same words and destination top and bottom (and in the phone sticky bar). */
function CtaButtons({ glow = false }: { glow?: boolean }) {
  return (
    <>
      <Button asChild size="lg" className={glow ? "shadow-glow" : undefined}>
        <Link href={SIGN_UP}>Create your workspace</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href={SIGN_IN}>Sign in</Link>
      </Button>
    </>
  )
}

const PROOF = [
  {
    title: "Severity is never just a colour",
    body: "Signal bars and a word carry urgency, so it reads the same for everyone, including colour-blind teammates.",
  },
  {
    title: "Calm until it matters",
    body: "One accent colour. Red is kept for destructive actions, so red always means slow down.",
  },
  {
    title: "Works the way you do",
    body: "Light and dark themes, keyboard-operable controls and reduced-motion support.",
  },
] as const

const PREVIEW_ROWS: ReadonlyArray<{
  title: string
  severity: Severity
  status: IncidentStatus
}> = [
  { title: "Checkout API latency", severity: "CRITICAL", status: "INVESTIGATING" },
  { title: "Webhook deliveries delayed", severity: "HIGH", status: "MITIGATING" },
]

const BENEFITS: ReadonlyArray<{
  title: string
  body: string
  visual: ReactNode
}> = [
  {
    title: "Everyone sees the same incident",
    body: "Severity, status and owner update for the whole team the moment they change, so nobody works from a stale copy.",
    visual: (
      <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-background text-xs">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.title} className="flex items-center gap-2 px-2.5 py-2">
            <SeverityIcon severity={row.severity} />
            <span className="min-w-0 flex-1 truncate">{row.title}</span>
            <StatusIcon status={row.status} />
            <span className="text-muted-foreground">{STATUS_LABEL[row.status]}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "See who is on it",
    body: "Presence shows who has an incident open and what they are editing, so two people never fix the same thing blind.",
    visual: (
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2 text-xs">
        <div className="flex -space-x-1 rtl:space-x-reverse">
          {["Priya Nair", "Amara Okafor"].map((name) => (
            <Avatar key={name} size="sm" className="ring-2 ring-background">
              <AvatarFallback seed={name}>{getInitials(name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-muted-foreground">Amara is editing the summary</span>
      </div>
    ),
  },
  {
    title: "Undo instead of “Are you sure?”",
    body: "Changes apply at once and can be undone for five seconds. Only destructive actions ask for more.",
    visual: (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border-strong bg-popover px-2.5 py-1.5 text-xs shadow-overlay">
        <span>Incident archived</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-link">
          Undo
          <Shortcut keys={["mod", "Z"]} />
        </span>
      </div>
    ),
  },
]

export default function LandingPage() {
  return (
    <>
      {/* -mb-16: the hero starts at the very top so its glow runs behind the header. */}
      <header className="shrink-on-scroll z-(--z-bar) -mb-16 h-16 backdrop-blur-sm">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={SIGN_IN}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="max-md:hidden">
              <Link href={SIGN_UP}>Create your workspace</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero: what it is, who it is for, the one action, and the product itself. */}
        <section
          aria-labelledby="hero-title"
          className="relative isolate overflow-clip pt-16"
        >
          <div
            aria-hidden="true"
            className="parallax pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]"
          >
            <div className="grain relative size-full bg-[image:var(--gradient-ambient)]" />
          </div>
          <div className="grid-12 mx-auto max-w-6xl items-center gap-y-phi-3 px-4 pt-phi-3 pb-phi-4 sm:px-6 lg:pt-phi-4 lg:pb-phi-5">
            <div className="col-span-full flex flex-col lg:col-span-5">
              <h1
                id="hero-title"
                className="text-4xl font-extrabold md:text-5xl lg:text-6xl"
              >
                Run incidents together, in real time.
              </h1>
              <p className="mt-phi-2 max-w-[36ch] text-lg text-muted-foreground">
                SyncBoard keeps the whole on-call team on one incident:
                severity, status, owner and who is looking, updated live.
              </p>
              <div
                id="hero-cta"
                className="mt-phi-3 flex flex-wrap items-center gap-3"
              >
                <CtaButtons glow />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Setup takes four fields: organization, your name, email and
                password.
              </p>
            </div>
            <div className="col-span-full lg:col-span-7">
              <HeroBoard />
            </div>
          </div>
        </section>

        {/* Proof: verifiable facts about the interface, not borrowed credibility. */}
        <section
          aria-labelledby="proof-title"
          className="border-y border-border bg-card"
        >
          <div className="mx-auto max-w-6xl px-4 py-phi-3 sm:px-6 lg:py-phi-4">
            <h2 id="proof-title" className="text-xl font-semibold">
              Built to be read at 3 a.m.
            </h2>
            <ul role="list" className="mt-phi-2 grid gap-phi-2 md:grid-cols-3">
              {PROOF.map((item) => (
                <li key={item.title}>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Problem. */}
        <section
          aria-labelledby="problem-title"
          className="mx-auto max-w-6xl px-4 py-phi-4 sm:px-6 lg:py-phi-5"
        >
          <div className="grid-12 gap-y-phi-2">
            <h2
              id="problem-title"
              className="col-span-full text-3xl font-bold lg:col-span-5 lg:text-4xl"
            >
              Incidents are a team sport played on single-player tools.
            </h2>
            <div className="col-span-full flex flex-col gap-within text-lg text-muted-foreground lg:col-span-6 lg:col-start-7">
              <p>
                Status lives in a chat thread, the timeline in a doc and the
                owner in someone&apos;s head. Two people fix the same thing
                while nobody fixes the other.
              </p>
              <p>
                The first minutes of every incident go to working out what is
                true. SyncBoard keeps that in one place that everyone can see
                change.
              </p>
            </div>
          </div>
        </section>

        {/* Solution: three benefits, each with a piece of the real interface. */}
        <section
          aria-labelledby="solution-title"
          className="mx-auto max-w-6xl px-4 pb-phi-4 sm:px-6 lg:pb-phi-5"
        >
          <h2
            id="solution-title"
            className="max-w-[24ch] text-3xl font-bold lg:text-4xl"
          >
            One live incident, shared by everyone on it.
          </h2>
          <div className="grid-12 mt-phi-3 gap-y-phi-2">
            {BENEFITS.map((benefit) => (
              <Card
                key={benefit.title}
                className="col-span-full lg:col-span-4"
              >
                <div aria-hidden="true" className="px-(--card-spacing)">
                  {benefit.visual}
                </div>
                <CardHeader>
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription>{benefit.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA: the same action again. */}
        <section aria-labelledby="cta-title" className="px-4 pb-phi-4 sm:px-6 lg:pb-phi-5">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-panel border border-border-strong bg-card px-phi-2 py-phi-4 text-center sm:px-phi-4">
            <div
              aria-hidden="true"
              className="grain absolute inset-0 -z-10 bg-[image:var(--gradient-ambient)]"
            />
            <h2
              id="cta-title"
              className="mx-auto max-w-[20ch] text-3xl font-extrabold md:text-4xl"
            >
              Run your next incident together.
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] text-muted-foreground">
              Create a workspace, invite your team and open your first incident.
            </p>
            <div
              id="final-cta"
              className="mt-phi-2 flex flex-wrap items-center justify-center gap-3"
            >
              <CtaButtons glow />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <p className="pointer-coarse:hidden">
            Press <Kbd>D</Kbd> to switch between light and dark.
          </p>
          <nav aria-label="Account" className="flex items-center gap-4">
            <Link
              href={SIGN_IN}
              className="focus-ring rounded-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign in
            </Link>
            <Link
              href={SIGN_UP}
              className="focus-ring rounded-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              Create your workspace
            </Link>
          </nav>
        </div>
      </footer>

      <StickyCta href={SIGN_UP} watch={["hero-cta", "final-cta"]}>
        Create your workspace
      </StickyCta>
    </>
  )
}
