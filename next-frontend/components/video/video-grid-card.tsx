import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VideoThumbnail } from "@/components/video/video-thumbnail"
import { formatDuration, formatRelativeTime, getInitials } from "@/lib/utils"

// Mirrors GET /api/videos/public's `items[]` shape (home-search-launch/TD-01).
export type VideoGridCardProps = {
  publicId: string
  title: string | null
  thumbnailKey: string | null
  durationSeconds: number | null
  views: number
  publishedAt: string | null
  channel: { nickname: string; name: string }
}

function VideoGridCard({
  publicId,
  title,
  thumbnailKey,
  durationSeconds,
  views,
  publishedAt,
  channel,
}: VideoGridCardProps) {
  return (
    <Link href={`/watch/${publicId}`} className="flex w-[266px] flex-col gap-2">
      <div className="relative aspect-video w-[266px] overflow-hidden rounded-[var(--radius-3)] bg-card">
        <VideoThumbnail
          publicId={publicId}
          thumbnailKey={thumbnailKey}
          alt={title ?? ""}
        />
        {durationSeconds !== null && (
          <Badge variant="duration" className="absolute right-2 bottom-2">
            {formatDuration(durationSeconds)}
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Avatar className="mt-0.5 shrink-0">
          <AvatarFallback>{getInitials(channel.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="line-clamp-2 text-label-lg text-foreground">
            {title}
          </h3>
          <p className="text-body-md text-muted-foreground">{channel.name}</p>
          <p className="text-body-md text-muted-foreground">
            {views.toLocaleString("en-US")} views
            {publishedAt && <> · {formatRelativeTime(publishedAt)}</>}
          </p>
        </div>
      </div>
    </Link>
  )
}

export { VideoGridCard }
