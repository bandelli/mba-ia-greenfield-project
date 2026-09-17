"use client"

import { useEffect, useRef, useState } from "react"

import { Spinner } from "@/components/ui/spinner"
import { VideoGridCard, type VideoGridCardProps } from "@/components/video/video-grid-card"

export type VideoGridProps = {
  initialItems: VideoGridCardProps[]
  initialPage: number
  limit: number
  total: number
  category?: string
  q?: string
}

// Client-driven infinite scroll continuation, per home-search-launch/TD-03 —
// first page renders server-side (props); further pages append client-side
// via IntersectionObserver + fetch against the BFF (no client-cache library).
function VideoGrid({ initialItems, initialPage, limit, total, category, q }: VideoGridProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const hasMore = items.length < total

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void loadNextPage()
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, page])

  async function loadNextPage() {
    if (isLoading) return
    setIsLoading(true)
    setError(false)

    const params = new URLSearchParams({ page: String(page + 1), limit: String(limit) })
    if (category) params.set("category", category)
    if (q) params.set("q", q)

    try {
      const res = await fetch(`/api/videos/public?${params.toString()}`)
      if (!res.ok) throw new Error("fetch failed")
      const data = (await res.json()) as {
        items: Array<{
          public_id?: string
          title?: string | null
          thumbnail_key?: string | null
          duration_seconds?: number | null
          views?: number
          published_at?: string | null
          channel?: { nickname?: string; name?: string }
        }>
        page: number
      }
      // BFF is a pass-through of the backend's snake_case wire shape
      // (home-search-launch/TD-01 §SI-07.3 — no reshape at the BFF tier), so
      // subsequent pages must be mapped to VideoGridCardProps the same way
      // app/(main)/page.tsx maps the server-rendered first page.
      const mapped: VideoGridCardProps[] = data.items.map((item) => ({
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
      setItems((prev) => [...prev, ...mapped])
      setPage(data.page)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-body-lg text-muted-foreground">
        No videos found.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="grid grid-cols-[repeat(auto-fill,266px)] justify-center gap-x-6 gap-y-8">
        {items.map((item) => (
          <VideoGridCard key={item.publicId} {...item} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoading && <Spinner aria-label="Loading more videos" />}
          {error && (
            <button
              type="button"
              onClick={() => void loadNextPage()}
              className="text-label-md text-link"
            >
              Failed to load more videos. Retry.
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { VideoGrid }
