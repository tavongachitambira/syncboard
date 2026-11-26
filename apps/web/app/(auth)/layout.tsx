import type { ReactNode } from "react"

import { Logo } from "@/components/logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main
        id="main"
        className="grid flex-1 place-items-center px-4 pt-2 pb-phi-3 sm:px-6"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
