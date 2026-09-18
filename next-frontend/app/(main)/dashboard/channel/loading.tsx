import { Skeleton } from "@/components/ui/skeleton"

// Automatically shown by Next.js (Suspense boundary) while the Server
// Component in this route segment is fetching — per the UI Contract's
// "Rendered states: Loading: skeleton form while the Server Component
// fetches the current channel's fields".
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Skeleton className="h-9 w-56" />

      <div className="overflow-hidden rounded-[var(--radius-3)] border border-border bg-popover">
        <Skeleton className="h-20 w-full rounded-none sm:h-32" />
        <div className="flex items-center gap-4 p-6">
          <Skeleton className="-mt-16 size-32 shrink-0 rounded-full sm:-mt-12" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 rounded-[var(--radius-3)] border border-border bg-popover p-8">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border pt-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}
