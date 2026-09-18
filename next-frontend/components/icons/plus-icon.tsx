import * as React from "react"
import { cn } from "@/lib/utils"

function PlusIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12.25 14"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M7 2.1875C7 1.70352 6.60898 1.3125 6.125 1.3125C5.64102 1.3125 5.25 1.70352 5.25 2.1875V6.125H1.3125C0.828516 6.125 0.4375 6.51602 0.4375 7C0.4375 7.48398 0.828516 7.875 1.3125 7.875H5.25V11.8125C5.25 12.2965 5.64102 12.6875 6.125 12.6875C6.60898 12.6875 7 12.2965 7 11.8125V7.875H10.9375C11.4215 7.875 11.8125 7.48398 11.8125 7C11.8125 6.51602 11.4215 6.125 10.9375 6.125H7V2.1875Z"
      />
    </svg>
  )
}

export { PlusIcon }
