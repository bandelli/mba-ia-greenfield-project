import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type SidebarProps = {
  open: boolean
  children: ReactNode
}

// Pure composition shell — no own state. `open` is owned by SidebarToggleButton's
// parent (per home-search-launch/TD-04, local useState, no global store) and
// controls the mobile collapse via a data attribute Tailwind variant targets.
function Sidebar({ open, children }: SidebarProps) {
  return (
    <aside
      data-slot="sidebar"
      data-open={open}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-background p-3",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:-translate-x-full max-md:transition-transform",
        "data-[open=true]:max-md:translate-x-0"
      )}
    >
      {children}
    </aside>
  )
}

export { Sidebar }
