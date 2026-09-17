"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type SidebarNavItemProps = {
  href: string
  label: string
  icon: ReactNode
}

// Active state reflects the current route (per home-search-launch/OQ-7 —
// "Home" is active on `/`, not hardcoded). Generic/reusable: the caller decides
// which items to render — "Liked videos" is a real nav destination in Figma but
// has no commissioned page (per ## Non-UI / Deferred Capabilities), so it is
// simply never instantiated by the Sidebar composition, not blocked here.
function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      data-slot="sidebar-nav-item"
      data-active={active}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-2)] px-3 py-3 text-label-md text-foreground",
        active ? "bg-card" : "hover:bg-card/60"
      )}
    >
      <span className="[&_svg]:size-5">{icon}</span>
      {label}
    </Link>
  )
}

export { SidebarNavItem }
