import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "h-9 w-full min-w-0 border border-border bg-input-background px-4 py-1.5 text-body-lg text-foreground transition-colors outline-none",
    "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-md file:font-medium file:text-foreground",
    "placeholder:text-foreground",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  ].join(" "),
  {
    variants: {
      shape: {
        default: "rounded-[var(--radius-1)]",
        pill: "rounded-[var(--radius-full)]",
      },
    },
    defaultVariants: {
      shape: "default",
    },
  }
)

type InputProps = React.ComponentProps<"input"> & VariantProps<typeof inputVariants>

function Input({ className, type, shape, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-shape={shape ?? "default"}
      className={cn(inputVariants({ shape, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
