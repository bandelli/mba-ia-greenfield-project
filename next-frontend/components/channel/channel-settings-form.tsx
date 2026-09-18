"use client"

import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlignLeftIcon } from "@/components/icons/align-left-icon"
import { ClockIcon } from "@/components/icons/clock-icon"
import { CircleCheckIcon } from "@/components/icons/circle-check-icon"
import { InfoIcon } from "@/components/icons/info-icon"
import { SubscribersIcon } from "@/components/icons/subscribers-icon"
import { VideoCountIcon } from "@/components/icons/video-count-icon"
import type { ApiErrorEnvelope, Channel } from "@/lib/api/contracts"

const DESCRIPTION_MAX_LENGTH = 5000

// Client-side validation mirror (per §API Contracts → Validation Rules).
const channelSettingsSchema = z.object({
  nickname: z
    .string()
    .regex(
      /^[a-z0-9_]+$/,
      "Nickname can only contain lowercase letters, numbers, and underscores"
    ),
  name: z
    .string()
    .min(1, "Channel name is required")
    .max(50, "Channel name must be at most 50 characters"),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
})

type ChannelSettingsValues = z.infer<typeof channelSettingsSchema>

// Local wire-shape type for the PATCH body. `UpdateChannelDto` (from
// contracts.ts) has no declared properties yet — same `ts-node`/swagger-plugin
// gap already documented for `UpdateVideoDto` since SI-04.6 — so this
// interface mirrors the real backend shape (nickname/name/description) to
// keep the request body type-checked at construction.
interface ChannelUpdatePayload {
  nickname: string
  name: string
  description?: string
}

function flattenMessage(message: ApiErrorEnvelope["message"]): string {
  return Array.isArray(message) ? message.join(" ") : message
}

// `Channel` (from contracts.ts, `GET /channels/me`'s response shape) carries
// no avatar, subscriber count, or video count — those subsystems don't exist
// yet (avatar upload was never in this phase's scope; subscriptions are
// Phase 06; the dashboard's own video count comes from a different endpoint's
// pagination `total`, not the channel entity). The stats row and avatar
// image are rendered only when the caller has them (optional props) rather
// than showing fabricated numbers.
export type ChannelSettingsFormProps = {
  channel: {
    nickname: Channel["nickname"]
    name: Channel["name"]
    description: Channel["description"]
    updated_at: string
  }
  avatarUrl?: string | null
  subscriberCount?: number
  videoCount?: number
}

function ChannelSettingsForm({
  channel,
  avatarUrl,
  subscriberCount,
  videoCount,
}: ChannelSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful, isValid, isDirty },
  } = useForm<ChannelSettingsValues>({
    resolver: zodResolver(channelSettingsSchema),
    mode: "onChange",
    defaultValues: {
      nickname: channel.nickname ?? "",
      name: channel.name ?? "",
      description: channel.description ?? "",
    },
  })

  const descriptionLength = watch("description")?.length ?? 0

  async function onSubmit(values: ChannelSettingsValues) {
    const body: ChannelUpdatePayload = {
      nickname: values.nickname,
      name: values.name,
      description: values.description,
    }

    const res = await fetch("/api/channels/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const envelope = (await res.json()) as ApiErrorEnvelope
      if (envelope.error === "CHANNEL_NICKNAME_TAKEN") {
        setError("nickname", {
          type: "server",
          message: "This nickname is already taken",
        })
        return
      }
      setError("root.serverError", {
        type: "server",
        message: flattenMessage(envelope.message),
      })
      return
    }

    // Re-baseline `defaultValues` to the just-submitted values so `isDirty`
    // goes back to false — without this, `isSubmitSuccessful` (and the
    // "Channel updated" message gated on it) would stay true indefinitely,
    // even after the user makes further unsaved edits. `keepIsSubmitSuccessful`
    // is what lets the confirmation show right now, for this submission.
    reset(values, { keepIsSubmitSuccessful: true })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-display text-foreground">Channel Settings</h1>

      <section className="overflow-hidden rounded-[var(--radius-3)] border border-border bg-popover">
        {/* Banner placeholder — no banner-image resolution wired yet (same open
            item as the dashboard's video thumbnails: the backend doesn't expose
            a public URL scheme for storage keys yet). */}
        <div className="h-20 bg-muted sm:h-32" />
        <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="relative -mt-16 size-32 shrink-0 overflow-hidden rounded-full border-4 border-popover bg-muted sm:-mt-12">
            {avatarUrl && <Image src={avatarUrl} alt="" fill className="object-cover" />}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-h1 text-foreground">{channel.name}</h2>
            <p className="text-body-md text-muted-foreground">@{channel.nickname}</p>
            {(subscriberCount !== undefined || videoCount !== undefined) && (
              <div className="flex items-center gap-4 text-body-md text-muted-foreground">
                {subscriberCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <SubscribersIcon className="size-3" />
                    {subscriberCount.toLocaleString("en-US")} subscribers
                  </span>
                )}
                {videoCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <VideoCountIcon className="size-3" />
                    {videoCount.toLocaleString("en-US")} videos
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-8 rounded-[var(--radius-3)] border border-border bg-popover p-8"
      >
        {errors.root?.serverError?.message && (
          <p role="alert" className="text-caption text-destructive" data-slot="form-error">
            {errors.root.serverError.message}
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h3 className="flex items-center gap-2 text-h2 text-foreground">
            <InfoIcon className="size-5 text-link" />
            Basic Information
          </h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="channel-nickname">Nickname</Label>
              <Input
                id="channel-nickname"
                aria-invalid={!!errors.nickname}
                {...register("nickname")}
              />
              {errors.nickname?.message ? (
                <p className="text-caption text-destructive">{errors.nickname.message}</p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  Your unique identifier on StreamTube
                </p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input id="channel-name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name?.message ? (
                <p className="text-caption text-destructive">{errors.name.message}</p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  The name that appears on your channel
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h3 className="flex items-center gap-2 text-h2 text-foreground">
            <AlignLeftIcon className="size-5 text-link" />
            About Channel
          </h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-description">Description</Label>
            <Textarea
              id="channel-description"
              className="min-h-48"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="text-caption text-destructive">{errors.description.message}</p>
            )}
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <span>Describe your channel in up to {DESCRIPTION_MAX_LENGTH} characters</span>
              <span>
                {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-border pt-6">
          <span className="flex items-center gap-2 text-caption text-muted-foreground">
            <ClockIcon className="size-3" />
            Last updated:{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
              new Date(channel.updated_at)
            )}
          </span>
          <div className="flex items-center gap-3">
            {isSubmitSuccessful && !isDirty && (
              <p
                role="status"
                className="flex items-center gap-2 text-caption text-muted-foreground"
              >
                <CircleCheckIcon className="size-3 text-success-200" />
                Channel updated
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="action"
              disabled={isSubmitting}
              onClick={() => reset()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="action"
              disabled={isSubmitting || !isValid}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export { ChannelSettingsForm }
