"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import type { ApiErrorEnvelope } from "@/lib/api/contracts"
import { formatRelativeTime } from "@/lib/utils"

// Mirrors one entry of GET /api/videos/public/[publicId]/comments's `items[]`
// (top-level) or `items[].replies[]` (reply) shape (phase-06-social-interactions
// §API Contracts).
export type CommentItemProps = {
  publicId: string
  id: string
  body: string
  author: { id: string; nickname: string }
  createdAt: string
  likesCount: number
  dislikesCount: number
  currentUserReaction: "like" | "dislike" | null
  replies?: Omit<CommentItemProps, "publicId" | "replies">[]
  isReply?: boolean
}

type Reaction = "like" | "dislike" | null

type ReactionState = {
  reaction: Reaction
  likesCount: number
  dislikesCount: number
}

// Same counter-delta math as like-dislike-button.tsx's applyReaction /
// the backend's CommentReactionService.applyCounterDelta.
function applyReaction(state: ReactionState, next: Reaction): ReactionState {
  let { likesCount, dislikesCount } = state
  if (state.reaction === "like") likesCount -= 1
  if (state.reaction === "dislike") dislikesCount -= 1
  if (next === "like") likesCount += 1
  if (next === "dislike") dislikesCount += 1
  return { reaction: next, likesCount, dislikesCount }
}

function CommentItem({
  publicId,
  id,
  body,
  author,
  createdAt,
  likesCount,
  dislikesCount,
  currentUserReaction,
  replies,
  isReply = false,
}: CommentItemProps) {
  const router = useRouter()
  // Canonical social-action pattern (per social-interactions/TD-06, same as
  // like-dislike-button.tsx): useOptimistic derives from the real props and
  // resyncs to them automatically once a transition settles — this also
  // means a parent re-render with fresh server data (e.g. another user
  // reacted and a sibling action's `router.refresh()` re-fetched this list)
  // is always reflected, with no separate resync logic needed.
  const [isReactionPending, startReactionTransition] = useTransition()
  const [optimisticReaction, setOptimisticReaction] = useOptimistic<
    ReactionState,
    Reaction
  >(
    { reaction: currentUserReaction, likesCount, dislikesCount },
    applyReaction
  )

  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  function handleReaction(type: "like" | "dislike") {
    const next: Reaction = optimisticReaction.reaction === type ? null : type

    startReactionTransition(async () => {
      setOptimisticReaction(next)

      const res = await fetch(`/api/comments/${id}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: next }),
      })

      if (!res.ok) return

      router.refresh()
    })
  }

  async function handleReplySubmit() {
    if (!replyBody.trim()) return
    setIsSubmittingReply(true)
    setReplyError(null)
    const res = await fetch(`/api/videos/public/${publicId}/comments/${id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody }),
    })
    setIsSubmittingReply(false)
    if (!res.ok) {
      // Surface the failure instead of leaving the composer looking
      // unresponsive (e.g. an expired session returning 401) — same
      // error-display convention as comment-form.tsx.
      const envelope = (await res.json()) as ApiErrorEnvelope
      const message = Array.isArray(envelope.message)
        ? envelope.message.join(" ")
        : envelope.message
      setReplyError(message)
      return
    }
    setReplyBody("")
    setIsReplyOpen(false)
    // Re-fetches the server-rendered comment list (including the new reply)
    // without a full page reload — same pattern as comment-form.tsx.
    router.refresh()
  }

  return (
    <div className="flex gap-4">
      <div className="size-10 shrink-0 rounded-full bg-muted" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-label-md font-bold text-foreground">
            @{author.nickname}
          </span>
          <span className="text-caption text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
        <p className="text-body-md text-foreground">{body}</p>
        <div className="flex items-center gap-4 text-muted-foreground">
          <button
            type="button"
            aria-pressed={optimisticReaction.reaction === "like"}
            aria-label="Like comment"
            disabled={isReactionPending}
            onClick={() => handleReaction("like")}
            className="flex items-center gap-1 text-label-md aria-pressed:text-foreground disabled:cursor-not-allowed"
          >
            <ThumbsUpIcon className="size-4" />
            {optimisticReaction.likesCount}
          </button>
          <button
            type="button"
            aria-pressed={optimisticReaction.reaction === "dislike"}
            aria-label="Dislike comment"
            disabled={isReactionPending}
            onClick={() => handleReaction("dislike")}
            className="disabled:cursor-not-allowed"
          >
            <ThumbsDownIcon className="size-4" />
          </button>
          {!isReply && (
            <button
              type="button"
              className="text-label-md font-medium"
              onClick={() => setIsReplyOpen((open) => !open)}
            >
              Reply
            </button>
          )}
        </div>

        {!isReply && isReplyOpen && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Add a reply..."
              disabled={isSubmittingReply}
              maxLength={2000}
              className="w-full border-b border-border bg-transparent pb-2 text-body-md text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            />
            <Button
              size="sm"
              disabled={isSubmittingReply || !replyBody.trim()}
              onClick={handleReplySubmit}
            >
              Post reply
            </Button>
          </div>
        )}

        {!isReply && isReplyOpen && replyError && (
          <p className="text-helper text-destructive">{replyError}</p>
        )}

        {!isReply && replies && replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
            {replies.map((reply) => (
              <CommentItem key={reply.id} {...reply} publicId={publicId} isReply />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { CommentItem }
