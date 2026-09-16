"use client"

import { useOptimistic, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { ApiErrorEnvelope } from "@/lib/api/contracts"

const BODY_MAX_LENGTH = 2000

export type CommentFormProps = {
  publicId: string
}

// Reference implementation of the canonical social-action pattern (per
// social-interactions/TD-06 § Frontend Runtime → Setup): useOptimistic +
// startTransition + fetch + router.refresh(). Here the "assumed end-state"
// is a cleared input — submitting optimistically empties the field before
// the request resolves, and a failed request reverts it (React resyncs
// useOptimistic's value back to the untouched real state automatically).
function CommentForm({ publicId }: CommentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState("")
  const [optimisticBody, setOptimisticBody] = useOptimistic(
    body,
    (_state: string, next: string) => next
  )
  const [serverError, setServerError] = useState<string | null>(null)

  const trimmed = body.trim()
  const isValid = trimmed.length > 0 && trimmed.length <= BODY_MAX_LENGTH

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) return
    const value = body

    startTransition(async () => {
      setOptimisticBody("")
      setServerError(null)

      const res = await fetch(`/api/videos/public/${publicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: value }),
      })

      if (!res.ok) {
        const envelope = (await res.json()) as ApiErrorEnvelope
        const message = Array.isArray(envelope.message)
          ? envelope.message.join(" ")
          : envelope.message
        setServerError(message)
        return
      }

      setBody("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex gap-4">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <input
          value={optimisticBody}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment..."
          maxLength={BODY_MAX_LENGTH}
          disabled={isPending}
          className="w-full border-b border-border bg-transparent pb-2 text-body-md text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {serverError && (
        <p className="pl-14 text-helper text-destructive">{serverError}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !isValid}>
          Comment
        </Button>
      </div>
    </form>
  )
}

export { CommentForm }
