"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import { getInitials } from "@workspace/ui/lib/initials"
import { presenceBg, presenceIndex } from "@workspace/ui/lib/presence"

const avatarVariants = cva(
  "relative inline-flex shrink-0 overflow-hidden rounded-full select-none",
  {
    variants: {
      size: {
        xs: "size-5 text-2xs",
        sm: "size-6 text-2xs",
        md: "size-8 text-xs",
        lg: "size-10 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function Avatar({
  className,
  size,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size ?? "md"}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

/** Pass `seed` (a user id) for a stable presence colour; without it the fallback is neutral. */
function AvatarFallback({
  className,
  seed,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & { seed?: string }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full font-medium",
        seed
          ? cn(presenceBg[presenceIndex(seed)], "text-presence-fg")
          : "bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants, getInitials }
