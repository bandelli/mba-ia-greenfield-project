import * as React from "react"
import { cn } from "@/lib/utils"

function FilterIcon({ className, ...props }: React.ComponentProps<"svg">) {
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
        d="M0.0914063 1.28672C0.246094 0.958594 0.574219 0.75 0.9375 0.75H11.0625C11.4258 0.75 11.7539 0.958594 11.9086 1.28672C12.0633 1.61484 12.0164 2.00156 11.7867 2.28281L7.5 7.52109V10.5C7.5 10.7836 7.34062 11.0438 7.08516 11.1703C6.82969 11.2969 6.52734 11.2711 6.3 11.1L4.8 9.975C4.61016 9.83438 4.5 9.61172 4.5 9.375V7.52109L0.210938 2.28047C-0.0164062 2.00156 -0.065625 1.6125 0.0914063 1.28672Z"
      />
    </svg>
  )
}

export { FilterIcon }
