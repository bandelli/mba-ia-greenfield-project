// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { VideoPlayer } from "@/components/video/video-player"

// jsdom does not implement real media playback — HTMLMediaElement.play()
// throws "Not implemented" by default. Stubbed here since the component only
// needs the call to resolve, not to actually decode/play anything; the
// resulting `play`/`pause` events (non-bubbling, so React listens directly on
// the element) are fired manually per test via `fireEvent.play`/`fireEvent.pause`.
beforeAll(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()
})

describe("<VideoPlayer />", () => {
  it("toggles play and pause when the play/pause button is clicked", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <VideoPlayer src="https://storage.example.com/video.mp4" />
    )
    const video = container.querySelector("video") as HTMLVideoElement

    await user.click(screen.getByRole("button", { name: "Play" }))
    fireEvent.play(video)

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Pause" }))
    fireEvent.pause(video)

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument()
  })

  it("seeks the video when the progress bar is changed", () => {
    const { container } = render(
      <VideoPlayer src="https://storage.example.com/video.mp4" />
    )
    const video = container.querySelector("video") as HTMLVideoElement
    const progress = screen.getByLabelText("Video progress") as HTMLInputElement

    // The range's `max` is bound to duration state, 0 until metadata loads —
    // an unclamped value would be reset back to 0 by the input itself.
    Object.defineProperty(video, "duration", { value: 100, configurable: true })
    fireEvent.loadedMetadata(video)

    fireEvent.change(progress, { target: { value: "42" } })

    expect(video.currentTime).toBe(42)
  })

  it("changes the video's audio volume when the volume control is adjusted", () => {
    const { container } = render(
      <VideoPlayer src="https://storage.example.com/video.mp4" />
    )
    const video = container.querySelector("video") as HTMLVideoElement
    const volume = screen.getByLabelText("Volume")

    fireEvent.change(volume, { target: { value: "0.5" } })

    expect(video.volume).toBe(0.5)
  })
})
