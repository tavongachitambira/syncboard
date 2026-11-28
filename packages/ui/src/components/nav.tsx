"use client"

import * as React from "react"
import { ChevronRightIcon, EllipsisIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Tip } from "@workspace/ui/components/tooltip"

/*
 * Navigation Patterns: pick by platform and depth, not preference.
 *  - SidebarNav: persistent on desktop (justified by 5+ sections), always visible; it is
 *    only collapsed when the person chooses (`collapsed`), never by default.
 *  - BottomTabs: the mobile primary nav, 3-5 destinations (more are dropped), always visible
 *    in thumb reach, 44px+ targets, safe-area padding. Never a hamburger for primary nav.
 *  - Breadcrumbs: only for hierarchies deeper than two levels (`minDepth`); on a flat
 *    structure they render nothing. On narrow screens the middle collapses to a menu.
 *  - A command palette is an accelerator, never the only path to a feature.
 *  - Pass `as={Link}` (next/link) so navigation is client-side; `current` is the pathname.
 *  - Most important destinations first, the account / settings destinations last (serial
 *    position): the ends are what people remember.
 */

type NavItem = {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: number
  /** Match the href exactly (default: the href or anything beneath it). */
  exact?: boolean
}
type NavSection = { label?: string; items: readonly NavItem[] }
type LinkComponent = React.ElementType

function isCurrent(item: NavItem, current: string) {
  return item.exact
    ? current === item.href
    : current === item.href || current.startsWith(`${item.href}/`)
}

const navLink = [
  "focus-ring-inset relative flex h-8 items-center gap-2 rounded-control px-2 text-sm text-muted-foreground pointer-coarse:h-11",
  "ready:hover:bg-muted ready:hover:text-foreground",
  "aria-[current=page]:bg-selection aria-[current=page]:font-medium aria-[current=page]:text-foreground",
  "aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-1.5 aria-[current=page]:before:start-0 aria-[current=page]:before:w-0.5 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-primary",
  "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
].join(" ")

function SidebarNav({
  sections,
  current,
  as: Link = "a",
  collapsed = false,
  header,
  footer,
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  sections: readonly NavSection[]
  current: string
  as?: LinkComponent
  collapsed?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <nav
      aria-label="Primary"
      data-slot="sidebar-nav"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "flex h-full w-60 shrink-0 flex-col gap-4 border-e border-border bg-card p-2 data-[collapsed=true]:w-14",
        className
      )}
      {...props}
    >
      {header}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {sections.map((section, index) => (
          <div key={section.label ?? index} className="flex flex-col gap-0.5">
            {section.label && !collapsed ? (
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {section.label}
              </p>
            ) : null}
            <ul role="list" className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const link = (
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item, current) ? "page" : undefined}
                    className={navLink}
                  >
                    {item.icon}
                    <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-sm bg-secondary px-1.5 text-2xs leading-4 text-muted-foreground tabular-nums",
                          collapsed && "sr-only"
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tip label={item.label} side="right">
                        {link}
                      </Tip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {footer}
    </nav>
  )
}

function BottomTabs({
  items,
  current,
  as: Link = "a",
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  /** 3-5 top-level destinations; anything past five is dropped. */
  items: readonly NavItem[]
  current: string
  as?: LinkComponent
}) {
  const visible = items.slice(0, 5)
  return (
    <nav
      aria-label="Primary"
      data-slot="bottom-tabs"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-bar) border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden",
        className
      )}
      {...props}
    >
      <ul
        role="list"
        className="grid"
        style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
      >
        {visible.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(item, current) ? "page" : undefined}
              className={cn(
                "focus-ring-inset relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs text-muted-foreground",
                "aria-[current=page]:font-semibold aria-[current=page]:text-foreground",
                "before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full aria-[current=page]:before:bg-primary",
                "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6"
              )}
            >
              {item.icon}
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

type Crumb = { label: string; href?: string }

function Breadcrumbs({
  items,
  as: Link = "a",
  minDepth = 3,
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  items: readonly Crumb[]
  as?: LinkComponent
  /** Below this many levels breadcrumbs are noise and render nothing. */
  minDepth?: number
}) {
  if (items.length < minDepth) return null
  const last = items.length - 1
  const middle = items.slice(1, last)
  const linkClass =
    "focus-ring rounded-sm text-muted-foreground underline-offset-4 ready:hover:text-foreground ready:hover:underline"

  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="breadcrumbs"
      className={cn("min-w-0 text-sm", className)}
      {...props}
    >
      <ol className="flex min-w-0 items-center gap-1.5">
        {items.map((crumb, index) => {
          const isLast = index === last
          const isMiddle = index > 0 && !isLast
          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index === 1 && middle.length > 0 ? (
                <li className="flex items-center gap-1.5 sm:hidden">
                  <ChevronRightIcon aria-hidden="true" className="text-subtle rtl:rotate-180" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label="Show hidden levels">
                        <EllipsisIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {middle.map((hidden) => (
                        <DropdownMenuItem key={hidden.label} asChild>
                          <Link href={hidden.href ?? "#"}>{hidden.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ) : null}
              <li
                className={cn(
                  "flex min-w-0 items-center gap-1.5",
                  isMiddle && "max-sm:hidden"
                )}
              >
                {index > 0 ? (
                  <ChevronRightIcon aria-hidden="true" className="shrink-0 text-subtle rtl:rotate-180" />
                ) : null}
                {isLast || !crumb.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn("truncate", isLast ? "font-medium text-foreground" : "text-muted-foreground")}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className={cn(linkClass, "truncate")}>
                    {crumb.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

/** App header: where you are on the start side, related actions clustered on the end. */
function HeaderCluster({
  start,
  end,
  className,
  ...props
}: Omit<React.ComponentProps<"header">, "children"> & {
  start?: React.ReactNode
  end?: React.ReactNode
}) {
  return (
    <header
      data-slot="header-cluster"
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">{start}</div>
      <div className="flex shrink-0 items-center gap-1.5">{end}</div>
    </header>
  )
}

export { SidebarNav, BottomTabs, Breadcrumbs, HeaderCluster }
export type { NavItem, NavSection, Crumb }
