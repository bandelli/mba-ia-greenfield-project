import type { ReactNode } from "react"

import { AppShell } from "@/components/layout/app-shell"

// Route-group shell per home-search-launch/TD-04 (Option B) — every
// "browsing" screen (home, watch, dashboard, channel, subscriptions) gets the
// header/sidebar chrome; the (auth) route group keeps its existing bare,
// chrome-less layout.
export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
