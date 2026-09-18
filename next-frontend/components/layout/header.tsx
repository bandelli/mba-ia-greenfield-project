import type { ReactNode } from "react"

export type HeaderProps = {
  start: ReactNode
  center: ReactNode
  end: ReactNode
}

// Pure composition shell — no own state/logic. The interactive pieces
// (SidebarToggleButton, brand logo, SearchBar, CreateButton, AvatarButton)
// are composed by the caller and passed in as slots.
function Header({ start, center, end }: HeaderProps) {
  return (
    <header
      data-slot="header"
      className="flex h-14 items-center gap-4 border-b border-border bg-background px-4"
    >
      <div className="flex shrink-0 items-center gap-3">{start}</div>
      <div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
      <div className="flex shrink-0 items-center gap-2">{end}</div>
    </header>
  )
}

export { Header }
