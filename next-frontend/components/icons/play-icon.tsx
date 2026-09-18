import * as React from "react"
import { cn } from "@/lib/utils"

function PlayIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 27 36"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M5.133 2.742a2.813 2.813 0 0 0-3.41-.063A2.813 2.813 0 0 0 0 5.625v24.75c0 1.224.66 2.349 1.723 2.946a2.813 2.813 0 0 0 3.41-.063l20.25-12.375A2.813 2.813 0 0 0 27 18a2.813 2.813 0 0 0-1.617-2.883L5.133 2.742Z"
      />
    </svg>
  )
}

export { PlayIcon }
