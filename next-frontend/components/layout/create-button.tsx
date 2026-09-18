import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CameraIcon } from "@/components/icons/camera-icon"

// Reuses the existing (Phase 04) upload flow entry point — no new capability
// this phase, just a second entry point into the same destination.
function CreateButton() {
  return (
    <Button asChild variant="secondary" size="icon" aria-label="Create video">
      <Link href="/dashboard/videos/upload">
        <CameraIcon />
      </Link>
    </Button>
  )
}

export { CreateButton }
