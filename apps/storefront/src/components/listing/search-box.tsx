"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"
import { track } from "@/lib/client/tracking"

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initial)
  return (
    <form
      role="search"
      className="mb-8 flex max-w-xl items-center gap-3 rounded-full border border-line bg-surface px-5 focus-within:border-ink"
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        track("search", { search_term: q.trim() })
        router.push(`/search?q=${encodeURIComponent(q.trim())}`)
      }}
    >
      <Search className="h-4 w-4 text-muted" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Termen de căutare" placeholder="Ce cauți?" className="h-12 flex-1 bg-transparent text-sm outline-none" />
      <button type="submit" className="text-sm font-medium">
        Caută
      </button>
    </form>
  )
}
