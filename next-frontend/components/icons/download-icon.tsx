import * as React from "react"
import { cn } from "@/lib/utils"

function DownloadIcon({ className, ...props }: React.ComponentProps<"svg">) {
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
        d="M19 9h-4V3H9v6H5l7 7 7-7ZM5 18v2h14v-2H5Z"
      />
    </svg>
  )
}

export { DownloadIcon }
