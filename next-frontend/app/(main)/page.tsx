import { CategoryFilterBar } from "@/components/layout/category-filter-bar"
import { VideoGrid, type VideoGridProps } from "@/components/video/video-grid"
import type { VideoGridCardProps } from "@/components/video/video-grid-card"
import { upstream } from "@/lib/api/upstream"
import { resolvePageParam } from "@/lib/utils"

const DEFAULT_LIMIT = 24

type HomePageProps = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>
}

// Server Component (RSC), anonymous — no auth guard, first page rendered
// server-side from `searchParams`; `VideoGrid` takes over pagination
// client-side via IntersectionObserver (per home-search-launch/TD-03).
// Calls `upstream` directly rather than the BFF `/api/**` route — same
// RSC-direct pattern already established by /watch/[publicId] and
// /subscriptions; the BFF route (SI-07.3) exists for VideoGrid's own
// client-side continuation fetches.
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const page = resolvePageParam(params.page)

  const { data, error } = await upstream.GET("/videos/public", {
    params: {
      query: {
        category: params.category,
        q: params.q,
        page,
        limit: DEFAULT_LIMIT,
      },
    },
  })

  // Only documented error is 400 (invalid category/q/page/limit) — shouldn't
  // organically happen from this UI (category comes from a fixed chip list,
  // q is client-validated to 200 chars). Degrade to an empty grid rather than
  // blocking the anonymous-access home page (per the project's "anyone can
  // watch videos without registering" principle) — VideoGrid's own established
  // empty state covers the rendering.
  const items: VideoGridCardProps[] = error
    ? []
    : (data.items ?? []).map((item) => ({
        publicId: item.public_id ?? "",
        title: item.title ?? null,
        thumbnailKey: item.thumbnail_key ?? null,
        durationSeconds: item.duration_seconds ?? null,
        views: item.views ?? 0,
        publishedAt: item.published_at ?? null,
        channel: {
          nickname: item.channel?.nickname ?? "",
          name: item.channel?.name ?? "",
        },
      }))

  const videoGridProps: VideoGridProps = {
    initialItems: items,
    initialPage: error ? 1 : (data.page ?? page),
    limit: error ? DEFAULT_LIMIT : (data.limit ?? DEFAULT_LIMIT),
    total: error ? 0 : (data.total ?? 0),
    category: params.category,
    q: params.q,
  }

  return (
    <div className="flex flex-col">
      <CategoryFilterBar />
      <div className="px-4 py-6">
        {/* Keyed by category+q so a filter/search navigation remounts VideoGrid
            instead of reusing its instance — `items`/`page` are seeded from
            `initialItems`/`initialPage` only on mount (useState's initializer
            runs once), so without this key a client-side searchParams change
            would leave the grid showing the previous filter's stale items. */}
        <VideoGrid key={`${params.category ?? ""}:${params.q ?? ""}`} {...videoGridProps} />
      </div>
    </div>
  )
}
