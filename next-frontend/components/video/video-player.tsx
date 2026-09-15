"use client"

import { useEffect, useRef, useState } from "react"

import { IconButton } from "@/components/ui/icon-button"
import { PauseIcon } from "@/components/icons/pause-icon"
import { PlayIcon } from "@/components/icons/play-icon"
import { VolumeIcon } from "@/components/icons/volume-icon"

export type VideoPlayerProps = {
  src: string
}

// Native <video> + fully custom controls (per phase-05-video-watch-page/TD-04)
// — a single progressive-MP4 presigned URL, so no adaptive-streaming library
// is warranted. Play/pause/volume/seek are wired directly against the
// HTMLMediaElement via a ref; both range inputs are plain native elements
// (TD-04 explicitly specifies `<input type="range">`, not a DS primitive).
function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  // Safety net for a real race: `loadedmetadata` fires only once and can
  // fire before React finishes hydrating this component (e.g. a small or
  // already-cached video loads faster than hydration completes), which
  // silently drops the event and leaves `duration` at 0 forever. If
  // metadata is already available by the time this effect runs, read it
  // directly off the element instead of waiting for an event that already
  // happened.
  useEffect(() => {
    const video = videoRef.current
    if (video && video.readyState >= 1) {
      setDuration(video.duration)
    }
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    const time = Number(event.target.value)
    if (video) {
      video.currentTime = time
    }
    setCurrentTime(time)
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    const nextVolume = Number(event.target.value)
    if (video) {
      video.volume = nextVolume
    }
    setVolume(nextVolume)
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-3)] bg-black">
      <video
        ref={videoRef}
        className="size-full object-contain"
        src={src}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3">
        <input
          type="range"
          aria-label="Video progress"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="h-1 w-full accent-red-600"
        />

        <div className="flex items-center gap-2">
          <IconButton
            aria-label={isPlaying ? "Pause" : "Play"}
            variant="ghost"
            size="sm"
            onClick={togglePlay}
          >
            {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </IconButton>

          <VolumeIcon className="size-5 text-white" aria-hidden="true" />
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-white"
          />
        </div>
      </div>
    </div>
  )
}

export { VideoPlayer }
