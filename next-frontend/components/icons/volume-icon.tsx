import * as React from "react"
import { cn } from "@/lib/utils"

// No decomposed player-control layer exists in the Figma source (the watch
// page's video area is a single flat thumbnail image) — hand-authored as a
// standard "volume" glyph, matching the project's other hand-authored icons
// (e.g. more-vertical-icon.tsx) where no Figma asset was available.
function VolumeIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        d="M16 8.5a5 5 0 0 1 0 7"
      />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        d="M19 5.5a10 10 0 0 1 0 13"
      />
    </svg>
  )
}

export { VolumeIcon }
