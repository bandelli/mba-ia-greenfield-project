import { notFound, redirect } from "next/navigation"

import { VideoEditForm } from "@/components/video/video-edit-form"
import type { Video } from "@/lib/api/contracts"
import { upstream } from "@/lib/api/upstream"
import { getSession } from "@/lib/auth/session"

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect("/login")
  }

  const { data, error } = await upstream.GET("/videos/{id}", {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (error) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-display text-foreground">Publish / Edit Video</h1>
      <VideoEditForm video={data as Video} />
    </div>
  )
}
