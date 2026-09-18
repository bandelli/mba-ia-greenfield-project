"use client"

import { useOptimistic, useTransition } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { BellIcon } from "@/components/icons/bell-icon"
import { VideoThumbnail } from "@/components/video/video-thumbnail"
import { formatDuration, formatRelativeTime } from "@/lib/utils"

// Mirrors GET /channels/:nickname/videos's `items[]` shape
// (phase-04-video-channel-management §API Contracts). Unlike the owner
// dashboard listing (SI-04.9), this endpoint DOES return `duration_seconds`.
export type PublicChannelVideoItem = {
  id: string
  publicId: string
  title: string
  thumbnailKey: string | null
  durationSeconds: number | null
  publishedAt: string | null
  views: number
}

// `GET /channels/:nickname` now returns `subscribersCount`/`isSubscribed`
// (per social-interactions/TD-01, extended alongside this SI — see
// progress.md). `isOwnChannel`/`isSubscribed` default to the safe values for
// an anonymous/unauthenticated viewer.
export type ChannelPublicPageProps = {
  channel: {
    name: string
    nickname: string
    description: string | null
  }
  avatarUrl?: string | null
  bannerUrl?: string | null
  subscriberCount?: number
  isOwnChannel?: boolean
  isSubscribed?: boolean
  videos: PublicChannelVideoItem[]
  total: number
  sort: "latest" | "popular" | "oldest"
}

type SubscriptionState = {
  subscribed: boolean
  subscribersCount: number
}

// Same counter-delta convention as like-dislike-button.tsx's applyReaction —
// mirrors the backend's SubscriptionService.applyCounterDelta math.
function applySubscription(
  state: SubscriptionState,
  next: boolean
): SubscriptionState {
  if (state.subscribed === next) return state
  return {
    subscribed: next,
    subscribersCount: state.subscribersCount + (next ? 1 : -1),
  }
}

const SORT_OPTIONS: { value: ChannelPublicPageProps["sort"]; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "oldest", label: "Oldest" },
]

function ChannelPublicPage({
  channel,
  avatarUrl,
  bannerUrl,
  subscriberCount,
  isOwnChannel = false,
  isSubscribed = false,
  videos,
  total,
  sort,
}: ChannelPublicPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [optimisticSubscription, setOptimisticSubscription] = useOptimistic<
    SubscriptionState,
    boolean
  >(
    { subscribed: isSubscribed, subscribersCount: subscriberCount ?? 0 },
    applySubscription
  )

  function handleSubscribeClick() {
    const next = !optimisticSubscription.subscribed

    startTransition(async () => {
      setOptimisticSubscription(next)

      const res = await fetch(`/api/channels/${channel.nickname}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: next }),
      })

      if (!res.ok) return

      router.refresh()
    })
  }

  function handleSortChange(nextSort: ChannelPublicPageProps["sort"]) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextSort === "latest") {
      params.delete("sort")
    } else {
      params.set("sort", nextSort)
    }
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-52 w-full shrink-0 bg-muted sm:h-80">
        {bannerUrl && <Image src={bannerUrl} alt="" fill className="object-cover" />}
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative -mt-16 size-32 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted">
              {avatarUrl && <Image src={avatarUrl} alt="" fill className="object-cover" />}
            </div>
            <div className="flex flex-col gap-1 pt-2">
              <h1 className="text-display text-foreground">{channel.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-body-lg font-medium text-muted-foreground">
                <span>@{channel.nickname}</span>
                <span aria-hidden="true">•</span>
                <span>
                  {optimisticSubscription.subscribersCount.toLocaleString("en-US")}{" "}
                  subscribers
                </span>
                <span aria-hidden="true">•</span>
                <span>{total.toLocaleString("en-US")} videos</span>
              </div>
              {channel.description && (
                <p className="line-clamp-1 text-body-md text-muted-foreground">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Hidden entirely for the channel owner — CANNOT_SUBSCRIBE_OWN_CHANNEL
                should be unreachable from the UI (per §Error Catalog → UX mapping). */}
            {!isOwnChannel && (
              <Button
                variant={optimisticSubscription.subscribed ? "secondary" : "destructive"}
                size="lg"
                aria-pressed={optimisticSubscription.subscribed}
                disabled={isPending}
                onClick={handleSubscribeClick}
              >
                {optimisticSubscription.subscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
            {/* Notifications: no capability in this phase's scope — rendered
                inert, matching the Figma frame, no onClick. */}
            <IconButton aria-label="Notifications" variant="outline" size="lg">
              <BellIcon className="size-4" />
            </IconButton>
          </div>
        </div>

        <div className="flex items-center gap-8 border-b border-border">
          <span className="border-b-2 border-foreground pb-2.5 text-body-lg font-semibold text-foreground">
            Videos
          </span>
          {/* "About" tab has no capability in this phase's scope (channel
              description/info editing lives on the owner-only Channel Settings
              screen, not here) — rendered inert, matching the Figma frame, no
              navigation wired. */}
          <span className="pb-2.5 text-body-lg font-medium text-muted-foreground">About</span>
        </div>

        <div className="flex items-center gap-2">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={option.value === sort ? "default" : "secondary"}
              size="action"
              onClick={() => handleSortChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {total === 0 ? (
          <p className="py-16 text-center text-body-lg text-muted-foreground">
            This channel has no public videos yet
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((video) => (
              <div key={video.id} className="flex flex-col gap-3">
                <div className="relative aspect-video overflow-hidden rounded-[var(--radius-3)] bg-muted">
                  <VideoThumbnail
                    publicId={video.publicId}
                    thumbnailKey={video.thumbnailKey}
                    alt={video.title}
                  />
                  {video.durationSeconds !== null && (
                    <span className="absolute right-2 bottom-2 rounded-[var(--radius-1)] bg-black/80 px-1.5 py-0.5 text-caption font-bold text-white">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="line-clamp-2 text-label-lg font-bold text-foreground">
                    {video.title}
                  </h3>
                  <p className="text-body-md text-muted-foreground">
                    {video.views.toLocaleString("en-US")} views
                    {video.publishedAt && <> • {formatRelativeTime(video.publishedAt)}</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { ChannelPublicPage }
