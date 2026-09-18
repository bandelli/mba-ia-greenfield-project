// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/mocks/server"
import type { Video } from "@/lib/api/contracts"
import { VideoEditForm } from "../video-edit-form"

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}))

beforeEach(() => {
  pushMock.mockClear()
  toastErrorMock.mockClear()
  // `VideoEditForm` now resolves the existing persisted thumbnail via
  // `VideoThumbnail` (owner scope) on every render — a default handler here
  // keeps that fetch from being reported as "unhandled" by every test in
  // this file, most of which aren't about the thumbnail at all.
  server.use(
    http.get("/api/videos/:id/thumbnail-url", () =>
      HttpResponse.json({ url: "https://storage.example.com/existing-thumb.png" })
    )
  )
})

const baseVideo: Video = {
  id: "video-1",
  public_id: "pub123",
  title: "My Awesome Tech Review",
  description: "A great video",
  category: "technology",
  visibility: "public",
  thumbnail_key: "thumbnails/video-1.png",
  status: "ready",
  published_at: null,
  updated_at: "2026-09-12T00:00:00.000Z",
}

function envelope(error: string, message: string) {
  return { statusCode: 400, error, message, code: null }
}

describe("<VideoEditForm />", () => {
  it("renders the persisted thumbnail when the video already has one", async () => {
    render(<VideoEditForm video={baseVideo} />)

    expect(
      await screen.findByRole("img", { name: "Current thumbnail" })
    ).toHaveAttribute("src", "https://storage.example.com/existing-thumb.png")
  })

  it("renders the placeholder icon (no image) for a video with no thumbnail yet", () => {
    render(<VideoEditForm video={{ ...baseVideo, thumbnail_key: null }} />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("submits the typed payload to PATCH /api/videos/:id and shows the Saved confirmation", async () => {
    const user = userEvent.setup()
    const received: Record<string, unknown>[] = []
    server.use(
      http.patch("/api/videos/:id", async ({ request }) => {
        received.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(baseVideo, { status: 200 })
      })
    )

    render(<VideoEditForm video={baseVideo} />)
    await user.clear(screen.getByLabelText("Title (required)"))
    await user.type(screen.getByLabelText("Title (required)"), "New title")
    await user.click(screen.getByRole("button", { name: "Save as draft" }))

    expect(await screen.findByText("Saved")).toBeInTheDocument()
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ title: "New title" })
  });

  it("submits to POST /api/videos/:id/publish and redirects on success", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/:id/publish", () =>
        HttpResponse.json(
          { ...baseVideo, published_at: "2026-09-12T00:00:00.000Z" },
          { status: 200 }
        )
      )
    )

    render(<VideoEditForm video={baseVideo} />)
    await user.click(screen.getByRole("button", { name: "Publish" }))

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dashboard/videos")
    )
  });

  it("maps VALIDATION_ERROR to an inline form-level error", async () => {
    const user = userEvent.setup()
    server.use(
      http.patch("/api/videos/:id", () =>
        HttpResponse.json(envelope("VALIDATION_ERROR", "Validation failed"), {
          status: 400,
        })
      )
    )

    render(<VideoEditForm video={baseVideo} />)
    await user.click(screen.getByRole("button", { name: "Save as draft" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Validation failed"
    )
    expect(pushMock).not.toHaveBeenCalled()
  });

  it("maps VIDEO_NOT_READY to a blocking toast on publish", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/:id/publish", () =>
        HttpResponse.json(
          envelope("VIDEO_NOT_READY", "Video is not ready"),
          { status: 400 }
        )
      )
    )

    render(<VideoEditForm video={baseVideo} />)
    await user.click(screen.getByRole("button", { name: "Publish" }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(pushMock).not.toHaveBeenCalled()
  });

  it("maps VIDEO_NOT_FOUND to a toast and redirects to the dashboard", async () => {
    const user = userEvent.setup()
    server.use(
      http.patch("/api/videos/:id", () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "Video not found", code: null },
          { status: 404 }
        )
      )
    )

    render(<VideoEditForm video={baseVideo} />)
    await user.click(screen.getByRole("button", { name: "Save as draft" }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(pushMock).toHaveBeenCalledWith("/dashboard/videos")
  });

  it("maps THUMBNAIL_INVALID_FILE (server-side) to an inline error beneath the thumbnail control", async () => {
    server.use(
      http.patch("/api/videos/:id/thumbnail", () =>
        HttpResponse.json(
          envelope("THUMBNAIL_INVALID_FILE", "Thumbnail rejected by server"),
          { status: 400 }
        )
      )
    )

    render(<VideoEditForm video={baseVideo} />)
    const file = new File(["fake-bytes"], "thumb.png", { type: "image/png" })
    const input = screen.getByLabelText("Thumbnail file") as HTMLInputElement
    await userEvent.upload(input, file)

    expect(
      await screen.findByText("Thumbnail rejected by server")
    ).toBeInTheDocument()
  });

  it("blocks submit with client-side validation and fires no request until valid", async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()
    server.use(
      http.patch("/api/videos/:id", () => {
        onCall()
        return HttpResponse.json(baseVideo, { status: 200 })
      })
    )

    render(<VideoEditForm video={{ ...baseVideo, title: null }} />)
    await user.click(screen.getByRole("button", { name: "Save as draft" }))

    expect(await screen.findByText("Title is required")).toBeInTheDocument()
    expect(onCall).not.toHaveBeenCalled()
  });

  it("rejects an oversized thumbnail client-side without an upload request", async () => {
    const onCall = vi.fn()
    server.use(
      http.patch("/api/videos/:id/thumbnail", () => {
        onCall()
        return HttpResponse.json(baseVideo, { status: 200 })
      })
    )

    render(<VideoEditForm video={baseVideo} />)
    const oversized = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "big.png",
      { type: "image/png" }
    )
    const input = screen.getByLabelText("Thumbnail file") as HTMLInputElement
    await userEvent.upload(input, oversized)

    expect(
      await screen.findByText("Image must be 5MB or smaller.")
    ).toBeInTheDocument()
    expect(onCall).not.toHaveBeenCalled()
  });
})
