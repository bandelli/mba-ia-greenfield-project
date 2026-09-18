import { redirect } from "next/navigation"

import { VideoUploadForm } from "@/components/video/video-upload-form"
import { getSession } from "@/lib/auth/session"

export default async function UploadVideoPage() {
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-display text-foreground">Upload Video</h1>
      <VideoUploadForm />
    </div>
  )
}
