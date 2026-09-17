"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Input } from "@/components/ui/input"
import { SearchIcon } from "@/components/icons/search-icon"

const DEBOUNCE_MS = 400

function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get("q") ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function navigate(q: string) {
    const params = new URLSearchParams(searchParams)
    if (q) {
      params.set("q", q)
    } else {
      params.delete("q")
    }
    params.delete("page")
    router.push(`/?${params.toString()}`)
  }

  function handleChange(next: string) {
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate(next), DEBOUNCE_MS)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    navigate(value)
  }

  return (
    <form
      role="search"
      data-slot="search-bar"
      onSubmit={handleSubmit}
      className="flex w-full max-w-md items-center"
    >
      <Input
        type="search"
        shape="pill"
        className="rounded-r-none border-r-0"
        placeholder="Search videos or channels"
        aria-label="Search videos or channels"
        maxLength={200}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-9 shrink-0 items-center justify-center rounded-r-[var(--radius-full)] border border-l-0 border-border bg-input-background px-4"
      >
        <SearchIcon className="size-4" />
      </button>
    </form>
  )
}

export { SearchBar }
