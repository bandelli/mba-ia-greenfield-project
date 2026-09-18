"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as tus from "tus-js-client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CameraIcon } from "@/components/icons/camera-icon"
import { CloseIcon } from "@/components/icons/close-icon"

// tus-js-client's own default (no chunkSize set) sends the whole file as one
// request — wrong for files up to 10GB (phase-03-videos/TD-06): one giant
// PATCH is hard to resume mid-chunk and harder for the BFF proxy
// (lib/api/tus-proxy.ts) to stream cleanly. 50MiB balances request-count
// overhead against resumability granularity.
const CHUNK_SIZE_BYTES = 50 * 1024 * 1024
const RETRY_DELAYS_MS = [0, 3000, 5000, 10000, 20000]

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; percent: number }
  | { status: "error"; message: string }

function VideoUploadForm() {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const uploadRef = React.useRef<tus.Upload | null>(null)
  const [state, setState] = React.useState<UploadState>({ status: "idle" })

  function startUpload(file: File) {
    if (!file.type.startsWith("video/")) {
      setState({
        status: "error",
        message: "Please choose a video file.",
      })
      return
    }

    setState({ status: "uploading", percent: 0 })

    const upload = new tus.Upload(file, {
      endpoint: "/api/videos/uploads",
      metadata: { filename: file.name, filetype: file.type },
      chunkSize: CHUNK_SIZE_BYTES,
      retryDelays: RETRY_DELAYS_MS,
      onProgress(bytesSent, bytesTotal) {
        setState({
          status: "uploading",
          percent: Math.round((bytesSent / bytesTotal) * 100),
        })
      },
      onSuccess(payload) {
        const publicId = payload.lastResponse.getHeader("X-Video-Public-Id")
        if (!publicId) {
          setState({
            status: "error",
            message: "Upload finished, but the video could not be found.",
          })
          return
        }
        router.push(`/dashboard/videos/${publicId}/edit`)
      },
      onError(error) {
        toast.error("Something went wrong uploading the video.")
        setState({ status: "error", message: error.message })
      },
    })

    uploadRef.current = upload
    upload.start()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    startUpload(file)
  }

  function handleCancel() {
    uploadRef.current?.abort()
    uploadRef.current = null
    setState({ status: "idle" })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        aria-label="Video file"
        className="hidden"
        onChange={handleFileChange}
      />

      {state.status === "idle" && (
        <Button
          type="button"
          size="action"
          onClick={() => fileInputRef.current?.click()}
        >
          <CameraIcon />
          Choose video
        </Button>
      )}

      {state.status === "uploading" && (
        <div className="flex flex-col gap-2">
          <Progress value={state.percent} />
          <div className="flex items-center justify-between">
            <span className="text-helper text-muted-foreground">
              Uploading… {state.percent}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="action"
              onClick={handleCancel}
            >
              <CloseIcon />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-helper text-destructive">{state.message}</p>
          <Button
            type="button"
            size="action"
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon />
            Choose video
          </Button>
        </div>
      )}
    </div>
  )
}

export { VideoUploadForm }
