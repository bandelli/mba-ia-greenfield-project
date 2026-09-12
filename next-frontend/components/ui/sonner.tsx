"use client"

import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Theme is CSS-driven via `prefers-color-scheme` (see app/globals.css) rather
// than next-themes, so the toast surface just points at the same semantic
// tokens every other surface uses — no theme prop needed.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-2)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
