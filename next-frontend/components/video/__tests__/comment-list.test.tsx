// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { CommentList } from "../comment-list"

// CommentItem (rendered inside CommentList) calls useRouter().
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const COMMENT = {
  id: "c1",
  body: "Great video!",
  author: { id: "u1", nickname: "dev" },
  createdAt: "2026-01-01T00:00:00.000Z",
  likesCount: 0,
  dislikesCount: 0,
  currentUserReaction: null,
}

describe("<CommentList />", () => {
  it("renders one row per top-level comment", () => {
    render(
      <CommentList
        publicId="abc123"
        items={[COMMENT, { ...COMMENT, id: "c2", body: "Second comment" }]}
      />
    )

    expect(screen.getByText("Great video!")).toBeInTheDocument()
    expect(screen.getByText("Second comment")).toBeInTheDocument()
  })

  it("renders the empty-state message when there are no comments", () => {
    render(<CommentList publicId="abc123" items={[]} />)

    expect(screen.getByText("No comments yet — be the first to comment")).toBeInTheDocument()
  })
})
