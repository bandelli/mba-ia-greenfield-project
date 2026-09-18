import type { ReactNode } from "react"

import type { AppShellSubscriptions } from "@/components/layout/app-shell"
import { AppShell } from "@/components/layout/app-shell"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"

// Sidebar can only show a handful of rows (Gap 2) — the full paginated list
// lives at /subscriptions itself (app/(main)/subscriptions/page.tsx).
const SIDEBAR_SUBSCRIPTIONS_LIMIT = 5

// Route-group shell per home-search-launch/TD-04 (Option B) — every
// "browsing" screen (home, watch, dashboard, channel, subscriptions) gets the
// header/sidebar chrome; the (auth) route group keeps its existing bare,
// chrome-less layout.
//
// Server Component: fetches the sidebar's subscribed-channels section here
// (RSC-direct against `upstream`, same pattern as app/(main)/subscriptions/
// page.tsx) and passes the result down as a prop to AppShell — a Client
// Component — keeping the server/client boundary as deep as possible per
// this project's RSC-by-default rule.
export default async function MainLayout({ children }: { children: ReactNode }) {
  const subscriptions = await getSidebarSubscriptions()

  return <AppShell subscriptions={subscriptions}>{children}</AppShell>
}

async function getSidebarSubscriptions(): Promise<AppShellSubscriptions> {
  const session = await getSession()

  if (!session.isLoggedIn) {
    return null
  }

  // Only documented error response for this endpoint is 401 UNAUTHORIZED
  // (same as app/(main)/subscriptions/page.tsx). Unlike that page, this
  // fetch backs a shell rendered above every route, including ones that have
  // nothing to do with auth — so on error it just hides the section instead
  // of redirecting the whole page to /login.
  const { data, error } = await upstream.GET("/users/me/subscriptions", {
    params: { query: { limit: SIDEBAR_SUBSCRIPTIONS_LIMIT, offset: 0 } },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (error) {
    return null
  }

  return {
    items: (data.items ?? []).map((channel) => ({
      nickname: channel.nickname ?? "",
      name: channel.name ?? "",
      avatarUrl: channel.avatarUrl ?? null,
    })),
    total: data.total ?? 0,
  }
}
