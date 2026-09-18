import * as React from "react"
import { cn } from "@/lib/utils"

function Spinner({
  className,
  "aria-label": ariaLabel = "Loading",
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      data-slot="spinner"
      role="status"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 33.9411 33.9411"
      fill="none"
      className={cn("size-6 animate-spin text-muted-foreground", className)}
      {...props}
    >
      <path
        d="M14.7631 2.12795C15.0945 3.24827 14.4581 4.43488 13.3378 4.76634C8.07427 6.33744 4.24264 11.2098 4.24264 16.9706C4.24264 23.9974 9.94368 29.6985 16.9706 29.6985C23.9974 29.6985 29.6985 23.9974 29.6985 16.9706C29.6985 11.2098 25.8668 6.33744 20.6099 4.76634C19.4896 4.43488 18.8466 3.24827 19.1847 2.12795C19.5228 1.00763 20.7027 0.364602 21.8231 0.702687C28.83 2.79086 33.9411 9.28077 33.9411 16.9706C33.9411 26.3441 26.3441 33.9411 16.9706 33.9411C7.59697 33.9411 0 26.3441 0 16.9706C0 9.28077 5.11105 2.79086 12.1247 0.702687C13.245 0.371231 14.4316 1.00763 14.7631 2.12795Z"
        fill="currentColor"
      />
    </svg>
  )
}

export { Spinner }
