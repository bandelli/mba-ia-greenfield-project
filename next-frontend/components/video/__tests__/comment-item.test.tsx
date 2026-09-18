// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"
import { CommentItem } from "../comment-item"

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

beforeEach(() => {
  refreshMock.mockClear()
})

const BASE_PROPS = {
  publicId: "abc123",
  id: "comment-1",
  body: "This is exactly what I needed!",
  author: { id: "u1", nickname: "DevStudent99" },
  createdAt: "2026-01-01T00:00:00.000Z",
  likesCount: 245,
  dislikesCount: 0,
  currentUserReaction: null,
}

describe("<CommentItem />", () => {
  it("renders author, text, relative time, and counts", () => {
    render(<CommentItem {...BASE_PROPS} />)

    expect(screen.getByText("@DevStudent99")).toBeInTheDocument()
    expect(screen.getByText("This is exactly what I needed!")).toBeInTheDocument()
    expect(screen.getByText("245")).toBeInTheDocument()
  })

  it("toggles the inline reply composer open and closed", async () => {
    const user = userEvent.setup()
    render(<CommentItem {...BASE_PROPS} />)

    expect(screen.queryByPlaceholderText("Add a reply...")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Reply" }))
    expect(screen.getByPlaceholderText("Add a reply...")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Reply" }))
    expect(screen.queryByPlaceholderText("Add a reply...")).not.toBeInTheDocument()
  })

  it("posts a reply and refreshes the page on success", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/public/abc123/comments/comment-1/replies", () =>
        HttpResponse.json(
          {
            id: "reply-1",
            body: "Totally agree!",
            author: { id: "u2", nickname: "AnotherUser" },
          },
          { status: 201 }
        )
      )
    )

    render(<CommentItem {...BASE_PROPS} />)
    await user.click(screen.getByRole("button", { name: "Reply" }))
    await user.type(screen.getByPlaceholderText("Add a reply..."), "Totally agree!")
    await user.click(screen.getByRole("button", { name: "Post reply" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
    expect(screen.queryByPlaceholderText("Add a reply...")).not.toBeInTheDocument()
  })

  it("does not render the Reply action on a reply (depth-1 cap)", () => {
    render(<CommentItem {...BASE_PROPS} isReply />)

    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument()
  })

  it("renders nested replies without their own Reply action", () => {
    render(
      <CommentItem
        {...BASE_PROPS}
        replies={[
          {
            id: "reply-1",
            body: "Totally agree!",
            author: { id: "u2", nickname: "AnotherUser" },
            createdAt: "2026-01-02T00:00:00.000Z",
            likesCount: 0,
            dislikesCount: 0,
            currentUserReaction: null,
          },
        ]}
      />
    )

    expect(screen.getByText("Totally agree!")).toBeInTheDocument()
    // Only the top-level comment's own Reply button should exist — the
    // rendered reply must not show a second one.
    expect(screen.getAllByRole("button", { name: "Reply" })).toHaveLength(1)
  })

  it("applies the optimistic like state immediately, before the fetch resolves", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/comments/comment-1/reaction", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return HttpResponse.json({ type: "like", likesCount: 246, dislikesCount: 0 })
      })
    )

    render(<CommentItem {...BASE_PROPS} />)
    await user.click(screen.getByRole("button", { name: "Like comment" }))

    // Optimistic UI is applied synchronously on click, while the fetch above
    // is still in flight (it won't resolve for another 30ms).
    expect(screen.getByRole("button", { name: "Like comment" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByText("246")).toBeInTheDocument()

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
  })

  it("reverts the optimistic like state when the request fails", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/comments/comment-1/reaction", () =>
        HttpResponse.json({ statusCode: 401, error: "UNAUTHORIZED", message: "" }, { status: 401 })
      )
    )

    render(<CommentItem {...BASE_PROPS} />)
    await user.click(screen.getByRole("button", { name: "Like comment" }))

    expect(await screen.findByText("245")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Like comment" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it("resyncs the displayed counts and reaction when the parent re-renders with new props", () => {
    const { rerender } = render(<CommentItem {...BASE_PROPS} />)
    expect(screen.getByText("245")).toBeInTheDocument()

    rerender(
      <CommentItem
        {...BASE_PROPS}
        likesCount={300}
        dislikesCount={2}
        currentUserReaction="dislike"
      />
    )

    expect(screen.getByText("300")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dislike comment" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("shows an error and keeps the composer open when the reply request fails", async () => {
    const user = userEvent.setup()
    server.use(
      http.post(
        "/api/videos/public/abc123/comments/comment-1/replies",
        () =>
          HttpResponse.json(
            { statusCode: 401, error: "UNAUTHORIZED", message: "Session expired" },
            { status: 401 }
          )
      )
    )

    render(<CommentItem {...BASE_PROPS} />)
    await user.click(screen.getByRole("button", { name: "Reply" }))
    await user.type(screen.getByPlaceholderText("Add a reply..."), "Totally agree!")
    await user.click(screen.getByRole("button", { name: "Post reply" }))

    expect(await screen.findByText("Session expired")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Add a reply...")).toHaveValue("Totally agree!")
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
