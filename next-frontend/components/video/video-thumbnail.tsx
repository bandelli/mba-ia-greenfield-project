"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

export type VideoThumbnailProps = {
  publicId: string
  thumbnailKey: string | null
  alt: string
  /**
   * Which BFF route to resolve the presigned URL through — `"public"` (the
   * default) hits `/api/videos/public/[publicId]/thumbnail-url` (anonymous,
   * for anywhere a viewer watches a published video). `"owner"` hits
   * `/api/videos/[id]/thumbnail-url` (session-authenticated, for the
   * caller's own videos — e.g. the dashboard list and the edit form).
   */
  scope?: "public" | "owner"
  className?: string
}

// Resolves a video's `thumbnail_key` to a viewable image, client-side, via
// the BFF's presigned-URL endpoint (mirrors the `stream-url`/`download-url`
// delivery pattern already established for video playback — per the
// thumbnail-delivery gap flagged since Phase 04 and re-flagged in Phase 07).
// Renders nothing when the video has no thumbnail yet (`thumbnailKey` is
// null) or when the presigned-URL fetch fails (e.g. a 404 — video no longer
// has a thumbnail) — the parent's own placeholder background shows through
// either way, since this component never renders its own placeholder.
function VideoThumbnail({
  publicId,
  thumbnailKey,
  alt,
  scope = "public",
  className,
}: VideoThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null)

  // No synchronous `setUrl(null)` reset at the top of the effect (which would
  // trigger a cascading render, per the react-hooks/set-state-in-effect
  // rule) — every list that renders this component keys its item by
  // publicId/id (VideoGrid, VideoDashboardList, ChannelPublicPage), so a
  // different video remounts a fresh instance rather than updating props in
  // place.
  useEffect(() => {
    if (!thumbnailKey) return

    let cancelled = false
    const endpoint =
      scope === "owner"
        ? `/api/videos/${publicId}/thumbnail-url`
        : `/api/videos/public/${publicId}/thumbnail-url`

    fetch(endpoint)
      .then((res) => (res.ok ? (res.json() as Promise<{ url?: string }>) : null))
      .then((body) => {
        if (!cancelled) setUrl(body?.url ?? null)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [publicId, thumbnailKey, scope])

  if (!url) return null

  return (
    <Image
      src={url}
      alt={alt}
      fill
      // Presigned URLs are short-lived, one-time-signed, and hosted on an
      // env-dependent object-storage domain — not a stable, cacheable,
      // allowlistable source for Next's built-in image optimizer (same
      // reasoning as the local blob-URL preview in video-edit-form.tsx).
      unoptimized
      sizes="(max-width: 768px) 100vw, 400px"
      className={cn("object-cover", className)}
    />
  )
}

export { VideoThumbnail }
