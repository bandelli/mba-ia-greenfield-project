"use client"

import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import { cn } from "@/lib/utils"

type Reaction = "like" | "dislike" | null

export type LikeDislikeButtonProps = {
  publicId: string
  likesCount: number
  dislikesCount: number
  currentUserReaction: Reaction
}

type ReactionState = {
  reaction: Reaction
  likesCount: number
  dislikesCount: number
}

// Same counter-delta math as the backend's VideoReactionService.applyCounterDelta
// (decrement the old reaction's column, increment the new one) — keeps the
// optimistic view numerically consistent with what the server will return.
function applyReaction(state: ReactionState, next: Reaction): ReactionState {
  let { likesCount, dislikesCount } = state
  if (state.reaction === "like") likesCount -= 1
  if (state.reaction === "dislike") dislikesCount -= 1
  if (next === "like") likesCount += 1
  if (next === "dislike") dislikesCount += 1
  return { reaction: next, likesCount, dislikesCount }
}

// Reference migration of the canonical social-action pattern (per
// social-interactions/TD-06 § Frontend Runtime → Setup, established in
// components/video/comment-form.tsx): useOptimistic + startTransition +
// fetch + router.refresh(). A click applies the assumed end-state
// immediately; a failed request leaves the real props untouched, so
// useOptimistic automatically reverts once the transition settles.
function LikeDislikeButton({
  publicId,
  likesCount,
  dislikesCount,
  currentUserReaction,
}: LikeDislikeButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticState, setOptimisticState] = useOptimistic<
    ReactionState,
    Reaction
  >({ reaction: currentUserReaction, likesCount, dislikesCount }, applyReaction)

  function handleClick(clicked: "like" | "dislike") {
    // Idempotent "set state" contract (per social-interactions/TD-03):
    // clicking the already-active reaction clears it instead of no-op-ing.
    const next: Reaction = optimisticState.reaction === clicked ? null : clicked

    startTransition(async () => {
      setOptimisticState(next)

      const res = await fetch(`/api/videos/public/${publicId}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: next }),
      })

      if (!res.ok) return

      router.refresh()
    })
  }

  return (
    <div className="flex h-11 items-center overflow-hidden rounded-[var(--radius-full)] bg-secondary text-secondary-foreground">
      <button
        type="button"
        aria-label="Like"
        aria-pressed={optimisticState.reaction === "like"}
        disabled={isPending}
        onClick={() => handleClick("like")}
        className={cn(
          "flex h-full items-center gap-1.5 px-4 text-label-md disabled:cursor-not-allowed",
          optimisticState.reaction === "like" && "text-primary"
        )}
      >
        <ThumbsUpIcon className="size-4" />
        {optimisticState.likesCount.toLocaleString("en-US")}
      </button>
      <span className="h-6 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        aria-label="Dislike"
        aria-pressed={optimisticState.reaction === "dislike"}
        disabled={isPending}
        onClick={() => handleClick("dislike")}
        className={cn(
          "flex h-full items-center px-4 disabled:cursor-not-allowed",
          optimisticState.reaction === "dislike" && "text-primary"
        )}
      >
        <ThumbsDownIcon className="size-4" />
      </button>
    </div>
  )
}

export { LikeDislikeButton }
