import * as React from "react"
import { cn } from "@/lib/utils"

function CameraIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M4.077 1.772 3.793 2.625H1.75A1.75 1.75 0 0 0 0 4.375v7A1.75 1.75 0 0 0 1.75 13.125h10.5A1.75 1.75 0 0 0 14 11.375v-7a1.75 1.75 0 0 0-1.75-1.75h-2.043l-.284-.853A1.313 1.313 0 0 0 8.679.875H5.321a1.313 1.313 0 0 0-1.244.897ZM7 5.25a2.625 2.625 0 1 1 0 5.25 2.625 2.625 0 0 1 0-5.25Z"
      />
    </svg>
  )
}

export { CameraIcon }
