import Link from "next/link"
import { Suspense } from "react"
import type { CatalogFilters, ProductCardData } from "@/lib/catalog"
import { applyFilters, computeFacets, filtersToQuery, paginate } from "@/lib/catalog"
import { ProductGrid } from "../product/product-card"
import { ListingToolbar } from "./filters"
import { ButtonLink } from "../ui/button"

/**
 * Shared listing used by /shop, /collections/[handle], /categories/[handle]
 * and /search. Facets are computed from the base set (before user filters)
 * so options never disappear while filtering.
 */
export function CatalogView({
  base,
  filters,
  basePath,
  hide,
  emptyTitle = "Niciun produs găsit",
}: {
  base: ProductCardData[]
  filters: CatalogFilters
  basePath: string
  hide?: ("category" | "collection")[]
  emptyTitle?: string
}) {
  const facets = computeFacets(base)
  const filtered = applyFilters(base, filters)
  const { items, page, pages, total } = paginate(filtered, filters.page ?? 1)

  return (
    <>
      <Suspense fallback={<div className="mb-6 h-14" />}>
        <ListingToolbar filters={filters} facets={facets} total={total} hide={hide} />
      </Suspense>
      {items.length ? (
        <>
          <ProductGrid products={items} priorityCount={4} />
          <div className="mt-14 flex flex-col items-center gap-4">
            <p className="text-sm text-muted">
              Afișezi {items.length} din {total} produse
            </p>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-sand" aria-hidden>
              <div className="h-full rounded-full bg-ink" style={{ width: `${(items.length / total) * 100}%` }} />
            </div>
            {page < pages && (
              <Link
                href={`${basePath}${filtersToQuery({ ...filters, page: page + 1 })}`}
                scroll={false}
                className="mt-2 inline-flex h-12 items-center rounded-full border border-ink px-8 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
              >
                Încarcă mai multe
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-xl bg-paper-2 px-6 py-20 text-center">
          <p className="display text-4xl">{emptyTitle}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">Încearcă să elimini câteva filtre sau caută alt termen.</p>
          <ButtonLink href={basePath} variant="secondary" className="mt-6">
            Resetează filtrele
          </ButtonLink>
        </div>
      )}
    </>
  )
}

export function ListingHeader({ eyebrow, title, description, crumbs }: { eyebrow?: string; title: string; description?: string | null; crumbs: { name: string; href: string }[] }) {
  return (
    <header className="container-page pt-8 pb-8 sm:pt-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-ink">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-ink">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="display text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
      {description && <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted">{description}</p>}
    </header>
  )
}
