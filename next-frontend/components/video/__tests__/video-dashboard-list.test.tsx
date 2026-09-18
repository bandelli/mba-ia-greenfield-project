// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"

import { server } from "@/mocks/server"

const push = vi.fn()
let currentSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => currentSearchParams,
}))

import {
  VideoDashboardList,
  type ChannelVideoListItem,
} from "@/components/video/video-dashboard-list"

const videos: ChannelVideoListItem[] = [
  {
    id: "video-1",
    publicId: "pub123",
    title: "My Awesome Tech Review 2024",
    thumbnailKey: null,
    visibility: "public",
    publishedAt: "2026-09-10T00:00:00.000Z",
    views: 124_000,
    likes: 5_200,
    comments: 432,
  },
  {
    id: "video-2",
    publicId: "pub456",
    title: "How I Built My First App in 30 Days",
    thumbnailKey: null,
    visibility: "unlisted",
    publishedAt: null,
    views: 45_000,
    likes: 2_100,
    comments: 178,
  },
]

beforeEach(() => {
  push.mockClear()
  currentSearchParams = new URLSearchParams()
})

describe("<VideoDashboardList />", () => {
  it("renders a row per video with title, stats, and visibility", () => {
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    expect(
      screen.getByRole("heading", { name: "My Awesome Tech Review 2024" })
    ).toBeInTheDocument()
    expect(screen.getByText("124,000 views")).toBeInTheDocument()
    expect(screen.getByText("5,200 likes")).toBeInTheDocument()
    // Scoped to <span> — "Public" also appears as the chip button's label.
    expect(screen.getByText("Public", { selector: "span" })).toBeInTheDocument()
    expect(screen.getByText("Unlisted")).toBeInTheDocument()
  })

  it("does not show the empty state for an out-of-range page with a nonzero total", () => {
    // `total` (24) reflects the channel's real video count; `videos` is empty
    // because `page` (5) is past the last page. This must not be reported as
    // "no videos ever uploaded" — that's specifically what `total === 0` (not
    // `videos.length === 0`) as the empty-state gate protects against.
    render(<VideoDashboardList videos={[]} total={24} page={5} limit={20} />)

    expect(
      screen.queryByText("You haven't uploaded any videos yet")
    ).not.toBeInTheDocument()
  })

  it("shows the empty state and an upload CTA when there are no videos", () => {
    render(<VideoDashboardList videos={[]} total={0} page={1} limit={20} />)

    expect(
      screen.getByText("You haven't uploaded any videos yet")
    ).toBeInTheDocument()
    // Two "Upload video" links coexist (header CTA + empty-state CTA) — both
    // must point at the same (currently unbuilt) upload route.
    const uploadLinks = screen.getAllByRole("link", { name: /upload video/i })
    expect(uploadLinks).toHaveLength(2)
    for (const link of uploadLinks) {
      expect(link).toHaveAttribute("href", "/dashboard/videos/upload")
    }
  })

  it("toggles the Public visibility filter through the router", async () => {
    const user = userEvent.setup()
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    await user.click(screen.getByRole("button", { name: "Public" }))

    expect(push).toHaveBeenCalledWith("?visibility=public")
  })

  it("clears the Public filter when toggled again", async () => {
    currentSearchParams = new URLSearchParams("visibility=public")
    const user = userEvent.setup()
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    await user.click(screen.getByRole("button", { name: "Public" }))

    expect(push).toHaveBeenCalledWith("?")
  })

  it("submits the search box with the typed term", async () => {
    const user = userEvent.setup()
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    await user.type(screen.getByPlaceholderText("Search your videos"), "gadgets")
    await user.click(screen.getByRole("button", { name: "Search" }))

    expect(push).toHaveBeenCalledWith("?search=gadgets")
  })

  it("links each video's actions button to its edit screen", () => {
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    expect(
      screen.getByRole("link", { name: "Edit My Awesome Tech Review 2024" })
    ).toHaveAttribute("href", "/dashboard/videos/video-1/edit")
  })

  it("navigates to the clicked page number", async () => {
    const user = userEvent.setup()
    render(<VideoDashboardList videos={videos} total={40} page={1} limit={20} />)

    await user.click(screen.getByRole("button", { name: "2" }))

    expect(push).toHaveBeenCalledWith("?page=2")
  })

  it("disables the previous-page control on the first page", () => {
    render(<VideoDashboardList videos={videos} total={40} page={1} limit={20} />)

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
  })

  it("renders the resolved thumbnail via the owner BFF route when thumbnailKey is present", async () => {
    server.use(
      http.get("/api/videos/pub123/thumbnail-url", () =>
        HttpResponse.json({ url: "https://storage.example.com/owner-thumb.png" })
      )
    )
    const videosWithThumbnail: ChannelVideoListItem[] = [
      { ...videos[0], thumbnailKey: "thumbnails/pub123.png" },
    ]

    render(
      <VideoDashboardList videos={videosWithThumbnail} total={1} page={1} limit={20} />
    )

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument())
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://storage.example.com/owner-thumb.png"
    )
  })

  it("renders no image for a video with no thumbnail yet (placeholder background only)", () => {
    render(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("re-syncs the search box when the URL's search param changes externally", () => {
    // Simulates browser back/forward: the URL changes without this component
    // unmounting. A plain `defaultValue` alone would leave the input showing
    // the stale "gadgets" text after navigating back to the unfiltered URL.
    currentSearchParams = new URLSearchParams("search=gadgets")
    const { rerender } = render(
      <VideoDashboardList videos={videos} total={2} page={1} limit={20} />
    )
    expect(screen.getByPlaceholderText("Search your videos")).toHaveValue("gadgets")

    currentSearchParams = new URLSearchParams()
    rerender(<VideoDashboardList videos={videos} total={2} page={1} limit={20} />)

    expect(screen.getByPlaceholderText("Search your videos")).toHaveValue("")
  })
})
