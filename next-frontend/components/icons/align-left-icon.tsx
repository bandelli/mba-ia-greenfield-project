import * as React from "react"
import { cn } from "@/lib/utils"

// "About Channel" section heading glyph (a 4-line text/description icon).
function AlignLeftIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 17.5 20"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M11.25 2.5C11.25 3.19141 10.6914 3.75 10 3.75H1.25C0.558594 3.75 0 3.19141 0 2.5C0 1.80859 0.558594 1.25 1.25 1.25H10C10.6914 1.25 11.25 1.80859 11.25 2.5ZM11.25 12.5C11.25 13.1914 10.6914 13.75 10 13.75H1.25C0.558594 13.75 0 13.1914 0 12.5C0 11.8086 0.558594 11.25 1.25 11.25H10C10.6914 11.25 11.25 11.8086 11.25 12.5ZM0 7.5C0 6.80859 0.558594 6.25 1.25 6.25H16.25C16.9414 6.25 17.5 6.80859 17.5 7.5C17.5 8.19141 16.9414 8.75 16.25 8.75H1.25C0.558594 8.75 0 8.19141 0 7.5ZM17.5 17.5C17.5 18.1914 16.9414 18.75 16.25 18.75H1.25C0.558594 18.75 0 18.1914 0 17.5C0 16.8086 0.558594 16.25 1.25 16.25H16.25C16.9414 16.25 17.5 16.8086 17.5 17.5Z"
      />
    </svg>
  )
}

export { AlignLeftIcon }
