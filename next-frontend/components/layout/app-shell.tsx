"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BrandLogo } from "@/components/auth/brand-logo"
import { EditChannelIcon } from "@/components/icons/edit-channel-icon"
import { NavHomeIcon } from "@/components/icons/nav-home-icon"
import { NavSubscriptionsIcon } from "@/components/icons/nav-subscriptions-icon"
import { NavYourVideosIcon } from "@/components/icons/nav-your-videos-icon"
import { SignOutIcon } from "@/components/icons/sign-out-icon"
import { AccountMenuIdentity } from "@/components/layout/account-menu-identity"
import { AccountMenuItem } from "@/components/layout/account-menu-item"
import { AvatarButton } from "@/components/layout/avatar-button"
import { CreateButton } from "@/components/layout/create-button"
import { Header } from "@/components/layout/header"
import { SearchBar } from "@/components/layout/search-bar"
import { Sidebar } from "@/components/layout/sidebar"
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item"
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button"

export type AppShellProps = {
  children: ReactNode
}

// Per home-search-launch/TD-04 (Option B — route-group layout, auth excluded):
// the mobile sidebar collapse is a local `open` boolean owned here, no global
// state-management dependency. Explicitly no "Liked videos" nav item — a
// commissioned-page gap flagged in TD-04's own context note (Non-UI/Deferred
// Capabilities), not something this shell renders.
function AppShell({ children }: AppShellProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Closes the Phase 02 logout deferral (per this phase's Objective). Uses
  // router.push + router.refresh (not a hard reload) so the RSC session read
  // in app/layout.tsx re-runs and SessionProvider's context updates —
  // AvatarButton falls back to the "Log in" affordance once isLoggedIn flips.
  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const accountMenu = (
    <div className="flex flex-col">
      <AccountMenuIdentity />
      <AccountMenuItem href="/dashboard/channel" icon={<EditChannelIcon />} label="Edit Channel" />
      <AccountMenuItem icon={<SignOutIcon />} label="Sign Out" onClick={() => void handleSignOut()} />
    </div>
  )

  return (
    <div className="flex min-h-full flex-col">
      <Header
        start={
          <>
            <SidebarToggleButton
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((open) => !open)}
            />
            <Link href="/">
              <BrandLogo size="md" />
            </Link>
          </>
        }
        center={<SearchBar />}
        end={
          <>
            <CreateButton />
            <AvatarButton menu={accountMenu} />
          </>
        }
      />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen}>
          <SidebarNavItem href="/" label="Home" icon={<NavHomeIcon />} />
          <SidebarNavItem
            href="/subscriptions"
            label="Subscriptions"
            icon={<NavSubscriptionsIcon />}
          />
          <SidebarNavItem
            href="/dashboard/videos"
            label="Your videos"
            icon={<NavYourVideosIcon />}
          />
        </Sidebar>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export { AppShell }
