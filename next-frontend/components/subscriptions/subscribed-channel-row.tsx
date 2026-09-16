import Image from "next/image"
import Link from "next/link"

// Mirrors GET /api/subscriptions's `items[]` shape (phase-06-social-interactions
// §API Contracts).
export type SubscribedChannelRowProps = {
  nickname: string
  name: string
  avatarUrl: string | null
}

function SubscribedChannelRow({ nickname, name, avatarUrl }: SubscribedChannelRowProps) {
  return (
    <Link
      href={`/channel/${nickname}`}
      className="flex items-center gap-3 rounded-[var(--radius-3)] p-2 hover:bg-muted"
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
        {avatarUrl && <Image src={avatarUrl} alt="" fill className="object-cover" />}
      </div>
      <span className="truncate text-label-md font-medium text-foreground">{name}</span>
    </Link>
  )
}

export { SubscribedChannelRow }
