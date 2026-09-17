"use client"

import { AlignLeftIcon } from "@/components/icons/align-left-icon"
import { Button } from "@/components/ui/button"

export type SidebarToggleButtonProps = {
  open: boolean
  onToggle: () => void
}

// Local useState (owned by the parent AppShell), no global store — per
// home-search-launch/TD-04's mobile sidebar collapse design.
function SidebarToggleButton({ open, onToggle }: SidebarToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      aria-pressed={open}
      onClick={onToggle}
    >
      <AlignLeftIcon />
    </Button>
  )
}

export { SidebarToggleButton }
