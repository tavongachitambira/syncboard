"use client"

import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function Toast(
    {info: info}: {info?: string}
) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast(info)}>
        Default
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.success(info)}
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info(info)
        }
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.warning(info)
        }
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error(info)}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          toast.promise<{ name: string }>(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ name: "Event" }), 2000)
              ),
            {
              loading: "Loading...",
              success: (data) => `${data.name} has been created`,
              error: "Error",
            }
          )
        }}
      >
        Promise
      </Button>
    </div>
  )
}
