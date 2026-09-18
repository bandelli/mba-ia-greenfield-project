import { Skeleton } from "@/components/ui/skeleton"

// Automatically shown by Next.js (Suspense boundary) while the Server
// Component in this route segment is fetching — per the UI Contract's
// "Rendered states: Loading: skeleton banner + video grid while the Server
// Component fetches".
export default function Loading() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-52 w-full rounded-none sm:h-80" />

      <div className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex items-center gap-6">
          <Skeleton className="-mt-16 size-32 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-[var(--radius-2)]" />
          <Skeleton className="h-9 w-20 rounded-[var(--radius-2)]" />
          <Skeleton className="h-9 w-20 rounded-[var(--radius-2)]" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-video w-full rounded-[var(--radius-3)]" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
