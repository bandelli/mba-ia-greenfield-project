import * as React from "react"
import { cn } from "@/lib/utils"

function CircleCheckIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M6 1.125A4.875 4.875 0 1 1 6 10.875 4.875 4.875 0 0 1 6 1.125ZM6 12A6 6 0 1 0 6 0a6 6 0 0 0 0 12Zm2.648-7.102a.516.516 0 0 0-.795-.658L5.253 6.705l-1.102-1.1a.516.516 0 0 0-.795.795l1.5 1.5a.516.516 0 0 0 .795 0l3-3Z"
      />
    </svg>
  )
}

export { CircleCheckIcon }
