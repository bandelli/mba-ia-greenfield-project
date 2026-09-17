"use client"

import { useEffect, useState } from "react"

import type { Channel } from "@/lib/api/contracts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

// Fetches the authenticated user's own channel identity for the Account Menu
// (existing endpoint, phase-04-video-channel-management — no BFF change this phase).
function AccountMenuIdentity() {
  const [channel, setChannel] = useState<Channel | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/channels/me")
      .then((res) => (res.ok ? (res.json() as Promise<Channel>) : null))
      .then((data) => {
        if (!cancelled) setChannel(data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!channel) {
    return (
      <div data-testid="account-menu-identity-loading" className="flex items-center gap-3 p-4">
        <div className="size-16 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <Avatar size="xl">
        <AvatarFallback>{getInitials(channel.name ?? "")}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <p className="text-label-lg font-bold text-foreground">{channel.name}</p>
        <p className="text-body-md text-muted-foreground">@{channel.nickname}</p>
      </div>
    </div>
  )
}

export { AccountMenuIdentity }
