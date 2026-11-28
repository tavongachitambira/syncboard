"use client"

import * as React from "react"

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"

/*
 * ResponsiveDialog = one set of parts, two overlays (Modal Hierarchy + Bottom Sheets):
 * a centred Dialog from 40rem up, a bottom Sheet (thumb-reach actions, drag to dismiss)
 * below it. Same trigger, same content, same open state.
 */
const DesktopContext = React.createContext(true)

function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  const desktop = useMediaQuery("(min-width: 40rem)")
  return (
    <DesktopContext.Provider value={desktop}>
      <Dialog {...props} />
    </DesktopContext.Provider>
  )
}

const ResponsiveDialogTrigger = DialogTrigger

function ResponsiveDialogContent({
  size,
  snapPoints,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  snapPoints?: readonly number[]
}) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? (
    <DialogContent size={size} {...props} />
  ) : (
    <SheetContent
      side="bottom"
      snapPoints={snapPoints}
      {...(props as React.ComponentProps<typeof SheetContent>)}
    />
  )
}

function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? <DialogHeader {...props} /> : <SheetHeader {...props} />
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? <DialogTitle {...props} /> : <SheetTitle {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? (
    <DialogDescription {...props} />
  ) : (
    <SheetDescription {...props} />
  )
}

function ResponsiveDialogBody(props: React.ComponentProps<"div">) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? <DialogBody {...props} /> : <SheetBody {...props} />
}

function ResponsiveDialogFooter(props: React.ComponentProps<"div">) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? <DialogFooter {...props} /> : <SheetFooter {...props} />
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const desktop = React.useContext(DesktopContext)
  return desktop ? <DialogClose {...props} /> : <SheetClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
}
