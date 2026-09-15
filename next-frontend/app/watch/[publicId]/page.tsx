import { notFound } from "next/navigation"

import { CommentsSectionStub } from "@/components/video/comments-section-stub"
import { DescriptionCard } from "@/components/video/description-card"
import { SuggestedVideoCard } from "@/components/video/suggested-video-card"
import { VideoPlayer } from "@/components/video/video-player"
import { upstream } from "@/lib/api/upstream"

type WatchPageProps = {
  params: Promise<{ publicId: string }>
}

// Server Component (RSC), anonymous — no auth guard, same pattern as
// /channel/[nickname] (phase-04-video-channel-management). Calls `upstream`
// directly rather than the BFF `/api/**` routes (RSC-direct pattern already
// established for that same screen).
export default async function WatchPage({ params }: WatchPageProps) {
  const { publicId } = await params

  const [videoRes, suggestedRes, streamUrlRes, downloadUrlRes] = await Promise.all([
    upstream.GET("/videos/public/{publicId}", {
      params: { path: { publicId } },
    }),
    upstream.GET("/videos/public/{publicId}/suggested", {
      params: { path: { publicId } },
    }),
    upstream.GET("/videos/public/{publicId}/stream-url", {
      params: { path: { publicId } },
    }),
    upstream.GET("/videos/public/{publicId}/download-url", {
      params: { path: { publicId } },
    }),
  ])

  // Only documented error for any of the four endpoints is 404
  // VIDEO_NOT_FOUND, all under the same predicate (§Error Catalog → UX
  // mapping: Next.js not-found page). All four are keyed by the same
  // publicId, so an error on any of them means the video isn't watchable.
  if (videoRes.error || suggestedRes.error || streamUrlRes.error || downloadUrlRes.error) {
    notFound()
  }

  const video = videoRes.data
  const suggested = suggestedRes.data.items ?? []

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <VideoPlayer src={streamUrlRes.data.url ?? ""} />

        <h1 className="text-h2 text-foreground">{video.title ?? ""}</h1>

        <DescriptionCard
          channel={{
            nickname: video.channel?.nickname ?? "",
            name: video.channel?.name ?? "",
          }}
          description={video.description ?? null}
          views={video.views ?? 0}
          publishedAt={video.published_at ?? null}
          downloadUrl={downloadUrlRes.data.url}
        />

        <CommentsSectionStub />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[400px]">
        {suggested.map((item) => (
          <SuggestedVideoCard
            key={item.public_id}
            publicId={item.public_id ?? ""}
            title={item.title ?? null}
            thumbnailKey={item.thumbnail_key ?? null}
            durationSeconds={item.duration_seconds ?? null}
            views={item.views ?? 0}
            publishedAt={item.published_at ?? null}
            channel={{
              nickname: item.channel?.nickname ?? "",
              name: item.channel?.name ?? "",
            }}
          />
        ))}
      </div>
    </div>
  )
}
