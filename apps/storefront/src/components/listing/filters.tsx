"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import type { CatalogFilters, Facets } from "@/lib/catalog"
import { SORT_OPTIONS, filtersToQuery, swatchFor } from "@/lib/catalog"
import { Sheet } from "../ui/sheet"
import { Button } from "../ui/button"
import { cn } from "@/lib/util/cn"
import { formatMoney } from "@/lib/util/format"

type Props = {
  filters: CatalogFilters
  facets: Facets
  total: number
  hide?: ("category" | "collection")[]
}

function useFilterNav(filters: CatalogFilters) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const go = (next: CatalogFilters) => start(() => router.push(`${pathname}${filtersToQuery({ ...next, page: 1 })}`, { scroll: false }))
  const toggle = (key: "category" | "collection" | "size" | "color", value: string) => {
    const list = filters[key] ?? []
    go({ ...filters, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] })
  }
  return { go, toggle, pending }
}

export function ListingToolbar({ filters, facets, total, hide = [] }: Props) {
  const [open, setOpen] = useState(false)
  const { go, toggle, pending } = useFilterNav(filters)
  const params = useSearchParams()
  const activeCount =
    (filters.category?.length ?? 0) +
    (filters.collection?.length ?? 0) +
    (filters.size?.length ?? 0) +
    (filters.color?.length ?? 0) +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0)

  const chips: { label: string; clear: () => void }[] = [
    ...(filters.category ?? []).map((v) => ({ label: facets.categories.find((c) => c.handle === v)?.name ?? v, clear: () => toggle("category", v) })),
    ...(filters.collection ?? []).map((v) => ({ label: facets.collections.find((c) => c.handle === v)?.title ?? v, clear: () => toggle("collection", v) })),
    ...(filters.size ?? []).map((v) => ({ label: `Mărime ${v}`, clear: () => toggle("size", v) })),
    ...(filters.color ?? []).map((v) => ({ label: v, clear: () => toggle("color", v) })),
    ...(filters.inStock ? [{ label: "În stoc", clear: () => go({ ...filters, inStock: false }) }] : []),
    ...(filters.onSale ? [{ label: "La reducere", clear: () => go({ ...filters, onSale: false }) }] : []),
    ...(filters.minPrice != null || filters.maxPrice != null
      ? [{ label: `${filters.minPrice ?? 0}–${filters.maxPrice ?? "∞"} lei`, clear: () => go({ ...filters, minPrice: undefined, maxPrice: undefined }) }]
      : []),
  ]

  return (
    <>
      <div className="sticky top-[4.5rem] z-20 -mx-1 mb-6 flex items-center justify-between gap-3 rounded-full px-1 py-2 sm:top-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm transition-colors hover:border-ink"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtre
            {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[0.65rem] text-paper">{activeCount}</span>}
          </button>
          <p className={cn("hidden text-sm text-muted sm:block", pending && "opacity-50")} aria-live="polite">
            {total} {total === 1 ? "produs" : "produse"}
          </p>
        </div>
        <label className="relative inline-flex items-center">
          <span className="sr-only">Sortează</span>
          <select
            value={filters.sort ?? "recommended"}
            onChange={(e) => go({ ...filters, sort: e.target.value as CatalogFilters["sort"] })}
            className="h-10 appearance-none rounded-full border border-line bg-surface pl-4 pr-9 text-sm outline-none hover:border-ink"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3 h-4 w-4 text-muted">
            <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
          </svg>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1.5 text-xs hover:bg-sand" aria-label={`Elimină filtrul ${c.label}`}>
              {c.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={() => go({ q: filters.q, sort: filters.sort })} className="px-2 text-xs text-muted underline underline-offset-2 hover:text-ink">
            Șterge tot
          </button>
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        side="right"
        title="Filtre"
        description={`${total} ${total === 1 ? "produs" : "produse"}`}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => go({ q: filters.q, sort: filters.sort })}>
              Resetează
            </Button>
            <Button onClick={() => setOpen(false)} loading={pending}>
              Vezi {total} produse
            </Button>
          </div>
        }
      >
        <div className="flex flex-col divide-y divide-line px-5">
          {!hide.includes("category") && facets.categories.length > 1 && (
            <FilterGroup title="Categorie">
              <div className="flex flex-wrap gap-2">
                {facets.categories.map((c) => (
                  <Chip key={c.handle} active={!!filters.category?.includes(c.handle)} onClick={() => toggle("category", c.handle)}>
                    {c.name} <span className="text-muted">{c.count}</span>
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}
          {facets.sizes.length > 0 && (
            <FilterGroup title="Mărime">
              <div className="grid grid-cols-4 gap-2">
                {facets.sizes.map((s) => (
                  <Chip key={s.value} active={!!filters.size?.includes(s.value)} onClick={() => toggle("size", s.value)} className="justify-center">
                    {s.value}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}
          {facets.colors.length > 0 && (
            <FilterGroup title="Culoare">
              <div className="flex flex-wrap gap-2">
                {facets.colors.map((c) => (
                  <Chip key={c.value} active={!!filters.color?.includes(c.value)} onClick={() => toggle("color", c.value)}>
                    <span className="h-3.5 w-3.5 rounded-full border border-ink/15" style={{ background: swatchFor(c.value) }} aria-hidden />
                    {c.value}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}
          {!hide.includes("collection") && facets.collections.length > 1 && (
            <FilterGroup title="Colecție">
              <div className="flex flex-wrap gap-2">
                {facets.collections.map((c) => (
                  <Chip key={c.handle} active={!!filters.collection?.includes(c.handle)} onClick={() => toggle("collection", c.handle)}>
                    {c.title}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}
          <FilterGroup title="Preț">
            <PriceRange filters={filters} range={facets.priceRange} onApply={(min, max) => go({ ...filters, minPrice: min, maxPrice: max })} key={params.toString()} />
          </FilterGroup>
          <FilterGroup title="Disponibilitate">
            <div className="flex flex-wrap gap-2">
              <Chip active={!!filters.inStock} onClick={() => go({ ...filters, inStock: !filters.inStock })}>
                Doar în stoc
              </Chip>
              <Chip active={!!filters.onSale} onClick={() => go({ ...filters, onSale: !filters.onSale })}>
                La reducere
              </Chip>
            </div>
          </FilterGroup>
        </div>
      </Sheet>
    </>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-5">
      <legend className="float-left mb-3 w-full text-sm font-medium">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
        active ? "border-ink bg-ink text-paper [&_.text-muted]:text-paper/60" : "border-line bg-surface hover:border-ink",
        className
      )}
    >
      {children}
    </button>
  )
}

function PriceRange({ filters, range, onApply }: { filters: CatalogFilters; range: { min: number; max: number }; onApply: (min?: number, max?: number) => void }) {
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "")
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "")
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(min ? Number(min) : undefined, max ? Number(max) : undefined)
      }}
    >
      <label className="flex-1 text-xs text-muted">
        Minim
        <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(range.min)} className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-ink" />
      </label>
      <label className="flex-1 text-xs text-muted">
        Maxim
        <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(range.max)} className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-ink" />
      </label>
      <Button type="submit" variant="secondary" className="h-11 rounded-md">
        Aplică
      </Button>
      <span className="sr-only">
        Interval disponibil {formatMoney(range.min)} – {formatMoney(range.max)}
      </span>
    </form>
  )
}
