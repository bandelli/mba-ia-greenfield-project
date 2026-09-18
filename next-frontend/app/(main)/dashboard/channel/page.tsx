import { redirect } from "next/navigation"

import { ChannelSettingsForm } from "@/components/channel/channel-settings-form"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"

export default async function DashboardChannelPage() {
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect("/login")
  }

  const { data, error } = await upstream.GET("/channels/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  // Only documented error response for this endpoint is 401 UNAUTHORIZED
  // (§Error Catalog → UX mapping: redirect to /login).
  if (error) {
    redirect("/login")
  }

  return (
    <ChannelSettingsForm
      channel={{
        nickname: data.nickname ?? "",
        name: data.name ?? "",
        description: data.description ?? "",
        updated_at: data.updated_at ?? new Date().toISOString(),
      }}
    />
  )
}
