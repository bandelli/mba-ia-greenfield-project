// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"

const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))
let currentSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
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
  refresh.mockClear()
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

  it("applies the optimistic subscribed state immediately, before the fetch resolves", async () => {
    server.use(
      http.put("/api/channels/techmasteryplus/subscription", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return HttpResponse.json({ subscribed: true, subscribersCount: 4201 })
      })
    )

    const user = userEvent.setup()
    render(
      <ChannelPublicPage
        channel={channel}
        videos={videos}
        total={2}
        sort="latest"
        subscriberCount={4200}
        isSubscribed={false}
      />
    )

    await user.click(screen.getByRole("button", { name: "Subscribe" }))

    // Optimistic UI applied immediately, while the fetch above is still in
    // flight (it won't resolve for another 30ms).
    expect(screen.getByRole("button", { name: "Subscribed" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByText("4,201 subscribers")).toBeInTheDocument()

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  })

  it("reverts the optimistic state when the request fails", async () => {
    server.use(
      http.put("/api/channels/techmasteryplus/subscription", () =>
        HttpResponse.json(
          { statusCode: 500, error: "INTERNAL", message: "fail" },
          { status: 500 }
        )
      )
    )

    const user = userEvent.setup()
    render(
      <ChannelPublicPage
        channel={channel}
        videos={videos}
        total={2}
        sort="latest"
        subscriberCount={4200}
        isSubscribed={false}
      />
    )

    await user.click(screen.getByRole("button", { name: "Subscribe" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Subscribe" })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    })
    expect(screen.getByText("4,200 subscribers")).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it("does not render the SubscribeButton when viewing one's own channel", () => {
    render(
      <ChannelPublicPage
        channel={channel}
        videos={videos}
        total={2}
        sort="latest"
        isOwnChannel
      />
    )

    expect(
      screen.queryByRole("button", { name: /^Subscribe/ })
    ).not.toBeInTheDocument()
  })

  it("renders the resolved thumbnail for a video card that has one", async () => {
    server.use(
      http.get("/api/videos/public/react19/thumbnail-url", () =>
        HttpResponse.json({ url: "https://storage.example.com/react19-thumb.png" })
      )
    )
    const videosWithThumbnail: PublicChannelVideoItem[] = [
      { ...videos[0], thumbnailKey: "thumbnails/react19.png" },
    ]

    render(
      <ChannelPublicPage
        channel={channel}
        videos={videosWithThumbnail}
        total={1}
        sort="latest"
      />
    )

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument())
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://storage.example.com/react19-thumb.png"
    )
  })

  it("renders no video-card image when no video has a thumbnail yet", () => {
    render(
      <ChannelPublicPage channel={channel} videos={videos} total={2} sort="latest" />
    )
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
