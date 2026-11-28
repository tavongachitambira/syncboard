"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { Button, type ButtonProps } from "@workspace/ui/components/button"

/*
 * AlertDialog = a confirmation that must be answered (no outside-click dismiss, no close X).
 *
 * Destructive Actions:
 *  - name the action with verb + object on the button ("Delete service" beside
 *    "Keep service"); never a generic "Are you sure?" / "OK";
 *  - focus starts on the safe button (Radix focuses Cancel);
 *  - with `tone="destructive"` the destructive button is NOT where the confirm button
 *    normally sits: the safe action takes the primary spot on the end, the soft-red action
 *    moves to the start (visual order only, so Tab still reaches the safe action first);
 *  - red is the soft `destructive` button; solid red is reserved for the final step of an
 *    irreversible flow (see danger-zone.tsx);
 *  - if the action can be undone, skip this dialog and use `undoToast` instead.
 */

type Tone = "default" | "destructive"
const ToneContext = React.createContext<Tone>("default")

function AlertDialog(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Root>
) {
  return <AlertDialogPrimitive.Root {...props} />
}

function AlertDialogTrigger(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>
) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "scrim fixed inset-0 z-(--z-scrim)",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-(--duration-enter)",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-(--duration-exit)",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  tone?: Tone
}) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />
      <ToneContext.Provider value={tone}>
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          data-tone={tone}
          className={cn(
            "group/alert-dialog fixed inset-0 z-(--z-dialog) m-auto flex h-fit w-[calc(100%-2rem)] max-w-sm flex-col gap-4 rounded-dialog border border-border-strong bg-popover p-5 text-popover-foreground shadow-dialog outline-hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-(--duration-enter) data-[state=open]:ease-(--ease-spring)",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-(--duration-exit) data-[state=closed]:ease-(--ease-exit)",
            className
          )}
          {...props}
        />
      </ToneContext.Provider>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** Stacks on phones with the primary action on top; sits on the end from 40rem up. */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

type ActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<ButtonProps, "variant" | "size" | "loading" | "loadingLabel">

/** The confirming action. Destructive tone: soft red, moved to the start (not the confirm spot). */
function AlertDialogAction({ className, variant, ...props }: ActionProps) {
  const tone = React.useContext(ToneContext)
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button
        data-slot="alert-dialog-action"
        variant={variant ?? (tone === "destructive" ? "destructive" : "default")}
        className={cn("group-data-[tone=destructive]/alert-dialog:-order-1", className)}
        {...props}
      />
    </AlertDialogPrimitive.Action>
  )
}

/** The safe answer ("Keep service"). Takes the primary look in a destructive dialog. */
function AlertDialogCancel({ className, variant, ...props }: ActionProps) {
  const tone = React.useContext(ToneContext)
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button
        data-slot="alert-dialog-cancel"
        variant={variant ?? (tone === "destructive" ? "default" : "outline")}
        className={className}
        {...props}
      />
    </AlertDialogPrimitive.Cancel>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
}
