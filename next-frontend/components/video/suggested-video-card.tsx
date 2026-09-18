import Link from "next/link"

import { VideoThumbnail } from "@/components/video/video-thumbnail"
import { formatDuration, formatRelativeTime } from "@/lib/utils"

// Mirrors GET /api/videos/public/[publicId]/suggested's `items[]` shape
// (phase-05-video-watch-page §API Contracts).
export type SuggestedVideoCardProps = {
  publicId: string
  title: string | null
  thumbnailKey: string | null
  durationSeconds: number | null
  views: number
  publishedAt: string | null
  channel: { nickname: string; name: string }
}

function SuggestedVideoCard({
  publicId,
  title,
  thumbnailKey,
  durationSeconds,
  views,
  publishedAt,
  channel,
}: SuggestedVideoCardProps) {
  return (
    <Link href={`/watch/${publicId}`} className="flex gap-2">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-[var(--radius-3)] bg-muted">
        <VideoThumbnail
          publicId={publicId}
          thumbnailKey={thumbnailKey}
          alt={title ?? ""}
        />
        {durationSeconds !== null && (
          <span className="absolute right-1 bottom-1 rounded-[var(--radius-1)] bg-black/80 px-1.5 py-0.5 text-caption font-bold text-white">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-label-md font-bold text-foreground">
          {title}
        </h3>
        <p className="text-caption text-muted-foreground">{channel.name}</p>
        <p className="text-caption text-muted-foreground">
          {views.toLocaleString("en-US")} views
          {publishedAt && <> • {formatRelativeTime(publishedAt)}</>}
        </p>
      </div>
    </Link>
  )
}

export { SuggestedVideoCard }
