"use client"

import * as Dialog from "@radix-ui/react-dialog"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, Search, X } from "lucide-react"
import type { ProductCardData } from "@/lib/catalog"
import { Price } from "../ui/price"
import { track } from "@/lib/client/tracking"

const SUGGESTIONS = ["tricou", "hanorac", "pantaloni", "negru", "oversized"]

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [results, setResults] = useState<ProductCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) return
    const t = setTimeout(async () => {
      abort.current?.abort()
      abort.current = new AbortController()
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: abort.current.signal })
        const data = await res.json()
        setResults(data.products ?? [])
        setActive(-1)
      } catch {}
      setLoading(false)
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  const submit = (term = q) => {
    if (!term.trim()) return
    track("search", { search_term: term.trim() })
    onOpenChange(false)
    router.push(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-2 top-2 z-50 mx-auto max-w-2xl animate-rise rounded-xl bg-surface shadow-float outline-none sm:top-[10vh]">
          <Dialog.Title className="sr-only">Caută produse</Dialog.Title>
          <Dialog.Description className="sr-only">Scrie cel puțin două litere pentru sugestii.</Dialog.Description>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              if (active >= 0 && results[active]) {
                onOpenChange(false)
                router.push(`/products/${results[active].handle}`)
              } else submit()
            }}
            className="flex items-center gap-3 border-b border-line px-5"
          >
            <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setActive((a) => Math.min(results.length - 1, a + 1))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setActive((a) => Math.max(-1, a - 1))
                }
              }}
              placeholder="Caută tricouri, hanorace, culori…"
              aria-label="Termen de căutare"
              aria-controls="search-results"
              aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
              className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-subtle"
            />
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-r-transparent" aria-hidden />}
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/[0.06]" aria-label="Închide căutarea">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </form>
          <div className="max-h-[65dvh] overflow-y-auto p-3">
            {q.trim().length < 2 ? (
              <div className="p-3">
                <p className="eyebrow mb-3">Căutări populare</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => submit(s)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length ? (
              <ul id="search-results" role="listbox" aria-label="Rezultate" className="flex flex-col">
                {results.slice(0, 6).map((p, i) => (
                  <li key={p.id} id={`sr-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/products/${p.handle}`}
                      onClick={() => onOpenChange(false)}
                      className={`flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-paper ${i === active ? "bg-paper" : ""}`}
                    >
                      <span className="product-frame relative h-16 w-14 shrink-0 overflow-hidden rounded-sm">
                        {p.thumbnail && <Image src={p.thumbnail} alt="" fill sizes="56px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.title}</span>
                        <span className="block truncate text-xs text-muted">{p.categories.map((c) => c.name).join(", ")}</span>
                      </span>
                      <Price amount={p.price} original={p.originalPrice} currency={p.currency} size="sm" />
                    </Link>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => submit()} className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-medium hover:bg-paper">
                    Vezi toate rezultatele pentru „{q.trim()}”
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </li>
              </ul>
            ) : (
              !loading && <p className="p-4 text-sm text-muted">Niciun produs pentru „{q.trim()}”. Încearcă un termen mai general.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
