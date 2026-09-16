import { EmptySubscriptionsState } from "./empty-subscriptions-state"
import { SubscribedChannelRow } from "./subscribed-channel-row"

// Mirrors GET /api/subscriptions's response shape (phase-06-social-interactions
// §API Contracts).
export type SubscribedChannelsListProps = {
  items: { nickname: string; name: string; avatarUrl: string | null }[]
}

function SubscribedChannelsList({ items }: SubscribedChannelsListProps) {
  if (items.length === 0) {
    return <EmptySubscriptionsState />
  }

  return (
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
  )
}

export { SubscribedChannelsList }
