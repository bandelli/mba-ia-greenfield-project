import type { ReactNode } from "react"
import { Suspense } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { SidebarSubscriptionsSection } from "@/components/layout/sidebar-subscriptions-section"
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
// No top-level await here: the sidebar's subscribed-channels fetch is handed
// to AppShell as a Suspense-wrapped slot instead of resolved data, so it
// can't gate `children` (the routed page, with its own loading.tsx) behind
// it. Without this, a route like /subscriptions — whose page makes the same
// kind of upstream call — races its own loading skeleton against this
// layout's fetch and can lose it entirely when both resolve close together.
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      subscriptionsSlot={
        <Suspense fallback={null}>
          <SidebarSubscriptions />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}

async function SidebarSubscriptions() {
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

  return (
    <SidebarSubscriptionsSection
      items={(data.items ?? []).map((channel) => ({
        nickname: channel.nickname ?? "",
        name: channel.name ?? "",
        avatarUrl: channel.avatarUrl ?? null,
      }))}
      total={data.total ?? 0}
    />
  )
}
