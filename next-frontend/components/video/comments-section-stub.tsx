import { Button } from "@/components/ui/button"
import { SortIcon } from "@/components/icons/sort-icon"
import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"

// Comments: Phase 06 scope (Social Interactions) — not wired in this phase.
// Rendered for visual fidelity matching the Figma frame, no submit, no
// sorting, no real comment data (the API contract for this phase carries no
// comments field at all).
function CommentsSectionStub() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-foreground">4,256 Comments</h2>
        <Button variant="ghost" size="action">
          <SortIcon className="size-4" />
          Sort by
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <input
          disabled
          placeholder="Add a comment..."
          className="w-full border-b border-border bg-transparent pb-2 text-body-md text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex gap-4">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-medium text-foreground">
              @DevStudent99
            </span>
            <span className="text-caption text-muted-foreground">2 weeks ago</span>
          </div>
          <p className="text-body-md text-foreground">
            This is exactly what I needed for my final year project. The
            explanation on Redux state management was incredibly clear. Thank
            you!
          </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1 text-label-md">
              <ThumbsUpIcon className="size-4" />
              245
            </span>
            <ThumbsDownIcon className="size-4" />
            <span className="text-label-md font-medium">Reply</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CommentsSectionStub }
