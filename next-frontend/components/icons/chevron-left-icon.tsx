import * as React from "react"
import { cn } from "@/lib/utils"

function ChevronLeftIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8.75 14"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M0.257031 6.38203C-0.0847656 6.72383 -0.0847656 7.27891 0.257031 7.6207L5.50703 12.8707C5.84883 13.2125 6.40391 13.2125 6.7457 12.8707C7.0875 12.5289 7.0875 11.9738 6.7457 11.632L2.11367 7L6.74297 2.36797C7.08477 2.02617 7.08477 1.47109 6.74297 1.1293C6.40117 0.7875 5.84609 0.7875 5.5043 1.1293L0.254297 6.3793L0.257031 6.38203Z"
      />
    </svg>
  )
}

export { ChevronLeftIcon }
