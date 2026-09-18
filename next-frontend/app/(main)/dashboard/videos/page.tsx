import { redirect } from "next/navigation"

import {
  VideoDashboardList,
  type ChannelVideoListItem,
} from "@/components/video/video-dashboard-list"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"
import { resolvePageParam } from "@/lib/utils"

const DEFAULT_LIMIT = 20

type DashboardVideosPageProps = {
  searchParams: Promise<{
    page?: string
    visibility?: string
    sort?: string
    search?: string
  }>
}

export default async function DashboardVideosPage({
  searchParams,
}: DashboardVideosPageProps) {
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect("/login")
  }

  const params = await searchParams
  const page = resolvePageParam(params.page)

  const { data, error } = await upstream.GET("/channels/me/videos", {
    params: {
      query: {
        page,
        limit: DEFAULT_LIMIT,
        ...(params.visibility === "public" || params.visibility === "unlisted"
          ? { visibility: params.visibility }
          : {}),
        ...(params.sort === "latest" || params.sort === "oldest"
          ? { sort: params.sort }
          : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  // Only documented error response for this endpoint is 401 UNAUTHORIZED
  // (§Error Catalog → UX mapping: redirect to /login).
  if (error) {
    redirect("/login")
  }

  const videos: ChannelVideoListItem[] = (data.items ?? []).map((video) => ({
    id: video.id ?? "",
    publicId: video.public_id ?? "",
    title: video.title ?? "Untitled",
    thumbnailKey: video.thumbnail_key ?? null,
    visibility: video.visibility === "unlisted" ? "unlisted" : "public",
    publishedAt: video.published_at ?? null,
    views: video.views ?? 0,
    likes: video.likes ?? 0,
    comments: video.comments ?? 0,
  }))

  return (
    <VideoDashboardList
      videos={videos}
      total={data.total ?? 0}
      page={data.page ?? page}
      limit={data.limit ?? DEFAULT_LIMIT}
    />
  )
}
