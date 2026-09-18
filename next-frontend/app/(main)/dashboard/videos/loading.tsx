import { Skeleton } from "@/components/ui/skeleton"

// Automatically shown by Next.js (Suspense boundary) while the Server
// Component in this route segment is fetching — per the UI Contract's
// "Rendered states: Loading: skeleton rows while the Server Component
// fetches the current page".
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-9 w-40 rounded-[var(--radius-2)]" />
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-4">
        <Skeleton className="h-9 w-24 rounded-[var(--radius-full)]" />
        <Skeleton className="h-9 w-24 rounded-[var(--radius-full)]" />
        <Skeleton className="h-9 w-24 rounded-[var(--radius-full)]" />
      </div>

      <ul className="flex flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0">
            <Skeleton className="h-36 w-64 shrink-0 rounded-[var(--radius-2)]" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
