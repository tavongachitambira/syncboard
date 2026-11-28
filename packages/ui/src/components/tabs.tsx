"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { useScrollEdges } from "@workspace/ui/hooks/use-scroll-edges"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

/*
 * Tabs System.
 *  - The active underline SLIDES between tabs (spring ease, 240ms) instead of teleporting;
 *    it is measured, so it follows any tab width, font load and resize.
 *  - An overflowing row scrolls horizontally, never wraps: edge fades show what is off
 *    screen and desktop chevrons scroll it (hidden on touch, where you swipe).
 *  - The focus ring (teal, 2px) and the active state (foreground text + underline) use
 *    different treatments, so keyboard users can tell focus from selection.
 *  - Arrow keys move, Home / End jump, Tab leaves the group (Radix roving focus).
 *  - Content: the new panel waits ~80ms, then fades in. Match panel heights so nothing
 *    shifts. (Deviation: the old panel unmounts instead of fading out, so panels that load
 *    data do not keep running while hidden.)
 *  - Mobile: do NOT shrink this bar. Fewer than 5 tabs -> `variant="segmented"`; more than 5
 *    -> `TabsMobilePicker` (a bottom sheet). Switch with `useMediaQuery`.
 */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
}

function ScrollButton({
  direction,
  onScroll,
}: {
  direction: "start" | "end"
  onScroll: (direction: "start" | "end") => void
}) {
  const Icon = direction === "start" ? ChevronLeftIcon : ChevronRightIcon
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      tabIndex={-1}
      aria-label={direction === "start" ? "Scroll tabs back" : "Scroll tabs forward"}
      onClick={() => onScroll(direction)}
      className={cn(
        "absolute top-1/2 z-1 -translate-y-1/2 bg-background pointer-coarse:hidden",
        direction === "start" ? "start-0" : "end-0"
      )}
    >
      <Icon className="rtl:rotate-180" />
    </Button>
  )
}

function TabsList({
  className,
  children,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "line" | "segmented"
}) {
  const {
    ref: scrollerRef,
    start: canScrollStart,
    end: canScrollEnd,
  } = useScrollEdges<HTMLDivElement>()
  const list = React.useRef<HTMLDivElement>(null)

  // Chevrons (desktop): scroll by 60% of the visible width, mirrored in RTL.
  function scrollTabs(direction: "start" | "end") {
    const element = scrollerRef.current
    if (!element) return
    const rtl = getComputedStyle(element).direction === "rtl"
    const sign = (direction === "start" ? -1 : 1) * (rtl ? -1 : 1)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    element.scrollBy({
      left: sign * element.clientWidth * 0.6,
      behavior: reduced ? "auto" : "smooth",
    })
  }

  // Measure the active tab so the underline can slide to it (physical px: the indicator is
  // positioned with `left`, and offsetLeft is physical in both directions).
  React.useLayoutEffect(() => {
    const element = list.current
    if (!element || variant !== "line") return
    const measure = () => {
      const active = element.querySelector<HTMLElement>(
        '[role="tab"][data-state="active"]'
      )
      element.style.setProperty("--tab-x", `${active?.offsetLeft ?? 0}px`)
      element.style.setProperty("--tab-w", `${active?.offsetWidth ?? 0}px`)
    }
    measure()
    // No slide on the first paint, only on later changes.
    const frame = requestAnimationFrame(() => {
      element.dataset.ready = "true"
    })
    const mutation = new MutationObserver(measure)
    mutation.observe(element, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
      childList: true,
    })
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      mutation.disconnect()
      resize.disconnect()
    }
  }, [variant])

  const fade =
    "pointer-events-none absolute inset-y-0 z-1 w-8 opacity-0 transition-opacity duration-(--duration-fast) data-[visible=true]:opacity-100"

  return (
    <div data-slot="tabs-frame" className="relative min-w-0">
      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsPrimitive.List
          ref={list}
          data-slot="tabs-list"
          data-variant={variant}
          className={cn(
            "group/tabs-list relative inline-flex min-w-full items-center",
            variant === "line" && "gap-1 border-b border-border",
            variant === "segmented" &&
              "w-full gap-0.5 rounded-control bg-secondary p-0.5",
            className
          )}
          {...props}
        >
          {children}
          {variant === "line" ? (
            <span
              aria-hidden="true"
              data-slot="tabs-indicator"
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground group-data-[ready=true]/tabs-list:transition-[transform,width] group-data-[ready=true]/tabs-list:duration-(--duration-enter) group-data-[ready=true]/tabs-list:ease-(--ease-spring)"
              style={{
                width: "var(--tab-w, 0px)",
                transform: "translateX(var(--tab-x, 0px))",
              }}
            />
          ) : null}
        </TabsPrimitive.List>
      </div>
      <span
        aria-hidden="true"
        data-visible={canScrollStart ? "true" : "false"}
        className={cn(fade, "start-0 bg-linear-to-r from-background to-transparent rtl:bg-linear-to-l")}
      />
      <span
        aria-hidden="true"
        data-visible={canScrollEnd ? "true" : "false"}
        className={cn(fade, "end-0 bg-linear-to-l from-background to-transparent rtl:bg-linear-to-r")}
      />
      {canScrollStart ? <ScrollButton direction="start" onScroll={scrollTabs} /> : null}
      {canScrollEnd ? <ScrollButton direction="end" onScroll={scrollTabs} /> : null}
    </div>
  )
}

function TabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  /** Optional count badge ("Open 12"). */
  count?: number
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-ring relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium whitespace-nowrap text-muted-foreground pointer-coarse:h-11",
        "ready:hover:text-foreground data-[state=active]:text-foreground",
        "group-data-[variant=segmented]/tabs-list:flex-1 group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-card group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-border-strong",
        "group-data-[variant=line]/tabs-list:rounded-b-none",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span className="rounded-sm bg-secondary px-1.5 text-2xs leading-4 text-muted-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "focus-ring flex-1 rounded-control",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:delay-[80ms] data-[state=active]:duration-(--duration-base) data-[state=active]:[animation-fill-mode:backwards]",
        className
      )}
      {...props}
    />
  )
}

type MobileTab = { value: string; label: string; count?: number }

/** More than 5 tabs on a phone: show the current one and pick from a bottom sheet. */
function TabsMobilePicker({
  tabs,
  value,
  onValueChange,
  label = "Section",
  className,
}: {
  tabs: readonly MobileTab[]
  value: string
  onValueChange: (value: string) => void
  label?: string
  className?: string
}) {
  const current = tabs.find((tab) => tab.value === value)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${label}: ${current?.label ?? ""}. Change`}
          className={cn("w-full justify-between", className)}
        >
          {current?.label ?? label}
          <ChevronDownIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <ul role="list" className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {tabs.map((tab) => (
            <li key={tab.value}>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-current={tab.value === value ? "true" : undefined}
                  onClick={() => onValueChange(tab.value)}
                  className="focus-ring-inset flex min-h-11 w-full items-center gap-3 rounded-item px-3 text-start text-sm aria-[current=true]:bg-accent aria-[current=true]:font-medium"
                >
                  <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                  {tab.count !== undefined ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tab.count}
                    </span>
                  ) : null}
                  {tab.value === value ? <CheckIcon /> : null}
                </button>
              </SheetClose>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsMobilePicker }
