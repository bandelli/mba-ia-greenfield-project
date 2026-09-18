"use client"

import { useContext, useState } from "react"
import Link from "next/link"

import { SessionContext } from "@/components/auth/session-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { getInitials } from "@/lib/utils"

export type AvatarButtonProps = {
  menu: React.ReactNode
}

// First real consumer of SessionContext (per phase-02-auth-frontend/TD-02 —
// the cookie-backed session is already broadcast via SessionProvider in
// app/layout.tsx; no new endpoint needed to know whether the user is logged in).
function AvatarButton({ menu }: AvatarButtonProps) {
  const session = useContext(SessionContext)
  const [open, setOpen] = useState(false)

  if (!session.isLoggedIn) {
    return (
      <Link href="/login" className="text-label-md text-foreground">
        Log in
      </Link>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label="Open account menu">
        <Avatar>
          <AvatarFallback>
            {getInitials(session.channelSlug || session.email)}
          </AvatarFallback>
        </Avatar>
      </SheetTrigger>
      <SheetContent>{menu}</SheetContent>
    </Sheet>
  )
}

export { AvatarButton }
