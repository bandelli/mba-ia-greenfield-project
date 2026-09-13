import * as React from "react"
import { cn } from "@/lib/utils"

function ChevronRightIcon({ className, ...props }: React.ComponentProps<"svg">) {
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
        d="M8.49297 6.38203C8.83477 6.72383 8.83477 7.27891 8.49297 7.6207L3.24297 12.8707C2.90117 13.2125 2.34609 13.2125 2.0043 12.8707C1.6625 12.5289 1.6625 11.9738 2.0043 11.632L6.63633 7L2.00703 2.36797C1.66523 2.02617 1.66523 1.47109 2.00703 1.1293C2.34883 0.7875 2.90391 0.7875 3.2457 1.1293L8.4957 6.3793L8.49297 6.38203Z"
      />
    </svg>
  )
}

export { ChevronRightIcon }
