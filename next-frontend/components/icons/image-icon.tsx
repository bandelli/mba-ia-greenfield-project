import * as React from "react"
import { cn } from "@/lib/utils"

function ImageIcon({ className, ...props }: React.ComponentProps<"svg">) {
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
        d="M14 2.5c.275 0 .5.225.5.5v9.994l-.156-.203-4.25-5.5a.75.75 0 0 0-1.188 0L6.313 10.647l-.954-1.335a.75.75 0 0 0-1.219 0l-2.5 3.503-.14.185V13V3a.5.5 0 0 1 .5-.5h12ZM2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2Zm2.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
      />
    </svg>
  )
}

export { ImageIcon }
