import Link from "next/link"

import { SubscribedChannelRow } from "@/components/subscriptions/subscribed-channel-row"

export type SidebarSubscriptionsSectionProps = {
  items: { nickname: string; name: string; avatarUrl: string | null }[]
  total: number
}

// Sidebar-scoped projection of the full /subscriptions page (Gap 2 —
// the design system's subscribed-channel-row was built during Phase 07 for
// the full page but never wired into the sidebar itself). Caps to whatever
// app/(main)/layout.tsx fetched server-side (SIDEBAR_SUBSCRIPTIONS_LIMIT) —
// PaginationControls' prev/next pattern is a poor fit for the sidebar's
// cramped width, so a single "See all" link to /subscriptions covers the
// rest instead.
function SidebarSubscriptionsSection({ items, total }: SidebarSubscriptionsSectionProps) {
  const hasMore = total > items.length

  return (
    <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
      <span className="px-3 text-caption text-muted-foreground">Subscribed channels</span>
      {items.length === 0 ? (
        <p className="px-3 py-2 text-helper text-muted-foreground">No subscriptions yet</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((channel) => (
            <li key={channel.nickname}>
              <SubscribedChannelRow
                nickname={channel.nickname}
                name={channel.name}
                avatarUrl={channel.avatarUrl}
              />
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <Link href="/subscriptions" className="px-3 py-2 text-label-md text-link">
          See all
        </Link>
      )}
    </div>
  )
}

export { SidebarSubscriptionsSection }
