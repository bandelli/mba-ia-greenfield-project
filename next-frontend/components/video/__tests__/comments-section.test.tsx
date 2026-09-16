// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { CommentsSection } from "../comments-section"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe("<CommentsSection />", () => {
  it("renders the real comment count in the heading", () => {
    render(<CommentsSection publicId="abc123" total={3} items={[]} />)

    expect(screen.getByRole("heading", { name: "3 Comments" })).toBeInTheDocument()
  })

  it("uses singular 'Comment' when the count is 1", () => {
    render(<CommentsSection publicId="abc123" total={1} items={[]} />)

    expect(screen.getByRole("heading", { name: "1 Comment" })).toBeInTheDocument()
  })

  it("composes CommentForm and CommentList", () => {
    render(
      <CommentsSection
        publicId="abc123"
        total={1}
        items={[
          {
            id: "c1",
            body: "Nice!",
            author: { id: "u1", nickname: "dev" },
            createdAt: "2026-01-01T00:00:00.000Z",
            likesCount: 0,
            dislikesCount: 0,
            currentUserReaction: null,
          },
        ]}
      />
    )

    expect(screen.getByPlaceholderText("Add a comment...")).toBeInTheDocument()
    expect(screen.getByText("Nice!")).toBeInTheDocument()
  })
})
