"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { DownloadIcon } from "@/components/icons/download-icon"
import { MoreVerticalIcon } from "@/components/icons/more-vertical-icon"
import { ShareIcon } from "@/components/icons/share-icon"
import { formatRelativeTime } from "@/lib/utils"
import { LikeDislikeButton } from "./like-dislike-button"

// Mirrors GET /api/videos/public/[publicId]'s response shape (per
// phase-05-video-watch-page §API Contracts) for the fields this card needs.
export type DescriptionCardProps = {
  channel: { nickname: string; name: string }
  description: string | null
  views: number
  publishedAt: string | null
  downloadUrl?: string
}

function DescriptionCard({
  channel,
  description,
  views,
  publishedAt,
  downloadUrl,
}: DescriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 rounded-full bg-muted" />
          <div className="flex flex-col">
            <span className="text-label-lg font-medium text-foreground">
              {channel.name}
            </span>
            <span className="text-caption text-muted-foreground">
              @{channel.nickname}
            </span>
          </div>
          {/* Subscribe: Phase 06 scope (Social Interactions) — not wired in
              this phase. Rendered for visual fidelity, no onClick. */}
          <Button variant="red" size="chip" className="ml-4">
            Subscribe
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <LikeDislikeButton />

          {/* Share: no capability in this phase's scope — rendered inert,
              matching the Figma frame, no onClick. */}
          <Button variant="fill" size="chip-lg">
            <ShareIcon className="size-4" />
            Share
          </Button>

          <Button variant="fill" size="chip-lg" asChild>
            <a href={downloadUrl ?? "#"} download>
              <DownloadIcon className="size-4" />
              Download
            </a>
          </Button>

          {/* More options: no capability in this phase's scope — rendered
              inert, matching the Figma frame, no onClick. */}
          <IconButton aria-label="More options" variant="secondary" size="xl">
            <MoreVerticalIcon className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-[var(--radius-3)] bg-secondary p-4">
        <div className="flex items-center gap-2 text-label-md font-medium text-foreground">
          <span>{views.toLocaleString("en-US")} views</span>
          {publishedAt && (
            <>
              <span aria-hidden="true">•</span>
              <span>{formatRelativeTime(publishedAt)}</span>
            </>
          )}
        </div>

        {description && (
          <p
            className={
              isExpanded
                ? "whitespace-pre-line text-body-md text-foreground"
                : "line-clamp-3 whitespace-pre-line text-body-md text-foreground"
            }
          >
            {description}
          </p>
        )}

        {/* Uses the nearest existing size ("sm") as-is per the Drift
            Report's decision, which did not flag a new compact size for
            this button — padding runs looser than Figma's tight ~77px box
            as a result. No backend I/O (per TD-06) — pure client state. */}
        {description && (
          <Button
            variant="quiet"
            size="sm"
            className="self-start"
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
    </div>
  )
}

export { DescriptionCard }
