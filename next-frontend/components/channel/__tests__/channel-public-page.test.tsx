// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
let currentSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => currentSearchParams,
}))

import {
  ChannelPublicPage,
  type PublicChannelVideoItem,
} from "@/components/channel/channel-public-page"

const channel = {
  name: "Tech Mastery Plus",
  nickname: "techmasteryplus",
  description: "Your ultimate guide to mastering modern web development.",
}

const videos: PublicChannelVideoItem[] = [
  {
    id: "video-1",
    publicId: "react19",
    title: "React 19 Complete Crash Course",
    thumbnailKey: null,
    durationSeconds: 860,
    publishedAt: "2026-09-10T00:00:00.000Z",
    views: 124_000,
  },
  {
    id: "video-2",
    publicId: "nextjs14",
    title: "Build a Next.js 14 Dashboard App",
    thumbnailKey: null,
    durationSeconds: 1725,
    publishedAt: "2026-09-05T00:00:00.000Z",
    views: 342_000,
  },
]

beforeEach(() => {
  push.mockClear()
  currentSearchParams = new URLSearchParams()
})

describe("<ChannelPublicPage />", () => {
  it("renders the channel header and a card per video", () => {
    render(
      <ChannelPublicPage channel={channel} videos={videos} total={2} sort="latest" />
    )

    expect(screen.getByRole("heading", { name: "Tech Mastery Plus" })).toBeInTheDocument()
    expect(screen.getByText("@techmasteryplus")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "React 19 Complete Crash Course" })
    ).toBeInTheDocument()
    expect(screen.getByText("14:20")).toBeInTheDocument()
    expect(screen.getByText("28:45")).toBeInTheDocument()
  })

  it("shows the empty state when there are no public videos", () => {
    render(<ChannelPublicPage channel={channel} videos={[]} total={0} sort="latest" />)

    expect(
      screen.getByText("This channel has no public videos yet")
    ).toBeInTheDocument()
  })

  it("does not show the empty state for an out-of-range page with a nonzero total", () => {
    render(<ChannelPublicPage channel={channel} videos={[]} total={12} sort="latest" />)

    expect(
      screen.queryByText("This channel has no public videos yet")
    ).not.toBeInTheDocument()
  })

  it("navigates with the selected sort value through the router", async () => {
    const user = userEvent.setup()
    render(
      <ChannelPublicPage channel={channel} videos={videos} total={2} sort="latest" />
    )

    await user.click(screen.getByRole("button", { name: "Popular" }))

    expect(push).toHaveBeenCalledWith("?sort=popular")
  })

  it("omits the sort param when Latest (the default) is reselected", async () => {
    currentSearchParams = new URLSearchParams("sort=popular")
    const user = userEvent.setup()
    render(
      <ChannelPublicPage channel={channel} videos={videos} total={2} sort="popular" />
    )

    await user.click(screen.getByRole("button", { name: "Latest" }))

    expect(push).toHaveBeenCalledWith("?")
  })
})
