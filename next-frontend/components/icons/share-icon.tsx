import * as React from "react"
import { cn } from "@/lib/utils"

// Path traced from the Figma source asset for ShareButton (node 39:1096) —
// fill hardcoded to `currentColor` per the project's icon convention (source
// asset used a literal `#F1F1F1`, dropped in favor of inheriting text color).
function ShareIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <path
        fill="currentColor"
        d="M10.793 1.22344C10.3887 1.40273 10.125 1.80703 10.125 2.25V4.5H6.1875C2.77031 4.5 0 7.27031 0 10.6875C0 14.6707 2.86523 16.4496 3.52266 16.8082C3.61055 16.8574 3.70898 16.875 3.80742 16.875C4.19063 16.875 4.5 16.5621 4.5 16.1824C4.5 15.9187 4.34883 15.6762 4.15547 15.4969C3.825 15.184 3.375 14.5687 3.375 13.5C3.375 11.6367 4.88672 10.125 6.75 10.125H10.125V12.375C10.125 12.818 10.3852 13.2223 10.793 13.4016C11.2008 13.5809 11.6719 13.507 12.0023 13.2117L17.6273 8.14922C17.8629 7.93477 18 7.63242 18 7.3125C18 6.99258 17.8664 6.69023 17.6273 6.47578L12.0023 1.41328C11.6719 1.11445 11.1973 1.04063 10.793 1.22344Z"
      />
    </svg>
  )
}

export { ShareIcon }
