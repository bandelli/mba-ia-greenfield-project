"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { CategoryChip } from "@/components/layout/category-chip"

// Mirrors the backend's VideoCategory enum (phase-04-video-channel-management/TD-01)
// — the same source of truth video-edit-form.tsx's category select uses.
// TODO(out of scope for this phase): duplicated locally rather than shared;
// extracting a `lib/video-categories.ts` used by both is a follow-up cleanup.
const CATEGORY_OPTIONS = [
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "news", label: "News" },
  { value: "sports", label: "Sports" },
  { value: "technology", label: "Science & Technology" },
  { value: "other", label: "Other" },
] as const

function CategoryFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get("category")

  function selectCategory(value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set("category", value)
    } else {
      params.delete("category")
    }
    params.delete("page")
    router.push(`/?${params.toString()}`)
  }

  return (
    <div
      data-slot="category-filter-bar"
      className="flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3"
    >
      <CategoryChip label="All" active={!activeCategory} onClick={() => selectCategory(null)} />
      {CATEGORY_OPTIONS.map((option) => (
        <CategoryChip
          key={option.value}
          label={option.label}
          active={activeCategory === option.value}
          onClick={() => selectCategory(option.value)}
        />
      ))}
    </div>
  )
}

export { CategoryFilterBar }
