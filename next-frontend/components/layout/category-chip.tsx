import { cn } from "@/lib/utils"

export type CategoryChipProps = {
  label: string
  active?: boolean
  onClick?: () => void
}

function CategoryChip({ label, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      data-slot="category-chip"
      data-active={active}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-[var(--radius-2)] px-4 py-2 text-label-md",
        active
          ? "bg-foreground text-background"
          : "bg-card text-foreground hover:bg-card/80"
      )}
    >
      {label}
    </button>
  )
}

export { CategoryChip }
