import { Skeleton } from "@/components/ui/skeleton"

// Automatically shown by Next.js (Suspense boundary) while the Server
// Component in this route segment is fetching — per the UI Contract's
// "Rendered states: Loading: skeleton matching the two-column layout
// (player rectangle + info block + sidebar card list)".
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Skeleton className="aspect-video w-full rounded-[var(--radius-3)]" />

        <Skeleton className="h-8 w-3/4" />

        <div className="flex items-center gap-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <Skeleton className="h-24 w-full rounded-[var(--radius-3)]" />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[400px]">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="aspect-video w-40 shrink-0 rounded-[var(--radius-3)]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
