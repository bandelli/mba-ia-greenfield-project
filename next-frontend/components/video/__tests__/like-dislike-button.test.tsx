// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"
import { LikeDislikeButton } from "../like-dislike-button"

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

beforeEach(() => {
  refreshMock.mockClear()
})

describe("<LikeDislikeButton />", () => {
  it("applies the optimistic state immediately, before the fetch resolves", async () => {
    server.use(
      http.put("/api/videos/public/abc123/reaction", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return HttpResponse.json({ type: "like", likesCount: 11, dislikesCount: 0 })
      })
    )

    const user = userEvent.setup()
    render(
      <LikeDislikeButton
        publicId="abc123"
        likesCount={10}
        dislikesCount={0}
        currentUserReaction={null}
      />
    )

    await user.click(screen.getByRole("button", { name: "Like" }))

    // Optimistic UI is applied synchronously on click, while the fetch above
    // is still in flight (it won't resolve for another 30ms).
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByText("11")).toBeInTheDocument()

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
  })

  it("reverts the optimistic state when the request fails", async () => {
    server.use(
      http.put("/api/videos/public/abc123/reaction", () =>
        HttpResponse.json(
          { statusCode: 500, error: "INTERNAL", message: "fail" },
          { status: 500 }
        )
      )
    )

    const user = userEvent.setup()
    render(
      <LikeDislikeButton
        publicId="abc123"
        likesCount={10}
        dislikesCount={0}
        currentUserReaction={null}
      />
    )

    await user.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    })
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  // These two assert mid-transition (fetch deliberately delayed), the same
  // way the first test does — `useOptimistic`'s value only holds while a
  // transition is pending; once it settles, React resyncs to the real
  // `currentUserReaction`/`likesCount`/`dislikesCount` props, which a bare
  // unit test never updates (that update flow is `router.refresh()`
  // re-fetching real server data, out of scope for this isolated render).
  it("switches from like to dislike in a single click, updating both counts", async () => {
    server.use(
      http.put("/api/videos/public/abc123/reaction", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return HttpResponse.json({ type: "dislike", likesCount: 9, dislikesCount: 1 })
      })
    )

    const user = userEvent.setup()
    render(
      <LikeDislikeButton
        publicId="abc123"
        likesCount={10}
        dislikesCount={0}
        currentUserReaction="like"
      />
    )

    await user.click(screen.getByRole("button", { name: "Dislike" }))

    expect(screen.getByRole("button", { name: "Dislike" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(screen.getByText("9")).toBeInTheDocument()

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
  })

  it("clicking the already-active reaction clears it (idempotent toggle-off)", async () => {
    server.use(
      http.put("/api/videos/public/abc123/reaction", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return HttpResponse.json({ type: null, likesCount: 9, dislikesCount: 0 })
      })
    )

    const user = userEvent.setup()
    render(
      <LikeDislikeButton
        publicId="abc123"
        likesCount={10}
        dislikesCount={0}
        currentUserReaction="like"
      />
    )

    await user.click(screen.getByRole("button", { name: "Like" }))

    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(screen.getByText("9")).toBeInTheDocument()

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
  })
})
