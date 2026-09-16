import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "@/components/icons/chevron-left-icon"
import { ChevronRightIcon } from "@/components/icons/chevron-right-icon"

export type PaginationControlsProps = {
  page: number
  totalPages: number
}

function PaginationControls({ page, totalPages }: PaginationControlsProps) {
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex items-center justify-center gap-4">
      {hasPrev ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`?page=${page - 1}`} aria-label="Previous page">
            <ChevronLeftIcon className="size-4" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled aria-label="Previous page">
          <ChevronLeftIcon className="size-4" />
          Previous
        </Button>
      )}

      <span className="text-label-md text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      {hasNext ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`?page=${page + 1}`} aria-label="Next page">
            Next
            <ChevronRightIcon className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled aria-label="Next page">
          Next
          <ChevronRightIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}

export { PaginationControls }
