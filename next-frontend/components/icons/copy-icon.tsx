import * as React from "react"
import { cn } from "@/lib/utils"

function CopyIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M14 12H8a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h4.378c.397 0 .778.16 1.06.44l2.121 2.123c.281.28.441.662.441 1.059V10a2 2 0 0 1-2 2ZM2 4h3v1.5H2a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-1H10v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      />
    </svg>
  )
}

export { CopyIcon }
