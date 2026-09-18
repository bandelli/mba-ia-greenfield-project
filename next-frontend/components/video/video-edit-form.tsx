"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CameraIcon } from "@/components/icons/camera-icon"
import { CircleCheckIcon } from "@/components/icons/circle-check-icon"
import { CopyIcon } from "@/components/icons/copy-icon"
import { GlobeIcon } from "@/components/icons/globe-icon"
import { ImageIcon } from "@/components/icons/image-icon"
import { LinkIcon } from "@/components/icons/link-icon"
import { PlayIcon } from "@/components/icons/play-icon"
import type { ApiErrorEnvelope, Video } from "@/lib/api/contracts"
import { cn } from "@/lib/utils"

const CATEGORY_OPTIONS = [
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "news", label: "News" },
  { value: "sports", label: "Sports" },
  { value: "technology", label: "Science & Technology" },
  { value: "other", label: "Other" },
] as const

const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024
const THUMBNAIL_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

// Client-side validation mirror (per §API Contracts → Validation Rules).
// `title` is additionally required client-side (Figma: "Title (required)")
// even though the upstream DTO field is optional — a stricter, compatible
// subset of the API contract, not a divergence from it.
const editVideoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be at most 5000 characters")
    .optional(),
  category: z.enum(CATEGORY_OPTIONS.map((option) => option.value) as [
    string,
    ...string[],
  ]),
  visibility: z.enum(["public", "unlisted"]),
})

type EditVideoValues = z.infer<typeof editVideoSchema>

// Local wire-shape type for the PATCH/publish body. `UpdateVideoDto` (from
// contracts.ts) has no declared properties yet — the openapi:export script
// runs under plain ts-node, so the DTO's class-validator fields aren't
// introspected — so it type-checks as `Record<string, never>` and can't be
// used to catch a typo'd/renamed field here. This interface mirrors the
// real backend UpdateVideoDto shape (title/description/category/visibility)
// so the request body is still fully type-checked at construction.
interface VideoEditPayload {
  title: string
  description?: string
  category: EditVideoValues["category"]
  visibility: EditVideoValues["visibility"]
}

function flattenMessage(message: ApiErrorEnvelope["message"]): string {
  return Array.isArray(message) ? message.join(" ") : message
}

function VideoEditForm({ video }: { video: Video }) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [saved, setSaved] = React.useState(false)
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(
    null
  )
  const [thumbnailPreview, setThumbnailPreview] = React.useState<
    string | null
  >(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditVideoValues>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: {
      title: video.title ?? "",
      description: video.description ?? "",
      category: (video.category as EditVideoValues["category"]) ?? "other",
      visibility:
        (video.visibility as EditVideoValues["visibility"]) ?? "public",
    },
  })

  async function submitVideo(
    values: EditVideoValues,
    action: "draft" | "publish"
  ) {
    setSaved(false)
    const path =
      action === "draft"
        ? `/api/videos/${video.public_id}`
        : `/api/videos/${video.public_id}/publish`
    const body: VideoEditPayload = {
      title: values.title,
      description: values.description,
      category: values.category,
      visibility: values.visibility,
    }

    const res = await fetch(path, {
      method: action === "draft" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const envelope = (await res.json()) as ApiErrorEnvelope
      if (envelope.error === "VALIDATION_ERROR") {
        setError("root.serverError", {
          type: "server",
          message: flattenMessage(envelope.message),
        })
        return
      }
      if (envelope.error === "VIDEO_NOT_READY") {
        toast.error(
          "This video is still processing — try publishing again once it's ready."
        )
        return
      }
      if (envelope.error === "VIDEO_NOT_FOUND") {
        toast.error("This video could not be found.")
        router.push("/dashboard/videos")
        return
      }
      setError("root.serverError", {
        type: "server",
        message: flattenMessage(envelope.message),
      })
      return
    }

    if (action === "draft") {
      setSaved(true)
    } else {
      router.push("/dashboard/videos")
    }
  }

  async function handleThumbnailChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!THUMBNAIL_ACCEPTED_TYPES.includes(file.type)) {
      setThumbnailError("Please choose a JPEG, PNG, or WEBP image.")
      return
    }
    if (file.size > THUMBNAIL_MAX_BYTES) {
      setThumbnailError("Image must be 5MB or smaller.")
      return
    }
    setThumbnailError(null)

    const formData = new FormData()
    formData.set("thumbnail", file)

    const res = await fetch(`/api/videos/${video.public_id}/thumbnail`, {
      method: "PATCH",
      body: formData,
    })

    if (!res.ok) {
      const envelope = (await res.json()) as ApiErrorEnvelope
      if (envelope.error === "THUMBNAIL_INVALID_FILE") {
        setThumbnailError(flattenMessage(envelope.message))
        return
      }
      if (envelope.error === "VIDEO_NOT_FOUND") {
        toast.error("This video could not be found.")
        router.push("/dashboard/videos")
        return
      }
      toast.error("Something went wrong uploading the thumbnail.")
      return
    }

    setThumbnailPreview(URL.createObjectURL(file))
  }

  return (
    <div className="rounded-[var(--radius-3)] border border-border bg-card p-8">
      {errors.root?.serverError?.message && (
        <p
          role="alert"
          className="mb-6 text-caption text-destructive"
          data-slot="form-error"
        >
          {errors.root.serverError.message}
        </p>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
        <div className="flex flex-1 flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h3 className="text-h2 text-foreground">Details</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="video-title">Title (required)</Label>
              <Input
                id="video-title"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title?.message && (
                <p className="text-caption text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                className="min-h-40"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description?.message && (
                <p className="text-caption text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-h3 text-foreground">Thumbnail</h3>
              <p className="text-caption text-muted-foreground">
                Select or upload a picture that shows what&apos;s in your video.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex h-36 w-64 items-center justify-center overflow-hidden rounded-[var(--radius-2)] border border-border bg-input-background">
                {thumbnailPreview ? (
                  <Image
                    src={thumbnailPreview}
                    alt="Selected thumbnail preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CameraIcon className="size-3.5" />
                  Change Thumbnail
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Thumbnail file"
                  onChange={handleThumbnailChange}
                />
                {thumbnailError && (
                  <p className="text-caption text-destructive">
                    {thumbnailError}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-h3 text-foreground">Category</h3>
              <p className="text-caption text-muted-foreground">
                Add your video to a category so viewers can find it more easily.
              </p>
            </div>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className="w-full max-w-sm"
                    aria-invalid={!!errors.category}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-6">
            <div>
              <h3 className="text-h3 text-foreground">Visibility</h3>
              <p className="text-caption text-muted-foreground">
                Choose who can see your video.
              </p>
            </div>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="max-w-lg"
                >
                  <Label
                    htmlFor="visibility-public"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-[var(--radius-2)] border border-border bg-input-background p-4"
                    )}
                  >
                    <RadioGroupItem
                      id="visibility-public"
                      value="public"
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-label-md text-foreground">
                        <GlobeIcon className="size-3.5" />
                        Public
                      </span>
                      <span className="text-caption text-muted-foreground">
                        Everyone can see your video
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor="visibility-unlisted"
                    className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-2)] border border-border bg-input-background p-4"
                  >
                    <RadioGroupItem
                      id="visibility-unlisted"
                      value="unlisted"
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-label-md text-foreground">
                        <LinkIcon className="size-3.5" />
                        Unlisted
                      </span>
                      <span className="text-caption text-muted-foreground">
                        Anyone with the video link can watch your video
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
              )}
            />
          </section>
        </div>

        <aside className="w-full shrink-0 overflow-hidden rounded-[var(--radius-3)] border border-border bg-popover lg:w-80">
          <div className="m-4 flex aspect-video items-center justify-center rounded-[var(--radius-2)] bg-almost-black-1000">
            <PlayIcon className="size-9 text-neutral-100/50" />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-helper font-weight-700 text-muted-foreground">
                Video link
              </p>
              <div className="flex items-center justify-between gap-2">
                <a
                  href={`/v/${video.public_id}`}
                  className="truncate text-body-md text-link"
                >
                  {`streamtube.com/v/${video.public_id}`}
                </a>
                <button type="button" aria-label="Copy video link">
                  <CopyIcon className="size-4 text-foreground" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <p className="text-helper font-weight-700 text-muted-foreground">
                Status
              </p>
              <p
                data-testid="video-status"
                className="text-caption text-muted-foreground"
              >
                {video.status}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          {saved && (
            <>
              <CircleCheckIcon className="size-3 text-success-200" />
              Saved
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit((values) => submitVideo(values, "draft"))}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleSubmit((values) => submitVideo(values, "publish"))}
          >
            Publish
          </Button>
        </div>
      </div>
    </div>
  )
}

export { VideoEditForm }
