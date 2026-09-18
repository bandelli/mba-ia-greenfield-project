import { Skeleton } from "@/components/ui/skeleton"

// Automatically shown by Next.js (Suspense boundary) while the Server
// Component in this route segment is fetching — per the UI Contract's
// "Rendered states: Loading: new loading.tsx skeleton (per the project's
// established per-route convention)".
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <Skeleton className="h-9 w-48" />

      <ul className="flex flex-col gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </li>
        ))}
      </ul>
    </div>
  )
}
