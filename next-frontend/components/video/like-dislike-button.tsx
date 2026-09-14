import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"

// Likes/dislikes: Phase 06 scope (Social Interactions) — not wired in this
// phase, and the API contract for this phase carries no likes field at all.
// Rendered for visual fidelity only, no onClick, no real count.
function LikeDislikeButton() {
  return (
    <div className="flex h-11 items-center overflow-hidden rounded-[var(--radius-full)] bg-secondary text-secondary-foreground">
      <span className="flex h-full items-center gap-1.5 px-4 text-label-md">
        <ThumbsUpIcon className="size-4" />
        24K
      </span>
      <span className="h-6 w-px bg-border" aria-hidden="true" />
      <span className="flex h-full items-center px-4">
        <ThumbsDownIcon className="size-4" />
      </span>
    </div>
  )
}

export { LikeDislikeButton }
