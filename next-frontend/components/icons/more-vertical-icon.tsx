import * as React from "react"
import { cn } from "@/lib/utils"

// No Figma asset was exported for this glyph (get_design_context returned an empty
// placeholder for the VideoRowMenuButton trigger) — hand-authored as a standard
// 3-dot "more actions" indicator matching the trigger's 4x16 bounding box.
function MoreVerticalIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 4 16"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <circle cx="2" cy="2" r="2" fill="currentColor" />
      <circle cx="2" cy="8" r="2" fill="currentColor" />
      <circle cx="2" cy="14" r="2" fill="currentColor" />
    </svg>
  )
}

export { MoreVerticalIcon }
