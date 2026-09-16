// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"
import { CommentForm } from "../comment-form"

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

beforeEach(() => {
  refreshMock.mockClear()
})

function envelope(statusCode: number, error: string, message: string) {
  return { statusCode, error, message, code: null }
}

describe("<CommentForm />", () => {
  it("disables submit while empty and enables it once text is typed", async () => {
    const user = userEvent.setup()
    render(<CommentForm publicId="abc123" />)

    const submit = screen.getByRole("button", { name: "Comment" })
    await user.type(screen.getByPlaceholderText("Add a comment..."), "Great video!")

    expect(submit).not.toBeDisabled()
  })

  it("posts the typed body to the BFF route and refreshes on success", async () => {
    const user = userEvent.setup()
    const received: Record<string, unknown>[] = []
    server.use(
      http.post("/api/videos/public/abc123/comments", async ({ request }) => {
        received.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(
          { id: "c1", body: "Great video!", author: { id: "u1", nickname: "dev" } },
          { status: 201 }
        )
      })
    )

    render(<CommentForm publicId="abc123" />)
    await user.type(screen.getByPlaceholderText("Add a comment..."), "Great video!")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ body: "Great video!" })
    expect(refreshMock).toHaveBeenCalledOnce()
  })

  it("maps a validation error response to an inline message", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/public/abc123/comments", () =>
        HttpResponse.json(envelope(400, "VALIDATION_ERROR", "Comment can't be empty"), {
          status: 400,
        })
      )
    )

    render(<CommentForm publicId="abc123" />)
    await user.type(screen.getByPlaceholderText("Add a comment..."), "x")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    expect(await screen.findByText("Comment can't be empty")).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
