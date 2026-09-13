import { notFound } from "next/navigation"

import {
  ChannelPublicPage,
  type PublicChannelVideoItem,
} from "@/components/channel/channel-public-page"
import { upstream } from "@/lib/api/upstream"
import { resolvePageParam } from "@/lib/utils"

const DEFAULT_LIMIT = 20

function resolveSort(value: string | undefined): "latest" | "popular" | "oldest" {
  return value === "popular" || value === "oldest" ? value : "latest"
}

type ChannelShowPageProps = {
  params: Promise<{ nickname: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

export default async function ChannelShowPage({
  params,
  searchParams,
}: ChannelShowPageProps) {
  const { nickname } = await params
  const sp = await searchParams
  const sort = resolveSort(sp.sort)
  const page = resolvePageParam(sp.page)

  const [channelRes, videosRes] = await Promise.all([
    upstream.GET("/channels/{nickname}", {
      params: { path: { nickname } },
    }),
    upstream.GET("/channels/{nickname}/videos", {
      params: { path: { nickname }, query: { sort, page, limit: DEFAULT_LIMIT } },
    }),
  ])

  // Only documented error for either endpoint is 404 CHANNEL_NOT_FOUND
  // (§Error Catalog → UX mapping: Next.js not-found page). Both endpoints are
  // keyed by the same nickname, so an error on either means the channel
  // doesn't exist.
  if (channelRes.error || videosRes.error) {
    notFound()
  }

  const videos: PublicChannelVideoItem[] = (videosRes.data.items ?? []).map((video) => ({
    id: video.id ?? "",
    publicId: video.public_id ?? "",
    title: video.title ?? "Untitled",
    thumbnailKey: video.thumbnail_key ?? null,
    durationSeconds: video.duration_seconds ?? null,
    publishedAt: video.published_at ?? null,
    views: video.views ?? 0,
  }))

  return (
    <ChannelPublicPage
      channel={{
        name: channelRes.data.name ?? "",
        nickname: channelRes.data.nickname ?? nickname,
        description: channelRes.data.description ?? null,
      }}
      videos={videos}
      total={videosRes.data.total ?? 0}
      sort={sort}
    />
  )
}
