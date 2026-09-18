import { notFound } from "next/navigation"

import { CommentsSection } from "@/components/video/comments-section"
import type { CommentListProps } from "@/components/video/comment-list"
import { DescriptionCard } from "@/components/video/description-card"
import { SuggestedVideoCard } from "@/components/video/suggested-video-card"
import { VideoPlayer } from "@/components/video/video-player"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"

type CommentListItem = CommentListProps["items"][number]

// Maps one raw upstream comment (top-level or reply) onto CommentItem's
// props shape, defaulting every optional field the same way the rest of
// this page already defaults `upstream` responses.
function toCommentListItem(comment: {
  id?: string
  body?: string
  author?: { id?: string; nickname?: string }
  createdAt?: string
  likesCount?: number
  dislikesCount?: number
  currentUserReaction?: "like" | "dislike" | null
}): Omit<CommentListItem, "replies"> {
  return {
    id: comment.id ?? "",
    body: comment.body ?? "",
    author: {
      id: comment.author?.id ?? "",
      nickname: comment.author?.nickname ?? "",
    },
    createdAt: comment.createdAt ?? "",
    likesCount: comment.likesCount ?? 0,
    dislikesCount: comment.dislikesCount ?? 0,
    currentUserReaction: comment.currentUserReaction ?? null,
  }
}

type WatchPageProps = {
  params: Promise<{ publicId: string }>
}

// Server Component (RSC), anonymous — no auth guard, same pattern as
// /channel/[nickname] (phase-04-video-channel-management). Calls `upstream`
// directly rather than the BFF `/api/**` routes (RSC-direct pattern already
// established for that same screen). The video-metadata call optionally
// forwards the session's access token — the upstream endpoint is
// `@OptionalAuth()` (per social-interactions/TD-01), so a logged-in
// caller's real `currentUserReaction` comes back, while an anonymous
// caller still gets a full 200 with `currentUserReaction: null`.
export default async function WatchPage({ params }: WatchPageProps) {
  const { publicId } = await params
  const session = await getSession()

  const authHeader = session.isLoggedIn
    ? { Authorization: `Bearer ${session.accessToken}` }
    : undefined

  const [videoRes, suggestedRes, streamUrlRes, downloadUrlRes, commentsRes] =
    await Promise.all([
      upstream.GET("/videos/public/{publicId}", {
        params: { path: { publicId } },
        headers: authHeader,
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
      // Also `@OptionalAuth()` (per social-interactions/TD-04) — a logged-in
      // caller gets real per-comment `currentUserReaction` values back.
      upstream.GET("/videos/{publicId}/comments", {
        params: { path: { publicId } },
        headers: authHeader,
      }),
    ])

  // Only documented error for any of the four video-metadata endpoints is
  // 404 VIDEO_NOT_FOUND, all under the same predicate (§Error Catalog → UX
  // mapping: Next.js not-found page). All four are keyed by the same
  // publicId, so an error on any of them means the video isn't watchable.
  // The comments endpoint shares the same predicate and the same publicId,
  // so its error is folded into the same check.
  if (
    videoRes.error ||
    suggestedRes.error ||
    streamUrlRes.error ||
    downloadUrlRes.error ||
    commentsRes.error
  ) {
    notFound()
  }

  const video = videoRes.data
  const suggested = suggestedRes.data.items ?? []
  const comments = (commentsRes.data.items ?? []).map((comment) => ({
    ...toCommentListItem(comment),
    replies: (comment.replies ?? []).map(toCommentListItem),
  }))

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <VideoPlayer src={streamUrlRes.data.url ?? ""} />

        <h1 className="text-h2 text-foreground">{video.title ?? ""}</h1>

        <DescriptionCard
          publicId={video.public_id ?? publicId}
          channel={{
            nickname: video.channel?.nickname ?? "",
            name: video.channel?.name ?? "",
          }}
          description={video.description ?? null}
          views={video.views ?? 0}
          likesCount={video.likesCount ?? 0}
          dislikesCount={video.dislikesCount ?? 0}
          currentUserReaction={video.currentUserReaction ?? null}
          publishedAt={video.published_at ?? null}
          downloadUrl={downloadUrlRes.data.url}
        />

        <CommentsSection
          publicId={video.public_id ?? publicId}
          total={commentsRes.data.total ?? 0}
          items={comments}
        />
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
