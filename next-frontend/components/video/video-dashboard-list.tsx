"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconButton } from "@/components/ui/icon-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeftIcon } from "@/components/icons/chevron-left-icon"
import { ChevronRightIcon } from "@/components/icons/chevron-right-icon"
import { CommentIcon } from "@/components/icons/comment-icon"
import { EyeIcon } from "@/components/icons/eye-icon"
import { FilterIcon } from "@/components/icons/filter-icon"
import { MoreVerticalIcon } from "@/components/icons/more-vertical-icon"
import { PlusIcon } from "@/components/icons/plus-icon"
import { SearchIcon } from "@/components/icons/search-icon"
import { SortIcon } from "@/components/icons/sort-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import { cn, formatRelativeTime } from "@/lib/utils"

// Mirrors GET /channels/me/videos's `items[]` shape (phase-04-video-channel-management
// §API Contracts). `views`/`likes`/`comments` are always 0 until Phase 05/06 build the
// subsystems that populate them (per TD-05) — rendered here regardless, since the UI
// contract calls for the counters to exist.
//
// NOT in the API contract: a video duration. The Figma design shows a duration badge on
// each thumbnail, but no `duration_seconds` (or similar) field exists on this endpoint's
// response shape — only the public `GET /channels/:nickname/videos` listing has one. This
// component intentionally does not render a duration badge — flagging rather than
// inventing a field the backend doesn't return.
export type ChannelVideoListItem = {
  id: string
  publicId: string
  title: string
  thumbnailKey: string | null
  visibility: "public" | "unlisted"
  publishedAt: string | null
  views: number
  likes: number
  comments: number
}

export type VideoDashboardListProps = {
  videos: ChannelVideoListItem[]
  total: number
  page: number
  limit: number
}

function VideoDashboardList({
  videos,
  total,
  page,
  limit,
}: VideoDashboardListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const visibility = searchParams.get("visibility")
  const sort = searchParams.get("sort") ?? "latest"

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(nextPage))
    router.push(`?${params.toString()}`)
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const search = String(formData.get("search") ?? "").trim()
    navigate({ search: search || null })
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-foreground">Channel content</h1>
          <p className="text-body-md text-muted-foreground">
            Manage your videos and content
          </p>
        </div>
        <Button asChild variant="destructive" size="action">
          <Link href="/dashboard/videos/upload">
            <PlusIcon className="size-3" />
            Upload video
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          {/* Decorative disclosure trigger only — the Figma frame shows this button
              opening a filter panel whose contents were never captured (no expanded
              state in the design). No behavior wired; flagged rather than invented. */}
          <Button variant="secondary" size="chip">
            <FilterIcon className="size-3" />
            Filter
          </Button>
          <Button
            variant={visibility === "public" ? "default" : "secondary"}
            size="chip"
            onClick={() =>
              navigate({ visibility: visibility === "public" ? null : "public" })
            }
          >
            Public
          </Button>
          {/* "Date" chip has no dedicated query param in the API contract (only
              `sort=latest|oldest` exists) — treated as a shortcut that toggles the same
              sort value as the "Sort by" control below, per the inventory's verb
              ("Filtrar/ordenar vídeos do canal por data de publicação"). Flagged as an
              assumption, not silently invented from nothing. */}
          <Button
            variant={sort === "oldest" ? "default" : "secondary"}
            size="chip"
            onClick={() => navigate({ sort: sort === "oldest" ? null : "oldest" })}
          >
            Date
          </Button>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative w-64">
          <Input
            // `defaultValue` only applies at mount — without a `key` tied to
            // the URL's own value, browser back/forward navigation (which
            // re-renders this same component instance with new
            // `searchParams` but doesn't remount it) would leave the input
            // showing a stale, already-out-of-sync search term.
            key={searchParams.get("search") ?? ""}
            shape="pill"
            name="search"
            placeholder="Search your videos"
            defaultValue={searchParams.get("search") ?? ""}
            className="pr-9"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground"
          >
            <SearchIcon className="size-3.5" />
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-body-md text-muted-foreground">{total} videos</p>
        <Select
          value={sort}
          onValueChange={(value) => navigate({ sort: value === "latest" ? null : value })}
        >
          <SelectTrigger className="w-auto gap-1.5 border-none bg-transparent px-3 py-1 text-body-md text-muted-foreground shadow-none">
            <SortIcon className="size-3.5" />
            <SelectValue placeholder="Sort by">
              Sort by: {sort === "oldest" ? "Oldest" : "Latest"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-body-lg text-muted-foreground">
            You haven&apos;t uploaded any videos yet
          </p>
          <Button asChild variant="destructive" size="action">
            <Link href="/dashboard/videos/upload">
              <PlusIcon className="size-3" />
              Upload video
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0"
            >
              <div className="h-36 w-64 shrink-0 rounded-[var(--radius-2)] bg-muted" />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-label-lg font-semibold text-foreground">
                    {video.title}
                  </h2>
                  <IconButton
                    asChild
                    aria-label={`Edit ${video.title}`}
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                  >
                    <Link href={`/dashboard/videos/${video.id}/edit`}>
                      <MoreVerticalIcon className="size-4" />
                    </Link>
                  </IconButton>
                </div>

                <div className="flex items-center gap-3 text-body-md text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <EyeIcon className="size-3" />
                    {video.views.toLocaleString("en-US")} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUpIcon className="size-3" />
                    {video.likes.toLocaleString("en-US")} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <CommentIcon className="size-3" />
                    {video.comments.toLocaleString("en-US")}
                  </span>
                  {video.publishedAt && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{formatRelativeTime(video.publishedAt)}</span>
                    </>
                  )}
                  <span aria-hidden="true">•</span>
                  <span
                    className={cn(
                      "text-label-md font-semibold",
                      video.visibility === "public" ? "text-success-text" : "text-link"
                    )}
                  >
                    {video.visibility === "public" ? "Public" : "Unlisted"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Simplified page-number rendering (first 3 + last, no windowing around the
          current page) — matches the Figma sample ("1 2 3 ... 10") for a small page
          count. Revisit if a deep `page` value in a large range needs correct behavior. */}
      {total > 0 && (
        <div className="flex items-center justify-center gap-2">
          <IconButton
            aria-label="Previous page"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeftIcon className="size-3" />
          </IconButton>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              variant={n === page ? "destructive" : "secondary"}
              size="action"
              onClick={() => goToPage(n)}
            >
              {n}
            </Button>
          ))}
          {totalPages > 4 && <span className="text-body-md text-muted-foreground">...</span>}
          {totalPages > 3 && (
            <Button
              variant={totalPages === page ? "destructive" : "secondary"}
              size="action"
              onClick={() => goToPage(totalPages)}
            >
              {totalPages}
            </Button>
          )}
          <IconButton
            aria-label="Next page"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            <ChevronRightIcon className="size-3" />
          </IconButton>
        </div>
      )}
    </div>
  )
}

export { VideoDashboardList }
