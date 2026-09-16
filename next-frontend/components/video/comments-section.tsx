import { Button } from "@/components/ui/button"
import { SortIcon } from "@/components/icons/sort-icon"
import { CommentForm } from "./comment-form"
import { CommentList, type CommentListProps } from "./comment-list"

// Replaces the phase-05 stub `components/video/comments-section-stub.tsx`.
export type CommentsSectionProps = {
  publicId: string
  total: number
  items: CommentListProps["items"]
}

function CommentsSection({ publicId, total, items }: CommentsSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-foreground">
          {total.toLocaleString("en-US")} {total === 1 ? "Comment" : "Comments"}
        </h2>
        {/* Sort control: no phase-06 capability requires real sort behavior
            (per this phase's screen-inventory Observations) — rendered as a
            functional-looking but inert trigger, fixed newest-first order. */}
        <Button variant="ghost" size="action" disabled>
          <SortIcon className="size-4" />
          Sort by
        </Button>
      </div>

      <CommentForm publicId={publicId} />

      <CommentList publicId={publicId} items={items} />
    </div>
  )
}

export { CommentsSection }
