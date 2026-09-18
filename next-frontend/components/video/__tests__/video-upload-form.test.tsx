// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { VideoUploadForm } from "../video-upload-form"

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}))

// tus-js-client is a stateful, multi-request (POST -> HEAD -> PATCH...)
// binary-protocol client — not a single fetch MSW can fixture cleanly at
// the component-unit layer (per mock-health-rules.md's "no Node/jsdom-
// practical implementation" carve-out, same treatment as next/navigation
// above). The real mechanics are covered end-to-end by
// tests/full-stack/upload-to-watch.e2e-spec.ts instead.
type CapturedOptions = {
  endpoint: string
  metadata: Record<string, string>
  onProgress: (bytesSent: number, bytesTotal: number) => void
  onSuccess: (payload: { lastResponse: { getHeader: (name: string) => string | undefined } }) => void
  onError: (error: Error) => void
}

const { uploadInstances, startMock, abortMock } = vi.hoisted(() => ({
  uploadInstances: [] as CapturedOptions[],
  startMock: vi.fn(),
  abortMock: vi.fn(),
}))

vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(_file: File, options: CapturedOptions) {
      uploadInstances.push(options)
    }
    start = startMock
    abort = abortMock
  },
}))

beforeEach(() => {
  pushMock.mockClear()
  toastErrorMock.mockClear()
  startMock.mockClear()
  abortMock.mockClear()
  uploadInstances.length = 0
})

function selectFile(file: File) {
  const input = screen.getByLabelText("Video file") as HTMLInputElement
  return userEvent.upload(input, file)
}

describe("<VideoUploadForm />", () => {
  it("rejects a non-video file client-side without starting an upload", async () => {
    render(<VideoUploadForm />)
    const file = new File(["not a video"], "doc.pdf", {
      type: "application/pdf",
    })
    // fireEvent.change (not userEvent.upload) — user-event v14 filters
    // files against the input's `accept` attribute before firing, but this
    // test exists precisely to verify the JS-level fallback for a file that
    // bypasses that hint (e.g. drag-and-drop, or "All Files" in the native
    // picker) — the browser's `accept` is UX only, not a security boundary.
    const input = screen.getByLabelText("Video file")
    fireEvent.change(input, { target: { files: [file] } })

    expect(
      await screen.findByText("Please choose a video file.")
    ).toBeInTheDocument()
    expect(uploadInstances).toHaveLength(0)
  })

  it("starts a tus upload with the right endpoint and metadata for a valid file", async () => {
    render(<VideoUploadForm />)
    const file = new File(["fake-bytes"], "clip.mp4", { type: "video/mp4" })

    await selectFile(file)

    expect(uploadInstances).toHaveLength(1)
    expect(uploadInstances[0].endpoint).toBe("/api/videos/uploads")
    expect(uploadInstances[0].metadata).toMatchObject({
      filename: "clip.mp4",
      filetype: "video/mp4",
    })
    expect(startMock).toHaveBeenCalledTimes(1)
  })

  it("shows upload progress reported by onProgress", async () => {
    render(<VideoUploadForm />)
    const file = new File(["fake-bytes"], "clip.mp4", { type: "video/mp4" })
    await selectFile(file)

    uploadInstances[0].onProgress(50, 100)

    expect(await screen.findByText("Uploading… 50%")).toBeInTheDocument()
  })

  it("aborts the upload when Cancel is clicked", async () => {
    const user = userEvent.setup()
    render(<VideoUploadForm />)
    const file = new File(["fake-bytes"], "clip.mp4", { type: "video/mp4" })
    await selectFile(file)

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(abortMock).toHaveBeenCalledTimes(1)
  })

  it("shows a toast and an error state when the upload fails", async () => {
    render(<VideoUploadForm />)
    const file = new File(["fake-bytes"], "clip.mp4", { type: "video/mp4" })
    await selectFile(file)

    uploadInstances[0].onError(new Error("network dropped"))

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Something went wrong uploading the video."
    )
    expect(await screen.findByText("network dropped")).toBeInTheDocument()
  })

  it("redirects to the edit page using the X-Video-Public-Id response header on success", async () => {
    render(<VideoUploadForm />)
    const file = new File(["fake-bytes"], "clip.mp4", { type: "video/mp4" })
    await selectFile(file)

    uploadInstances[0].onSuccess({
      lastResponse: { getHeader: () => "pub999" },
    })

    expect(pushMock).toHaveBeenCalledWith("/dashboard/videos/pub999/edit")
  })
})
